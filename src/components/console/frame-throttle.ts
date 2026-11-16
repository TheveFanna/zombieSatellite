import type { Clock } from '../pointing/deps';
import type { FrameScheduler } from '../field/deps';

/**
 * Wraps a subscribe function so that bursts of notifications cause at most one listener call per
 * animation frame, and at most one per minIntervalMs. The pending frame is cancelled on unsubscribe.
 */
export function throttleSubscribe(
  subscribe: (listener: () => void) => () => void,
  deps: { frames: FrameScheduler; clock: Clock },
  minIntervalMs: number,
): (listener: () => void) => () => void {
  return (listener) => {
    let pending = false;
    let handle: unknown = null;
    let lastMs = Number.NEGATIVE_INFINITY;
    let active = true;

    const onFrame = (): void => {
      handle = null;
      if (!active) return;
      if (deps.clock.nowMs() - lastMs < minIntervalMs) {
        handle = deps.frames.request(onFrame);
        return;
      }
      pending = false;
      lastMs = deps.clock.nowMs();
      listener();
    };

    const unsubscribe = subscribe(() => {
      if (!active || pending) return;
      pending = true;
      handle = deps.frames.request(onFrame);
    });

    return () => {
      active = false;
      if (handle !== null) deps.frames.cancel(handle);
      handle = null;
      unsubscribe();
    };
  };
}
