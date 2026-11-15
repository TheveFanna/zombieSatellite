import { PERMISSION_TIMEOUT_MS, permissionTransition } from '../../lib/pointing/index';
import type { PermissionEvent, PermissionState } from '../../lib/pointing/index';
import type { PermissionRequester, TimerApi } from './deps';

/** The part of the orientation stream the flow drives. */
export interface StreamLike {
  start(): void;
  stop(): void;
}

export interface PermissionFlowStreamCallbacks {
  onNoSampleTimeout(): void;
  onFirstValidSample(): void;
}

/**
 * Final signature: the flow receives a `createStream` factory (not a ready stream), because the
 * stream's callbacks are fixed at creation. The factory is called once, inside `createPermissionFlow`,
 * and must pass the two callbacks on to `createOrientationStream`.
 */
export interface PermissionFlowOptions {
  readonly requestPermission: PermissionRequester;
  readonly timers: TimerApi;
  readonly createStream: (callbacks: PermissionFlowStreamCallbacks) => StreamLike;
  readonly onState: (state: PermissionState) => void;
}

export interface PermissionFlow {
  start(): void;
  requestFromGesture(): void;
  getState(): PermissionState;
}

export function createPermissionFlow(options: PermissionFlowOptions): PermissionFlow {
  const { requestPermission, timers, createStream, onState } = options;

  let state: PermissionState = 'unknown';
  let gen = 0;
  let timeout: unknown = null;

  function getState(): PermissionState {
    return state;
  }

  function dispatch(event: PermissionEvent): void {
    const next = permissionTransition(state, event);
    if (next === state) return;
    state = next;
    onState(state);
  }

  const stream = createStream({
    onNoSampleTimeout: () => dispatch('no-sample-timeout'),
    onFirstValidSample: () => dispatch('valid-sample-arrived'),
  });

  function settle(id: number, event: PermissionEvent): void {
    if (id !== gen || state !== 'requesting') return;
    if (timeout !== null) timers.clearTimeout(timeout);
    timeout = null;
    dispatch(event);
    if (getState() === 'granted') stream.start();
  }

  function start(): void {
    if (requestPermission !== undefined) return;
    dispatch('no-permission-api');
    stream.start();
  }

  function requestFromGesture(): void {
    if (requestPermission === undefined) return;
    if (state !== 'unknown' && state !== 'denied') return;
    dispatch('request-started');
    gen += 1;
    const my = gen;
    timeout = timers.setTimeout(() => settle(my, 'permission-error'), PERMISSION_TIMEOUT_MS);
    let promise: Promise<unknown>;
    try {
      promise = requestPermission();
    } catch {
      settle(my, 'permission-error');
      return;
    }
    promise.then(
      (v) =>
        settle(
          my,
          v === 'granted' ? 'permission-granted' : v === 'denied' ? 'permission-denied' : 'permission-error',
        ),
      () => settle(my, 'permission-error'),
    );
  }

  return { start, requestFromGesture, getState };
}
