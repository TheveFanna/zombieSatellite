/** The part of a MediaStream the Camera_Controller uses. */
export interface MediaStreamLike {
  getTracks(): ReadonlyArray<{ stop(): void }>;
}

/** The part of `navigator.mediaDevices` the Camera_Controller uses. */
export interface MediaDevicesLike {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStreamLike>;
}

export type CameraOutcome = 'on' | 'denied' | 'unavailable' | 'failed' | 'cancelled';

/** Rear camera if there is one, no audio. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = Object.freeze({
  audio: false,
  video: { facingMode: { ideal: 'environment' } },
});

function stopTracks(stream: MediaStreamLike): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // A track that cannot stop is already gone.
    }
  }
}

function outcomeOf(error: unknown): CameraOutcome {
  const name = typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') return 'unavailable';
  return 'failed';
}

/**
 * The Camera_Controller: a visual layer only. It never reads a frame, records, uploads or stores.
 * `start` never rejects; a stream that arrives after `stop` is stopped at once ('cancelled').
 */
export function createCameraController(deps: { mediaDevices: MediaDevicesLike | null }): {
  start(): Promise<CameraOutcome>;
  stop(): void;
  getStream(): MediaStreamLike | null;
} {
  let stream: MediaStreamLike | null = null;
  let generation = 0;

  function stop(): void {
    generation += 1;
    if (stream !== null) stopTracks(stream);
    stream = null;
  }

  return {
    async start() {
      if (deps.mediaDevices === null) return 'unavailable';
      stop();
      const own = generation;
      let next: MediaStreamLike;
      try {
        next = await deps.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      } catch (error) {
        return outcomeOf(error);
      }
      if (own !== generation) {
        stopTracks(next);
        return 'cancelled';
      }
      stream = next;
      return 'on';
    },
    stop,
    getStream: () => stream,
  };
}
