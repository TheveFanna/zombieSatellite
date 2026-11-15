// Feature: shell-pwa-deploy, Testing Strategy item 5: the Camera_Controller
// **Validates: Requirement 9.8**
import { describe, expect, it } from 'vitest';
import { CAMERA_CONSTRAINTS, createCameraController } from '../../src/components/shell/camera';
import type { MediaStreamLike } from '../../src/components/shell/camera';

function mockStream(trackCount: number): MediaStreamLike & { readonly stopped: () => number } {
  let stopped = 0;
  const tracks = Array.from({ length: trackCount }, () => ({ stop: () => void (stopped += 1) }));
  return { getTracks: () => tracks, stopped: () => stopped };
}

describe('createCameraController', () => {
  it('starts the rear camera stream', async () => {
    const stream = mockStream(1);
    const requested: MediaStreamConstraints[] = [];
    const camera = createCameraController({
      mediaDevices: {
        getUserMedia: (constraints) => {
          requested.push(constraints);
          return Promise.resolve(stream);
        },
      },
    });
    expect(await camera.start()).toBe('on');
    expect(camera.getStream()).toBe(stream);
    expect(requested).toEqual([CAMERA_CONSTRAINTS]);
  });

  it('reports a denial', async () => {
    const denial = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    const camera = createCameraController({ mediaDevices: { getUserMedia: () => Promise.reject(denial) } });
    expect(await camera.start()).toBe('denied');
    expect(camera.getStream()).toBeNull();
  });

  it('reports an unavailable API', async () => {
    expect(await createCameraController({ mediaDevices: null }).start()).toBe('unavailable');
  });

  it('stops every track, including a stream that arrives after stop', async () => {
    const first = mockStream(2);
    const camera = createCameraController({ mediaDevices: { getUserMedia: () => Promise.resolve(first) } });
    await camera.start();
    camera.stop();
    expect(first.stopped()).toBe(2);
    expect(camera.getStream()).toBeNull();

    let resolveLate: (stream: MediaStreamLike) => void = () => undefined;
    const late = mockStream(1);
    const slow = createCameraController({
      mediaDevices: { getUserMedia: () => new Promise((resolve) => (resolveLate = resolve)) },
    });
    const pending = slow.start();
    slow.stop();
    resolveLate(late);
    expect(await pending).toBe('cancelled');
    expect(late.stopped()).toBe(1);
    expect(slow.getStream()).toBeNull();
  });
});
