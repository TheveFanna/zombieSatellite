// Property 21: No passes above +90° (design.md, Correctness Properties).
//
// For any baseline TleRecord, Observer, window start and duration as in Property 20, `predictPasses` with
// `minElevationDeg: 90` returns an empty list without throwing.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { parseTle, predictPasses } from '../../src/lib/orbit/index';
import { instantArb, observerArb } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): the Pass_Predictor properties run 100 cases with a
// timeout of 60 000 ms.
const NUM_RUNS = 100;
const TIMEOUT_MS = 60_000;

// The ranges "as in Property 20": an Observer with latitude in [−90°, 90°], longitude in [−180°, 180°] and
// altitude 0 to 3 km; an integer window start from 2026-11-08T00:00:00Z to 2026-11-11T00:00:00Z; and a duration
// in (0, 48] hours.
const WINDOW_START_FROM_MS = Date.parse('2026-11-08T00:00:00Z');
const WINDOW_START_TO_MS = Date.parse('2026-11-11T00:00:00Z');
const MS_PER_HOUR = 3_600_000;
const MAX_DURATION_HOURS = 48;

/**
 * A duration in (0, 48] hours. `fc.double` draws uniformly from the ordered doubles, so nearly every value it gives is
 * far below one millisecond and rounds to the window end E = S. The second generator draws whole milliseconds
 * uniformly, so that windows of hours occur as well.
 */
const durationHoursArb = fc.oneof(
  fc.double({ min: 0, max: MAX_DURATION_HOURS, minExcluded: true, noNaN: true }),
  fc.integer({ min: 1, max: MAX_DURATION_HOURS * MS_PER_HOUR }).map((ms) => ms / MS_PER_HOUR),
);

// Feature: orbit-engine, Property 21: No passes above +90°
// **Validates: Requirements 9.14**
it(
  'Property 21: No passes above +90°',
  () => {
    const cases = fc.record({
      baseline: fc.constantFrom(ISS_BASELINE, ZHTW_BASELINE),
      observer: observerArb({ altitudeKm: { min: 0, max: 3 } }),
      startMs: instantArb(WINDOW_START_FROM_MS, WINDOW_START_TO_MS),
      durationHours: durationHoursArb,
    });

    fc.assert(
      fc.property(cases, ({ baseline, observer, startMs, durationHours }) => {
        const tle = parseTle(baseline.text);
        // An exception from `predictPasses` fails the property just as a non-empty list does.
        expect(predictPasses({ observer, tle, start: startMs, durationHours, minElevationDeg: 90 })).toEqual([]);
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
