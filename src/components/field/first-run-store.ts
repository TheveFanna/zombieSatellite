import type { KeyValueStorage } from '../pointing/deps';

export const FIRST_RUN_STORAGE_KEY = 'zombieSatellite.field.firstRunDone';

export function readFirstRunDone(storage: KeyValueStorage): boolean {
  return storage.getItem(FIRST_RUN_STORAGE_KEY) === '1';
}

export function writeFirstRunDone(storage: KeyValueStorage): void {
  storage.setItem(FIRST_RUN_STORAGE_KEY, '1');
}
