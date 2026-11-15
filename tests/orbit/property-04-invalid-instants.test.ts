// Property 4: Invalid instants are rejected (design.md, Correctness Properties).
//
// For any value from the invalid-instant generator (NaN, ±∞, numbers with absolute value above
// 8.64 × 10¹⁵, `new Date(NaN)`, ISO 8601 and numeric strings, `null`, `undefined`, booleans, bigints,
// plain objects, arrays), `propagateAt(baselineSatrec, v)`, `observeAt(baselineSatrec, v, referenceObserver)`
// and `predictPasses({ …, start: v })` throw an `EngineError` of category `invalid-input`; and for any valid
// start within 168 h of +8.64 × 10¹⁵ ms and duration whose window end exceeds that limit, `predictPasses`
// throws `invalid-input`.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import {
  createSatrec,
  EngineError,
  observeAt,
  parseTle,
  predictPasses,
  propagateAt,
  type TimeInput,
} from '../../src/lib/orbit/index';
import { invalidInstantArb } from '../helpers/arbitraries';
import { ISS_BASELINE, REFERENCE_OBSERVER } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 4 runs 200 cases (for each of its two clauses)
// with a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/** The largest absolute UTC_Instant: the ECMAScript Date range in ms (Requirement 2, criterion 9). */
const MAX_INSTANT_MS = 8.64e15;

const MS_PER_HOUR = 3_600_000;

/** The longest window that `predictPasses` accepts, in hours (Requirement 9, criterion 8). */
const MAX_DURATION_HOURS = 168;

/**
 * The searches of the second clause: a valid start within 168 h of +8.64 × 10¹⁵ ms and a duration whose window end
 * exceeds that limit. `windowMs` is the window length from 1 ms to 168 h, and `durationHours` is that length in hours,
 * so the engine's `Math.round(durationHours × 3 600 000)` (D14) gives `windowMs` back. The start runs from the
 * earliest instant at which the window ends 1 ms beyond the limit up to the limit itself, so it is valid (a number or
 * a `Date`) and the window end is at least 8.64 × 10¹⁵ + 1 ms.
 */
const overflowingWindowArb = fc
  .integer({ min: 1, max: MAX_DURATION_HOURS * MS_PER_HOUR })
  .chain((windowMs) =>
    fc.record({
      startMs: fc.integer({ min: MAX_INSTANT_MS - windowMs + 1, max: MAX_INSTANT_MS }),
      asDate: fc.boolean(),
      durationHours: fc.constant(windowMs / MS_PER_HOUR),
    }),
  );

/** Calls `run`, which must throw an `EngineError` of category `invalid-input`; `source` names the function under test. */
function expectInvalidInput(run: () => unknown, source: string): void {
  let threw = false;
  let error: unknown;
  try {
    run();
  } catch (caught) {
    threw = true;
    error = caught;
  }

  expect(threw, `${source} must reject the invalid input`).toBe(true);
  expect(error, `${source} must report an EngineError`).toBeInstanceOf(EngineError);
  expect((error as EngineError).category, `${source} category`).toBe('invalid-input');
}

// Feature: orbit-engine, Property 4: Invalid instants are rejected
// **Validates: Requirements 2.7, 2.9, 6.6, 9.10**
it(
  'Property 4: Invalid instants are rejected',
  () => {
    const tle = parseTle(ISS_BASELINE.text);
    const baselineSatrec = createSatrec(tle);

    // First clause: an invalid instant as the instant of `propagateAt` and `observeAt` and as `start` of
    // `predictPasses`, with otherwise valid inputs.
    fc.assert(
      fc.property(invalidInstantArb, (value) => {
        // The functions declare `TimeInput`; the property passes values of every type.
        const instant = value as TimeInput;

        expectInvalidInput(() => propagateAt(baselineSatrec, instant), 'propagateAt');
        expectInvalidInput(() => observeAt(baselineSatrec, instant, REFERENCE_OBSERVER), 'observeAt');
        expectInvalidInput(
          () => predictPasses({ observer: REFERENCE_OBSERVER, tle, start: instant }),
          'predictPasses (start)',
        );
      }),
      { numRuns: NUM_RUNS },
    );

    // Second clause: a valid start within 168 h of +8.64 × 10¹⁵ ms and a duration whose window end exceeds the limit.
    fc.assert(
      fc.property(overflowingWindowArb, ({ startMs, asDate, durationHours }) => {
        const start = asDate ? new Date(startMs) : startMs;

        expectInvalidInput(
          () => predictPasses({ observer: REFERENCE_OBSERVER, tle, start, durationHours }),
          'predictPasses (window end)',
        );
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
