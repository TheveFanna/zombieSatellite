import type { KeyValueStorage } from '../pointing/deps';
import { appendSessionResult, parseSessionResults } from '../../lib/session/index';
import type { SessionResult } from '../../lib/session/index';

export const RESULT_STORAGE_KEY = 'zombieSatellite.session.results';

/** A storage failure never interrupts the session: every exception is swallowed. */
export function createResultStore(storage: KeyValueStorage): { append(result: SessionResult): void } {
  return {
    append(result) {
      try {
        storage.setItem(RESULT_STORAGE_KEY, appendSessionResult(storage.getItem(RESULT_STORAGE_KEY), result));
      } catch {
        // swallowed on purpose
      }
    },
  };
}

/** The stored Session_Results, oldest first. Never throws. */
export function readSessionResults(storage: KeyValueStorage): SessionResult[] {
  try {
    return parseSessionResults(storage.getItem(RESULT_STORAGE_KEY));
  } catch {
    return [];
  }
}
