import { applyCalibrationInput, stepCalibrationOffset } from '../../lib/pointing/index';
import type { KeyValueStorage } from './deps';

export const CALIBRATION_STORAGE_KEY = 'zombieSatellite.pointing.calibrationOffsetDeg';

export interface CalibrationStore {
  /** Current offset in degrees, normalized to [0, 360). */
  get(): number;
  /** Applies a typed input; a rejected input keeps the previous offset. Returns the offset. */
  set(input: unknown): number;
  /** Adds `deltaDeg` to the offset (wrapping into [0, 360)). Returns the offset. */
  step(deltaDeg: number): number;
}

export function createCalibrationStore(storage: KeyValueStorage): CalibrationStore {
  const raw = storage.getItem(CALIBRATION_STORAGE_KEY);
  const parsed = raw === null || raw.trim() === '' ? undefined : Number(raw);
  let offset = applyCalibrationInput(0, parsed);

  const persist = (): void => {
    storage.setItem(CALIBRATION_STORAGE_KEY, String(offset));
  };

  return {
    get: () => offset,
    set(input: unknown): number {
      offset = applyCalibrationInput(offset, input);
      persist();
      return offset;
    },
    step(deltaDeg: number): number {
      offset = stepCalibrationOffset(offset, deltaDeg);
      persist();
      return offset;
    },
  };
}
