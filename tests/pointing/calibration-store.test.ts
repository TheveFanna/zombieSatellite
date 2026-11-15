// Feature: ar-pointing, Controller example checks: calibration storage
// Validates: Requirements 7.9
import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_STORAGE_KEY,
  createCalibrationStore,
} from '../../src/components/pointing/calibration-store';
import { createMockStorage } from '../helpers/pointing-mocks';

describe('calibration store', () => {
  it('reads 0 from empty storage', () => {
    const storage = createMockStorage();
    expect(createCalibrationStore(storage).get()).toBe(0);
  });

  it('falls back to 0 when the stored value is not numeric', () => {
    const storage = createMockStorage();
    storage.data.set(CALIBRATION_STORAGE_KEY, 'abc');
    expect(createCalibrationStore(storage).get()).toBe(0);
  });

  it("step(-5) from 0 gives 355 and stores '355'", () => {
    const storage = createMockStorage();
    const store = createCalibrationStore(storage);
    store.step(-5);
    expect(store.get()).toBe(355);
    expect(storage.data.get(CALIBRATION_STORAGE_KEY)).toBe('355');
  });

  it('a new store over the same storage reads 355', () => {
    const storage = createMockStorage();
    createCalibrationStore(storage).step(-5);
    expect(createCalibrationStore(storage).get()).toBe(355);
  });
});
