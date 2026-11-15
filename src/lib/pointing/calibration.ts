import { normalizeDeg360 } from './angles';

/** Azimuth after applying the calibration offset: az' = az − offset, in [0, 360). */
export function effectiveAzimuthDeg(
  azimuthDeg: number,
  calibrationOffsetDeg: number,
): number {
  return normalizeDeg360(azimuthDeg - calibrationOffsetDeg);
}

/**
 * Accepts only finite numbers (strings, including numeric strings, are rejected).
 * Accepted values are normalized to [0, 360); anything else keeps `previousDeg`.
 */
export function applyCalibrationInput(
  previousDeg: number,
  input: unknown,
): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return normalizeDeg360(input);
  }
  return previousDeg;
}

/** Adds `deltaDeg` to the offset and normalizes to [0, 360); 0 − 5 gives 355. */
export function stepCalibrationOffset(
  currentDeg: number,
  deltaDeg: number,
): number {
  return normalizeDeg360(currentDeg + deltaDeg);
}
