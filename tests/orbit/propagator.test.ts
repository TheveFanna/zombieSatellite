// Example tests of the Propagator and of the Satrec factory (design.md, Testing Strategy, propagator.test.ts):
// Requirement 6, criteria 7, 8, 9, 10 and 13.
import { twoline2satrec } from 'satellite.js';
import { describe, expect, it } from 'vitest';
import { EngineError, createSatrec, parseTle, propagateAt } from '../../src/lib/orbit/index';
import type { TleRecord, Vec3 } from '../../src/lib/orbit/index';
import { ISS_AT_1123Z, ISS_AT_1200Z, ISS_BASELINE, ZHTW_AT_1200Z } from '../helpers/baseline';
import type { BaselineInstant } from '../helpers/baseline';

// Tolerances of Requirement 6, criteria 7 to 9: per position component in km, and for GMST in rad.
const POSITION_TOLERANCE_KM = 0.1;
const GMST_TOLERANCE_RAD = 1e-8;

// The section 4.3 row that each of the criteria 7, 8 and 9 pins.
const BASELINE_CASES: ReadonlyArray<{ readonly criterion: number; readonly row: BaselineInstant }> = [
  { criterion: 7, row: ISS_AT_1123Z },
  { criterion: 8, row: ISS_AT_1200Z },
  { criterion: 9, row: ZHTW_AT_1200Z },
];

// Requirement 6, criterion 13: the ISS EPOCH + 3650 days, where satellite.js 6.0.2 `propagate` returns null
// and sets the Satrec error code 6.
const ISS_EPOCH_PLUS_3650_DAYS_MS = Date.parse('2036-11-05T04:12:35.430Z');
const DECAYED_ERROR_CODE = 6;

// Requirement 6, criterion 10: line 2 of the ISS Baseline_TLE_Snapshot with the mean motion in columns [52:63]
// replaced by 00.00000000. satellite.js 6.0.2 `twoline2satrec` returns a Satrec with error code 2 for it.
const ZERO_MEAN_MOTION_LINE2 = `${ISS_BASELINE.line2.slice(0, 52)}00.00000000${ISS_BASELINE.line2.slice(63)}`;
const ZERO_MEAN_MOTION_ERROR_CODE = 2;

/** Expects every component of `actual` to lie within the position tolerance of the component of `expected`. */
function expectVec3Within(label: string, actual: Vec3, expected: Vec3): void {
  for (const axis of ['x', 'y', 'z'] as const) {
    const difference = Math.abs(actual[axis] - expected[axis]);
    expect(difference, `${label}.${axis}: engine ${actual[axis]}, baseline ${expected[axis]}`).toBeLessThanOrEqual(
      POSITION_TOLERANCE_KM,
    );
  }
}

/** Calls `createSatrec` on a record that it must reject and returns the Engine_Error that it reports. */
function rejection(record: TleRecord): EngineError {
  try {
    createSatrec(record);
  } catch (error) {
    if (error instanceof EngineError) {
      return error;
    }
    throw error;
  }
  throw new Error('createSatrec accepted a record that it must reject');
}

describe('Propagator', () => {
  it.each(BASELINE_CASES)(
    'matches the section 4.3 row of $row.tle.name at $row.iso (Requirement 6, criterion $criterion)',
    ({ row }) => {
      const result = propagateAt(createSatrec(parseTle(row.tle.text)), row.timeMs);
      if (!result.ok) {
        throw new Error(`propagation failed with Satrec error code ${result.satrecError}`);
      }

      expectVec3Within('ECI', result.eciPositionKm, row.eciPositionKm);
      expectVec3Within('ECF', result.ecfPositionKm, row.ecfPositionKm);
      expect(Math.abs(result.gmstRad - row.gmstRad)).toBeLessThanOrEqual(GMST_TOLERANCE_RAD);
    },
  );

  it('returns a propagation-failure result for the ISS at EPOCH + 3650 days (Requirement 6, criterion 13)', () => {
    const satrec = createSatrec(parseTle(ISS_BASELINE.text));

    const result = propagateAt(satrec, ISS_EPOCH_PLUS_3650_DAYS_MS);

    expect(result).toMatchObject({ ok: false, satrecError: DECAYED_ERROR_CODE });
  });
});

describe('Satrec factory', () => {
  it('reports invalid-tle for a TleRecord whose mean motion is 00.00000000 (Requirement 6, criterion 10)', () => {
    // A hand-built record: the frozen ISS record is copied and only TLE_LINE2 is replaced.
    const record: TleRecord = { ...parseTle(ISS_BASELINE.text), TLE_LINE2: ZERO_MEAN_MOTION_LINE2 };
    expect(twoline2satrec(record.TLE_LINE1, record.TLE_LINE2).error).toBe(ZERO_MEAN_MOTION_ERROR_CODE);

    expect(rejection(record).category).toBe('invalid-tle');
  });
});
