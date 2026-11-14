// Example tests of the look angles (design.md, Testing Strategy, look-angles.test.ts):
// Requirement 7, criteria 5 to 9.
import { describe, expect, it } from 'vitest';
import { radToDeg } from '../../src/lib/orbit/constants';
import { createSatrec, normalizeAzimuthDeg, observeAt, parseTle } from '../../src/lib/orbit/index';
import type { LookAngles, ObservationSuccess, Observer } from '../../src/lib/orbit/index';
import { ISS_AT_1123Z, ISS_AT_1200Z, REFERENCE_OBSERVER, ZHTW_AT_1200Z } from '../helpers/baseline';
import type { BaselineInstant } from '../helpers/baseline';

// Tolerances of Reference_Document section 4.1 (Requirement 7, criteria 5 to 7 and 9).
const ANGLE_TOLERANCE_DEG = 0.01;
const RANGE_TOLERANCE_KM = 0.1;

/** Runs `observeAt` for the Baseline_TLE_Snapshot and the instant of `baseline`; propagation must succeed. */
function observeBaseline(baseline: BaselineInstant, observer: Observer): ObservationSuccess {
  const satrec = createSatrec(parseTle(baseline.tle.text));
  const result = observeAt(satrec, baseline.timeMs, observer);
  if (!result.ok) {
    throw new Error(`SGP4 propagation failed at ${baseline.iso} with Satrec error ${result.satrecError}`);
  }
  return result;
}

/** Fails unless `actual` is within ±`tolerance` of `expected`. */
function expectWithin(actual: number, expected: number, tolerance: number, quantity: string): void {
  expect(Math.abs(actual - expected), `${quantity}: ${actual} against ${expected} ± ${tolerance}`).toBeLessThanOrEqual(
    tolerance,
  );
}

/** Requirement 7, criteria 5 to 7: the section 4.3 Look_Angles of `baseline` for the Reference_Observer. */
function expectSection43LookAngles(baseline: BaselineInstant): void {
  const { lookAngles } = observeBaseline(baseline, REFERENCE_OBSERVER);

  expectWithin(lookAngles.azimuthDeg, baseline.azimuthDeg, ANGLE_TOLERANCE_DEG, 'Azimuth (deg)');
  expectWithin(lookAngles.elevationDeg, baseline.elevationDeg, ANGLE_TOLERANCE_DEG, 'Elevation (deg)');
  expectWithin(lookAngles.slantRangeKm, baseline.slantRangeKm, RANGE_TOLERANCE_KM, 'Slant_Range (km)');
}

/** Horizontal distance Slant_Range × cos(Elevation) in km (Requirement 7, criterion 9). */
function horizontalDistanceKm({ slantRangeKm, elevationDeg }: LookAngles): number {
  return slantRangeKm * Math.cos((elevationDeg * Math.PI) / 180);
}

/** Vertical distance Slant_Range × sin(Elevation) in km (Requirement 7, criterion 9). */
function verticalDistanceKm({ slantRangeKm, elevationDeg }: LookAngles): number {
  return slantRangeKm * Math.sin((elevationDeg * Math.PI) / 180);
}

describe('Look_Angles for the Reference_Observer at the section 4.3 instants', () => {
  it('ISS at 2026-11-09T11:23:00Z (Requirement 7, criterion 5)', () => {
    expectSection43LookAngles(ISS_AT_1123Z);
  });

  it('ISS at 2026-11-09T12:00:00Z (Requirement 7, criterion 6)', () => {
    expectSection43LookAngles(ISS_AT_1200Z);
  });

  it('ZHIHUI TIANWANG-1 01A at 2026-11-09T12:00:00Z (Requirement 7, criterion 7)', () => {
    expectSection43LookAngles(ZHTW_AT_1200Z);
  });
});

describe('Azimuth of exactly 0° for 2π rad (Requirement 7, criterion 8)', () => {
  it('normalizeAzimuthDeg(360) is +0', () => {
    // toBe compares with Object.is, so a result of -0 fails.
    expect(normalizeAzimuthDeg(360)).toBe(0);
  });

  it('radToDeg(2π) = (2π / π) · 180 is exactly 360 (D8), so the 2π rad of C37 is reported as +0', () => {
    expect(radToDeg(2 * Math.PI)).toBe(360);
    expect(normalizeAzimuthDeg(radToDeg(2 * Math.PI))).toBe(0);
  });
});

describe('Look_Angles for an Observer altitude of 1 km (Requirement 7, criterion 9)', () => {
  it('keeps Azimuth and horizontal distance and lowers the vertical distance by 1 km', () => {
    const ground = observeBaseline(ISS_AT_1123Z, REFERENCE_OBSERVER).lookAngles;
    const raised = observeBaseline(ISS_AT_1123Z, { ...REFERENCE_OBSERVER, altitudeKm: 1 }).lookAngles;

    expectWithin(raised.azimuthDeg, ground.azimuthDeg, ANGLE_TOLERANCE_DEG, 'Azimuth (deg)');
    expectWithin(
      horizontalDistanceKm(raised),
      horizontalDistanceKm(ground),
      RANGE_TOLERANCE_KM,
      'horizontal distance (km)',
    );
    expectWithin(
      verticalDistanceKm(raised),
      verticalDistanceKm(ground) - 1,
      RANGE_TOLERANCE_KM,
      'vertical distance (km), 1 km smaller',
    );
  });
});
