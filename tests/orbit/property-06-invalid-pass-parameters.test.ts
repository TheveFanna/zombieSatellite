// Property 6: Invalid pass parameters are rejected (design.md, Correctness Properties).
//
// For any `durationHours` other than `undefined` that is not a finite `number` in (0, 168], and for any
// `minElevationDeg` other than `undefined` that is not a finite `number` in [−90, 90] (including `null`, NaN,
// ±∞, 0 hours, negative and oversized values and numeric strings), `predictPasses` with otherwise valid
// inputs throws an `EngineError` of category `invalid-input`.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { EngineError, parseTle, predictPasses, type PassSearch } from '../../src/lib/orbit/index';
import { invalidDurationArb, invalidMinElevationArb } from '../helpers/arbitraries';
import { ISS_BASELINE, REFERENCE_OBSERVER } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 6 runs 200 cases with a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/** The window start of the otherwise valid search: 2026-11-09T00:00:00Z, the day after the ISS epoch. */
const START_MS = Date.parse('2026-11-09T00:00:00Z');

/**
 * The pass parameters of one case: an invalid `durationHours` with the default Min_Elevation, an invalid
 * `minElevationDeg` with the default duration, or both invalid. `undefined` selects the default (Requirement 9,
 * criteria 2 and 3), so the other inputs of the search stay valid.
 */
const parametersArb = fc.oneof(
  fc.record({ durationHours: invalidDurationArb, minElevationDeg: fc.constant(undefined) }),
  fc.record({ durationHours: fc.constant(undefined), minElevationDeg: invalidMinElevationArb }),
  fc.record({ durationHours: invalidDurationArb, minElevationDeg: invalidMinElevationArb }),
);

/** Calls `predictPasses` on a search that it must reject and returns what it throws. */
function rejectionOf(search: PassSearch): unknown {
  try {
    predictPasses(search);
  } catch (error) {
    return error;
  }
  throw new Error('predictPasses accepted the invalid pass parameters');
}

// Feature: orbit-engine, Property 6: Invalid pass parameters are rejected
// **Validates: Requirements 2.7, 9.8, 9.9**
it(
  'Property 6: Invalid pass parameters are rejected',
  () => {
    const tle = parseTle(ISS_BASELINE.text);

    fc.assert(
      fc.property(parametersArb, ({ durationHours, minElevationDeg }) => {
        // `PassSearch` declares numbers; the property passes values of every type.
        const error = rejectionOf({
          observer: REFERENCE_OBSERVER,
          tle,
          start: START_MS,
          durationHours: durationHours as number | undefined,
          minElevationDeg: minElevationDeg as number | undefined,
        });

        expect(error).toBeInstanceOf(EngineError);
        expect((error as EngineError).category).toBe('invalid-input');
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
