// Property 9: Look angles follow formula 2.9.2 and stay in range (design.md, Correctness Properties).
//
// For any baseline Satrec, for any Observer with latitude in [−90°, 90°], longitude in [−180°, 180°]
// and altitude in [−0.5, 9] km, and for any instant within 7 days of the TLE epoch at which propagation
// succeeds, `observeAt` returns `azimuthDeg` in [0, 360) and `elevationDeg` in [−90, 90], and
// Slant_Range, Elevation and (where the horizontal distance exceeds 1 km) Azimuth agree within 10⁻⁶ km
// and 10⁻⁶° (circular difference for Azimuth) with an independent test oracle that applies C30 and
// C34–C37 to the returned `ecfPositionKm`.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { createSatrec, observeAt, parseTle } from '../../src/lib/orbit/index';
import { instantArb, observerArb } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';
import { lookAngleOracle } from '../helpers/oracles';

// "Property test settings" of design.md (D20, D21): Property 9 runs 200 cases with a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/** "Within 7 days of the TLE epoch", in ms. */
const SEVEN_DAYS_MS = 7 * 86_400_000;

/** Agreement with the oracle: 10⁻⁶ km for the Slant_Range, 10⁻⁶° for the Elevation and the Azimuth. */
const TOLERANCE = 1e-6;

/** The Azimuth is compared only where the horizontal distance Slant_Range × cos(Elevation) exceeds 1 km. */
const MIN_HORIZONTAL_DISTANCE_KM = 1;

/** The difference between two angles in degrees along the shorter way round the circle; 0° and 360° differ by 0. */
function circularDifferenceDeg(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

// Feature: orbit-engine, Property 9: Look angles follow formula 2.9.2 and stay in range
// **Validates: Requirements 7.1, 7.2, 7.3, 14.7**
it(
  'Property 9: Look angles follow formula 2.9.2 and stay in range',
  () => {
    const cases = fc.constantFrom(ISS_BASELINE, ZHTW_BASELINE).chain((baseline) => {
      const epochMs = Date.parse(baseline.expected.EPOCH_ISO);
      return fc.record({
        baseline: fc.constant(baseline),
        instantMs: instantArb(epochMs - SEVEN_DAYS_MS, epochMs + SEVEN_DAYS_MS),
        observer: observerArb({ altitudeKm: { min: -0.5, max: 9 } }),
      });
    });

    fc.assert(
      fc.property(cases, ({ baseline, instantMs, observer }) => {
        const result = observeAt(createSatrec(parseTle(baseline.text)), instantMs, observer);
        // The property covers the instants at which propagation succeeds.
        fc.pre(result.ok);

        const { azimuthDeg, elevationDeg, slantRangeKm } = result.lookAngles;
        expect(azimuthDeg).toBeGreaterThanOrEqual(0);
        expect(azimuthDeg).toBeLessThan(360);
        expect(elevationDeg).toBeGreaterThanOrEqual(-90);
        expect(elevationDeg).toBeLessThanOrEqual(90);

        const oracle = lookAngleOracle(result.ecfPositionKm, observer);
        expect(Math.abs(slantRangeKm - oracle.slantRangeKm)).toBeLessThanOrEqual(TOLERANCE);
        expect(Math.abs(elevationDeg - oracle.elevationDeg)).toBeLessThanOrEqual(TOLERANCE);

        const horizontalDistanceKm = oracle.slantRangeKm * Math.cos((oracle.elevationDeg * Math.PI) / 180);
        if (horizontalDistanceKm > MIN_HORIZONTAL_DISTANCE_KM) {
          expect(circularDifferenceDeg(azimuthDeg, oracle.azimuthDeg)).toBeLessThanOrEqual(TOLERANCE);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
