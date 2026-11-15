import type { KeyValueStorage } from '../pointing/deps';
import { DEFAULT_OBSERVER } from '../pointing/pointing-session';
import { parseStoredObserver, serializeObserver } from '../../lib/session/index';
import type { ObserverPosition } from '../../lib/session/index';

export const OBSERVER_STORAGE_KEY = 'zombieSatellite.session.observer';

/** The Session_Observer shared by both pages. A storage failure never throws. */
export function createObserverStore(storage: KeyValueStorage): {
  get(): ObserverPosition;
  set(position: ObserverPosition): boolean;
} {
  return {
    get() {
      let raw: string | null = null;
      try {
        raw = storage.getItem(OBSERVER_STORAGE_KEY);
      } catch {
        raw = null;
      }
      return parseStoredObserver(raw) ?? DEFAULT_OBSERVER;
    },
    set(position) {
      const text = serializeObserver(position);
      if (parseStoredObserver(text) === null) return false;
      try {
        storage.setItem(OBSERVER_STORAGE_KEY, text);
      } catch {
        // swallowed on purpose
      }
      return true;
    },
  };
}
