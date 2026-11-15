// Feature: ar-pointing, Property 8: Calibration sample and normalization
// **Validates: Requirements 7.2, 7.3, 7.4**
import { describe, it } from 'vitest';
import { applyCalibrationInput, effectiveAzimuthDeg, sceneDirection } from '../../src/lib/pointing/index';
import { expectClose, expectVec } from '../helpers/pointing-assert';

describe('calibration', () => {
  it('applies the offset to the azimuth and keeps the scene direction sample', () => {
    expectClose(effectiveAzimuthDeg(90, 10), 80, 1e-9);
    const v = sceneDirection(80, 0);
    expectVec({ x: 20 * v.x, y: 20 * v.y, z: 20 * v.z }, [19.696155, 0, -3.472964], 1e-6);
  });

  it('normalizes calibration input into [0, 360)', () => {
    expectClose(applyCalibrationInput(0, -5), 355, 1e-9);
    expectClose(applyCalibrationInput(0, -365), 355, 1e-9);
    expectClose(effectiveAzimuthDeg(90, -5), 95, 1e-9);
    expectClose(effectiveAzimuthDeg(90, 355), 95, 1e-9);
  });
});
