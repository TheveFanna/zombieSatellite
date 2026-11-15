// Property 7: Date and millisecond inputs are interchangeable (design.md, Correctness Properties).
//
// For any finite number `t` with |t| ≤ 8.64 × 10¹⁵ (integers near the baseline epochs, fractional values, and
// instants far from epoch that make propagation fail), `propagateAt(s, t)` deep-equals `propagateAt(s, new Date(t))`
// and `observeAt(s, t, o)` deep-equals `observeAt(s, new Date(t), o)` for both baseline Satrecs, and for any valid
// 1-hour pass search, `predictPasses` with `start: t` deep-equals `predictPasses` with `start: new Date(t)`.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { createSatrec, observeAt, parseTle, predictPasses, propagateAt } from '../../src/lib/orbit/index';
import { fractionalInstantArb, instantArb, observerArb } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 7 runs 200 cases with a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/** The ECMAScript Date range in ms, the bound of |t| (Requirement 2, criterion 9). */
const MAX_TIME_MS = 8.64e15;

const MS_PER_HOUR = 3_600_000;
const SEVEN_DAYS_MS = 7 * 86_400_000;

/** The two baseline TLEs; their Satrecs are the `s` of the property. */
const BASELINES = [ISS_BASELINE, ZHTW_BASELINE];

// "Near the baseline epochs": from 7 days before the earlier epoch to 7 days after the later one.
const EPOCHS_MS = BASELINES.map((baseline) => Date.parse(baseline.expected.EPOCH_ISO));
const NEAR_FROM_MS = Math.min(...EPOCHS_MS) - SEVEN_DAYS_MS;
const NEAR_TO_MS = Math.max(...EPOCHS_MS) + SEVEN_DAYS_MS;

/**
 * The finite numbers `t` with |t| ≤ 8.64 × 10¹⁵ of the property: integers near the baseline epochs; fractional values
 * near the epochs; fractional values of either sign anywhere in the Date range (D3 truncates a fractional number
 * toward zero as `new Date(t)` does); integers anywhere in the Date range, which lie far from the epochs, where
 * propagation fails; and the two limits of the range.
 */
const timeValueArb: fc.Arbitrary<number> = fc.oneof(
  instantArb(NEAR_FROM_MS, NEAR_TO_MS),
  fractionalInstantArb(NEAR_FROM_MS, NEAR_TO_MS),
  fractionalInstantArb(-MAX_TIME_MS, MAX_TIME_MS),
  instantArb(-MAX_TIME_MS, MAX_TIME_MS),
  fc.constantFrom(-MAX_TIME_MS, MAX_TIME_MS),
);

// An Observer with altitude 0 to 3 km as in Properties 20 and 21, and the baseline TLE of the pass search.
const cases = fc.record({
  t: timeValueArb,
  observer: observerArb({ altitudeKm: { min: 0, max: 3 } }),
  baseline: fc.constantFrom(...BASELINES),
});

// Feature: orbit-engine, Property 7: Date and millisecond inputs are interchangeable
// **Validates: Requirements 2.4**
it(
  'Property 7: Date and millisecond inputs are interchangeable',
  () => {
    fc.assert(
      fc.property(cases, ({ t, observer, baseline }) => {
        const date = new Date(t);

        // `toStrictEqual` compares numbers with `Object.is`, so the results must be exactly equal. An exception
        // from either call fails the property as well.
        for (const { text } of BASELINES) {
          const satrec = createSatrec(parseTle(text));
          expect(propagateAt(satrec, t)).toStrictEqual(propagateAt(satrec, date));
          expect(observeAt(satrec, t, observer)).toStrictEqual(observeAt(satrec, date, observer));
        }

        // A valid 1-hour search: its window end t + 1 h stays inside the Date range (D14).
        if (t + MS_PER_HOUR <= MAX_TIME_MS) {
          const search = { observer, tle: parseTle(baseline.text), durationHours: 1 };
          expect(predictPasses({ ...search, start: t })).toStrictEqual(predictPasses({ ...search, start: date }));
        }
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
