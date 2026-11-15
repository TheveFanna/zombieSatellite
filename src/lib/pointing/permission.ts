import type { PermissionEvent, PermissionState } from './types';

/** Pure, total permission state machine. Pairs not listed return `state` unchanged. */
export function permissionTransition(
  state: PermissionState,
  event: PermissionEvent,
): PermissionState {
  switch (state) {
    case 'unknown':
      if (event === 'request-started') return 'requesting';
      if (event === 'no-permission-api') return 'granted';
      return state;
    case 'denied':
      return event === 'request-started' ? 'requesting' : state;
    case 'requesting':
      if (event === 'permission-granted') return 'granted';
      if (event === 'permission-denied') return 'denied';
      if (event === 'permission-error') return 'unknown';
      return state;
    case 'granted':
      return event === 'no-sample-timeout' ? 'unavailable' : state;
    case 'unavailable':
      return event === 'valid-sample-arrived' ? 'granted' : state;
  }
}
