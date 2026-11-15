// Property 5: Invalid structured inputs are rejected (design.md, Correctness Properties).
//
// For any value that is not a Satrec, TleRecord or Observer by the structural checks of `validate.ts` (values from
// `fc.anything()`, and valid objects with one field removed, given another type, made non-finite, or, for Observers,
// moved outside [−90°, 90°] latitude or [−180°, 180°] longitude, including numeric strings such as `"39.9"`), every
// Public_Interface function that requires that kind of value (`propagateAt`, `observeAt`, `createSatrec`,
// `predictPasses`) throws an `EngineError` of category `invalid-input`, and `observeAt` does so also at an instant
// where SGP4 propagation fails (ISS at EPOCH + 3650 days).
import fc from 'fast-check';
import { expect, it } from 'vitest';
import {
  createSatrec,
  EngineError,
  observeAt,
  parseTle,
  predictPasses,
  propagateAt,
  type Observer,
  type Satrec,
  type TleRecord,
} from '../../src/lib/orbit/index';
import { invalidObserverArb, invalidRecordArb, invalidSatrecArb } from '../helpers/arbitraries';
import { ISS_AT_1123Z, ISS_BASELINE, REFERENCE_OBSERVER } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 5 runs 200 cases with a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/** The instant of every call but one: 2026-11-09T11:23:00Z, where SGP4 propagation of the ISS succeeds (section 4.3). */
const INSTANT_MS = ISS_AT_1123Z.timeMs;

/**
 * Requirement 6, criterion 13: the ISS EPOCH + 3650 days, where SGP4 propagation fails (Satrec error code 6). An
 * invalid Observer gives `invalid-input` there as well (Requirement 7, criterion 4).
 */
const ISS_EPOCH_PLUS_3650_DAYS_MS = Date.parse('2036-11-05T04:12:35.430Z');

/** Runs `call`, which must throw an `EngineError` of category `invalid-input`; `label` names the call in a failure. */
function expectInvalidInput(label: string, call: () => unknown): void {
  let thrown: unknown;
  try {
    call();
  } catch (error) {
    thrown = error;
  }
  expect(thrown, `${label} must throw an EngineError`).toBeInstanceOf(EngineError);
  expect((thrown as EngineError).category, `${label} must throw the category invalid-input`).toBe('invalid-input');
}

// Feature: orbit-engine, Property 5: Invalid structured inputs are rejected
// **Validates: Requirements 2.7, 2.11, 7.4, 9.12**
it(
  'Property 5: Invalid structured inputs are rejected',
  () => {
    const tle = parseTle(ISS_BASELINE.text);
    const satrec = createSatrec(tle);

    fc.assert(
      fc.property(invalidSatrecArb, invalidRecordArb, invalidObserverArb, (badSatrec, badRecord, badObserver) => {
        // The functions are declared for a Satrec, a TleRecord and an Observer; the property passes values of every
        // type. Each call gets exactly one invalid argument, so a rejection can only come from that argument.

        // Not a Satrec.
        expectInvalidInput('propagateAt', () => propagateAt(badSatrec as Satrec, INSTANT_MS));
        expectInvalidInput('observeAt with an invalid Satrec', () =>
          observeAt(badSatrec as Satrec, INSTANT_MS, REFERENCE_OBSERVER),
        );

        // Not a TleRecord.
        expectInvalidInput('createSatrec', () => createSatrec(badRecord as TleRecord));
        expectInvalidInput('predictPasses with an invalid TleRecord', () =>
          predictPasses({ observer: REFERENCE_OBSERVER, tle: badRecord as TleRecord, start: INSTANT_MS }),
        );

        // Not an Observer, also at an instant where SGP4 propagation fails.
        expectInvalidInput('observeAt with an invalid Observer', () =>
          observeAt(satrec, INSTANT_MS, badObserver as Observer),
        );
        expectInvalidInput('observeAt with an invalid Observer at ISS EPOCH + 3650 days', () =>
          observeAt(satrec, ISS_EPOCH_PLUS_3650_DAYS_MS, badObserver as Observer),
        );
        expectInvalidInput('predictPasses with an invalid Observer', () =>
          predictPasses({ observer: badObserver as Observer, tle, start: INSTANT_MS }),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
