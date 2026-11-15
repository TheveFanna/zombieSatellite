import type { KeyValueStorage, PermissionRequester } from './deps';
import type { PointingSessionDeps } from './pointing-session';

/** Local typings for APIs that `lib.dom` may not declare. */
interface PermissionCapableEvent {
  requestPermission?: unknown;
}
interface LegacyOrientationWindow {
  orientation?: unknown;
}
interface ScreenWithOrientation {
  orientation?: { angle?: unknown };
}

function createSafeStorage(): KeyValueStorage {
  const resolve = (): Storage | null => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    getItem(key) {
      try {
        return resolve()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        resolve()?.setItem(key, value);
      } catch {
        // Private browsing or disabled storage: persisting is best effort.
      }
    },
  };
}

function resolveRequestPermission(): PermissionRequester {
  if (typeof DeviceOrientationEvent === 'undefined') return undefined;
  const ctor = DeviceOrientationEvent as unknown as PermissionCapableEvent;
  if (typeof ctor.requestPermission !== 'function') return undefined;
  // Called with the original `this`; the flow must invoke it synchronously inside the user gesture.
  return () => (ctor.requestPermission as () => Promise<unknown>).call(DeviceOrientationEvent);
}

/**
 * Builds the real browser dependencies for the pointing session.
 * Browser only: the page calls it inside `useEffect`, so it touches the globals directly.
 */
export function createBrowserDeps(): PointingSessionDeps {
  return {
    events: window as unknown as PointingSessionDeps['events'],
    timers: {
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    },
    clock: { nowMs: () => Date.now() },
    visibility: {
      isHidden: () => document.visibilityState === 'hidden',
      onChange(listener) {
        document.addEventListener('visibilitychange', listener);
        return () => document.removeEventListener('visibilitychange', listener);
      },
    },
    screen: {
      readAngle: () =>
        (screen as unknown as ScreenWithOrientation).orientation?.angle ??
        (window as unknown as LegacyOrientationWindow).orientation,
    },
    storage: createSafeStorage(),
    requestPermission: resolveRequestPermission(),
  };
}
