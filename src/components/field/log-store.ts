import { appendLogEntry, parseStoredLog, serializeLog } from '../../lib/field/index';
import type { LogEntry } from '../../lib/field/index';
import type { KeyValueStorage } from '../pointing/deps';

// Separate from zombieSatellite.session.results and the QSL collection.
export const LOG_STORAGE_KEY = 'zombieSatellite.field.listeningLog';

export function readLog(storage: KeyValueStorage): readonly LogEntry[] {
  try {
    return parseStoredLog(storage.getItem(LOG_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Appends one entry (oldest dropped at the cap) and returns the stored list. */
export function addLogEntry(storage: KeyValueStorage, entry: LogEntry): readonly LogEntry[] {
  const next = appendLogEntry(readLog(storage), entry);
  storage.setItem(LOG_STORAGE_KEY, serializeLog(next));
  return next;
}
