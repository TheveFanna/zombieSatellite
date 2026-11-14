// Property 11: Range rate matches its definition and the measured range change (design.md, Correctness Properties).
//
// For any baseline Satrec, for any Observer with latitude in [−90°, 90°], longitude in [−180°, 180°] and
// altitude 0 km, and for any integer instant t from 2026-11-09T00:00:00Z to 2026-11-10T00:00:00Z at which
// propagation at t − 500, t and t + 500 ms succeeds, `rangeRateKmPerS` at t agrees within 10⁻⁹ km/s with a test
// oracle computing (Rz(−θ)·v_teme − ω⊕ × r_ecf) · (r_ecf − r_obs) / ρ from the `propagateAt` outputs, lies within
// ±0.01 km/s of the central difference cd = ρ(t + 500) − ρ(t − 500) (km per 1 s), and has the sign of cd whenever
// |cd| > 0.01 km/s.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { createSatrec, observeAt, parseTle, propagateAt } from '../../src/lib/orbit/index';
import { instantArb, observerArb } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';
import { rangeRateOracle } from '../helpers/oracles';

// "Property test settings" of design.md (D20, D21): Property 11 runs 200 cases with a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/** The domain of the instant t: 2026-11-09T00:00:00Z to 2026-11-10T00:00:00Z (Requirement 8, criterion 8). */
const WINDOW_START_MS = Date.parse('2026-11-09T00:00:00Z');
const WINDOW_END_MS = Date.parse('2026-11-10T00:00:00Z');

/** The central difference spans t − 0.5 s to t + 0.5 s, so ρ(t + 500) − ρ(t − 500) is in km per 1 s. */
const HALF_STEP_MS = 500;

/** Agreement with the oracle, in km/s. */
const ORACLE_TOLERANCE_KM_PER_S = 1e-9;

/** Agreement with the central difference, in km/s (Requirement 8, criterion 8). */
const CENTRAL_DIFFERENCE_TOLERANCE_KM_PER_S = 0.01;

/** The central difference magnitude above which the signs must match, in km/s (Requirement 8, criterion 9). */
const SIGN_THRESHOLD_KM_PER_S = 0.01;

// Feature: orbit-engine, Property 11: Range rate matches its definition and the measured range change
// **Validates: Requirements 8.1, 8.2, 8.4, 8.8, 8.9, 14.7**
it(
  'Property 11: Range rate matches its definition and the measured range change',
  () => {
    const cases = fc.record({
      baseline: fc.constantFrom(ISS_BASELINE, ZHTW_BASELINE),
      instantMs: instantArb(WINDOW_START_MS, WINDOW_END_MS),
      observer: observerArb({ altitudeKm: 0 }),
    });

    fc.assert(
      fc.property(cases, ({ baseline, instantMs, observer }) => {
        const satrec = createSatrec(parseTle(baseline.text));
        const before = observeAt(satrec, instantMs - HALF_STEP_MS, observer);
        const at = observeAt(satrec, instantMs, observer);
        const after = observeAt(satrec, instantMs + HALF_STEP_MS, observer);
        const propagated = propagateAt(satrec, instantMs);
        // The property covers the instants at which propagation succeeds at t − 500, t and t + 500 ms.
        fc.pre(before.ok && at.ok && after.ok && propagated.ok);

        const rangeRate = at.rangeRateKmPerS;

        const oracle = rangeRateOracle(propagated, observer);
        expect(
          Math.abs(rangeRate - oracle),
          `engine ${rangeRate} km/s, oracle ${oracle} km/s`,
        ).toBeLessThanOrEqual(ORACLE_TOLERANCE_KM_PER_S);

        const centralDifference = after.lookAngles.slantRangeKm - before.lookAngles.slantRangeKm;
        expect(
          Math.abs(rangeRate - centralDifference),
          `engine ${rangeRate} km/s, central difference ${centralDifference} km/s`,
        ).toBeLessThanOrEqual(CENTRAL_DIFFERENCE_TOLERANCE_KM_PER_S);

        if (Math.abs(centralDifference) > SIGN_THRESHOLD_KM_PER_S) {
          expect(
            Math.sign(rangeRate),
            `engine ${rangeRate} km/s, central difference ${centralDifference} km/s`,
          ).toBe(Math.sign(centralDifference));
        }
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
