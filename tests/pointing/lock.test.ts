// Feature: ar-pointing, Property 9: §4.4 target rows
// Feature: ar-pointing, Property 10: Lock geometry
// **Validates: Requirements 8.9, 8.10**
import { describe, expect, it } from 'vitest';
import { evaluateLock, sceneDirection } from '../../src/lib/pointing/index';
import { expectClose, expectVec } from '../helpers/pointing-assert';

function scaled20(azimuthDeg: number, elevationDeg: number) {
  const v = sceneDirection(azimuthDeg, elevationDeg);
  return { x: 20 * v.x, y: 20 * v.y, z: 20 * v.z };
}

describe('§4.4 target rows', () => {
  const axisRows: Array<[number, number, [number, number, number]]> = [
    [0, 0, [0, 0, -20]],
    [90, 0, [20, 0, 0]],
    [180, 0, [0, 0, 20]],
    [270, 0, [-20, 0, 0]],
    [0, 90, [0, 20, 0]],
    [90, 45, [14.142136, 14.142136, 0]],
  ];

  it.each(axisRows)('20 · sceneDirection(%s, %s) matches the axis-aligned row', (az, el, expected) => {
    expectVec(scaled20(az, el), expected, 1e-6);
  });

  // The §4.4 table prints these rows with 4 decimals, so the printed values carry rounding error
  // up to 5e-5; a 1e-6 tolerance would fail because of table precision, not because of the implementation.
  const realRows: Array<[number, number, [number, number, number]]> = [
    [163.378, 14.6746, [5.5345, 5.0666, 18.5391]],
    [163.736, 45.4236, [3.9313, 14.2463, 13.4754]],
    [56.7028, -67.3222, [6.4451, -18.4538, -4.2332]],
  ];

  it.each(realRows)('20 · sceneDirection(%s, %s) matches the real-data row', (az, el, expected) => {
    expectVec(scaled20(az, el), expected, 1e-4);
  });
});

describe('lock geometry', () => {
  const forward = sceneDirection(0, 0);

  it('target (0, 0): error 0, locked, not behind', () => {
    const r = evaluateLock(forward, { azimuthDeg: 0, elevationDeg: 0 }, 0);
    expectClose(r.pointingErrorDeg, 0, 1e-9);
    expect(r.locked).toBe(true);
    expect(r.behind).toBe(false);
  });

  it('target (10, 0): error 10, locked at the exact boundary', () => {
    const r = evaluateLock(forward, { azimuthDeg: 10, elevationDeg: 0 }, 0);
    expectClose(r.pointingErrorDeg, 10, 1e-9);
    expect(r.locked).toBe(true);
  });

  it('target (10.001, 0): not locked', () => {
    const r = evaluateLock(forward, { azimuthDeg: 10.001, elevationDeg: 0 }, 0);
    expect(r.locked).toBe(false);
  });

  it('target (180, 0): behind, not locked', () => {
    const r = evaluateLock(forward, { azimuthDeg: 180, elevationDeg: 0 }, 0);
    expect(r.behind).toBe(true);
    expect(r.locked).toBe(false);
  });

  it('Vertical_Forward: heading and azimuth difference are null', () => {
    const r = evaluateLock(sceneDirection(0, 90), { azimuthDeg: 0, elevationDeg: 85 }, 0);
    expect(r.deviceHeadingDeg).toBeNull();
    expect(r.azimuthDifferenceDeg).toBeNull();
    expectClose(r.devicePitchDeg, 90, 1e-9);
    expectClose(r.pointingErrorDeg, 5, 1e-9);
    expectClose(r.elevationDifferenceDeg, -5, 1e-9);
    expect(r.locked).toBe(true);
    expect(r.behind).toBe(false);
  });
});
