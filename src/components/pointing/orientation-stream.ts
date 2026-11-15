import {
  NO_SAMPLE_TIMEOUT_MS,
  SELECTION_WINDOW_MS,
  pickHeadingSource,
  toSensorAttitude,
} from '../../lib/pointing/index';
import type { HeadingSource, OrientationSample, SensorAttitude } from '../../lib/pointing/index';
import type { EventSourceLike, TimerApi, VisibilitySource } from './deps';

export interface OrientationStreamOptions {
  readonly events: EventSourceLike;
  readonly timers: TimerApi;
  readonly visibility: VisibilitySource;
  readonly onAttitude: (attitude: SensorAttitude | null) => void;
  readonly onFirstValidSample: () => void;
  readonly onNoSampleTimeout: () => void;
}

export interface OrientationStream {
  start(): void;
  stop(): void;
  getAttitude(): SensorAttitude | null;
  getSource(): HeadingSource | null;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Internal: raw event → OrientationSample. Never replaces a missing value with 0. */
function toOrientationSample(event: unknown): OrientationSample {
  const e = (typeof event === 'object' && event !== null ? event : {}) as Record<string, unknown>;
  const type = e.type === 'deviceorientationabsolute' ? 'deviceorientationabsolute' : 'deviceorientation';
  const sample = {
    type,
    absolute: e.absolute === true,
    alpha: finiteOrNull(e.alpha),
    beta: finiteOrNull(e.beta),
    gamma: finiteOrNull(e.gamma),
  } as const;
  const heading = finiteOrNull(e.webkitCompassHeading);
  return heading === null ? sample : { ...sample, webkitCompassHeading: heading };
}

export function createOrientationStream(options: OrientationStreamOptions): OrientationStream {
  const { events, timers, visibility, onAttitude, onFirstValidSample, onNoSampleTimeout } = options;

  let wanted = false;
  let active = false;
  let locked: HeadingSource | null = null;
  let attitude: SensorAttitude | null = null;
  let candidates: Partial<Record<HeadingSource, SensorAttitude>> = {};
  let noSampleTimer: unknown = null;
  let windowTimer: unknown = null;
  let unsubscribeVisibility: (() => void) | null = null;

  function clearTimers(): void {
    if (noSampleTimer !== null) timers.clearTimeout(noSampleTimer);
    if (windowTimer !== null) timers.clearTimeout(windowTimer);
    noSampleTimer = null;
    windowTimer = null;
  }

  function lock(): void {
    windowTimer = null;
    const picked = pickHeadingSource(Object.keys(candidates) as HeadingSource[]);
    if (picked === null) return;
    const chosen = candidates[picked];
    if (chosen === undefined) return;
    locked = picked;
    attitude = chosen;
    onAttitude(chosen);
  }

  function onEvent(event: unknown): void {
    const a = toSensorAttitude(toOrientationSample(event));
    if (a === null) return;
    if (locked === null) {
      if (windowTimer === null) {
        if (noSampleTimer !== null) timers.clearTimeout(noSampleTimer);
        noSampleTimer = null;
        onFirstValidSample();
        windowTimer = timers.setTimeout(lock, SELECTION_WINDOW_MS);
      }
      candidates[a.source] = a;
    } else if (a.source === locked) {
      attitude = a;
      onAttitude(a);
    }
  }

  function end(): void {
    events.removeEventListener('deviceorientationabsolute', onEvent);
    events.removeEventListener('deviceorientation', onEvent);
    clearTimers();
    active = false;
    locked = null;
    attitude = null;
    candidates = {};
    onAttitude(null);
  }

  function onVisibilityChange(): void {
    if (visibility.isHidden()) {
      if (active) end();
    } else if (wanted) {
      start();
    }
  }

  function start(): void {
    wanted = true;
    if (unsubscribeVisibility === null) unsubscribeVisibility = visibility.onChange(onVisibilityChange);
    if (active || visibility.isHidden()) return;
    active = true;
    locked = null;
    attitude = null;
    candidates = {};
    windowTimer = null;
    events.addEventListener('deviceorientationabsolute', onEvent);
    events.addEventListener('deviceorientation', onEvent);
    noSampleTimer = timers.setTimeout(() => onNoSampleTimeout(), NO_SAMPLE_TIMEOUT_MS);
  }

  function stop(): void {
    wanted = false;
    if (unsubscribeVisibility !== null) {
      unsubscribeVisibility();
      unsubscribeVisibility = null;
    }
    end();
  }

  return {
    start,
    stop,
    getAttitude: () => attitude,
    getSource: () => locked,
  };
}
