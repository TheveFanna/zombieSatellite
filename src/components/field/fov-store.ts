import { FOV_DEFAULT_DEG, normalizeFov } from '../../lib/field/index';
import type { KeyValueStorage } from '../pointing/deps';

export const FOV_STORAGE_KEY = 'zombieSatellite.field.verticalFovDeg';

/** Reads the stored Vertical_FOV; anything invalid or missing gives the default. */
export function readFov(storage: KeyValueStorage): number {
  const raw = storage.getItem(FOV_STORAGE_KEY);
  if (raw === null) return FOV_DEFAULT_DEG;
  return normalizeFov(Number(raw));
}

export function writeFov(storage: KeyValueStorage, fovDeg: number): void {
  storage.setItem(FOV_STORAGE_KEY, String(normalizeFov(fovDeg)));
}
