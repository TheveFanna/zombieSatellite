import { parseStoredObserver } from '../../lib/session/index';
import type { ObserverPosition } from '../../lib/session/index';
import type { KeyValueStorage } from '../pointing/deps';
import { OBSERVER_STORAGE_KEY } from '../session/observer-store';

/** The part of `navigator.geolocation` the Geolocation_Controller uses. */
export interface GeolocationLike {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: (error: { code: number }) => void,
    options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number },
  ): void;
}

export type LocateOutcome = 'applied' | 'skipped' | 'denied' | 'timeout' | 'unavailable' | 'failed';

/** Set once the Automatic_Locate has run in this browser profile (DD-6). */
export const AUTO_LOCATE_FLAG_KEY = 'zombieSatellite.shell.autoLocateAttempted';

/** Kilometre precision is enough for pass prediction; a network fix is faster. */
export const LOCATE_OPTIONS = Object.freeze({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 });

type Fix = { readonly ok: true; readonly position: ObserverPosition } | { readonly ok: false; readonly outcome: LocateOutcome };

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function readSafe(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The Geolocation_Controller. `apply` is the page controller's landed `setObserver`, which writes
 * through the observer store. Neither method ever rejects.
 */
export function createLocator(deps: { geolocation: GeolocationLike | null; storage: KeyValueStorage }): {
  autoLocate(apply: (position: ObserverPosition) => boolean): Promise<LocateOutcome>;
  locateNow(apply: (position: ObserverPosition) => boolean): Promise<LocateOutcome>;
} {
  const hasValidStoredObserver = (): boolean => parseStoredObserver(readSafe(deps.storage, OBSERVER_STORAGE_KEY)) !== null;

  function requestFix(geolocation: GeolocationLike): Promise<Fix> {
    return new Promise((resolve) => {
      try {
        geolocation.getCurrentPosition(
          (position) =>
            resolve({
              ok: true,
              position: { latitudeDeg: round4(position.coords.latitude), longitudeDeg: round4(position.coords.longitude) },
            }),
          (error) => resolve({ ok: false, outcome: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'failed' }),
          { ...LOCATE_OPTIONS },
        );
      } catch {
        resolve({ ok: false, outcome: 'failed' });
      }
    });
  }

  return {
    async autoLocate(apply) {
      if (hasValidStoredObserver()) return 'skipped';
      if (readSafe(deps.storage, AUTO_LOCATE_FLAG_KEY) !== null) return 'skipped';
      if (deps.geolocation === null) return 'unavailable';
      try {
        deps.storage.setItem(AUTO_LOCATE_FLAG_KEY, '1');
      } catch {
        // Best effort, like the observer store.
      }
      const fix = await requestFix(deps.geolocation);
      if (!fix.ok) return fix.outcome;
      // The user may have typed coordinates while the request ran; those win.
      if (hasValidStoredObserver()) return 'skipped';
      return apply(fix.position) ? 'applied' : 'skipped';
    },
    async locateNow(apply) {
      if (deps.geolocation === null) return 'unavailable';
      const fix = await requestFix(deps.geolocation);
      if (!fix.ok) return fix.outcome;
      return apply(fix.position) ? 'applied' : 'skipped';
    },
  };
}
