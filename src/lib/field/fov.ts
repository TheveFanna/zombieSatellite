import { VERTICAL_FOV_DEG } from '../pointing/index';

export const FOV_MIN_DEG = 45;
export const FOV_MAX_DEG = 100;
export const FOV_DEFAULT_DEG = VERTICAL_FOV_DEG;
export const FOV_STEP_DEG = 1;

/** A finite number inside the range is returned; anything else gives the default. */
export function normalizeFov(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= FOV_MIN_DEG && raw <= FOV_MAX_DEG) return raw;
  return FOV_DEFAULT_DEG;
}
