// Property 3: Malformed TLE text is rejected (design.md, Correctness Properties).
//
// For any accepted TLE text and for any mutation from the mutation generator (remove the name line, add a
// fourth non-empty line, append a second TLE, change the `1 ` or `2 ` prefix, make a line 68 or 70
// characters long, put a non-digit or a space into a NORAD, epoch-year or eccentricity field, give line 2 a
// different NORAD number, replace a decimal field of criterion 21 with a blank, a sign, an exponent, a
// letter or a second decimal point, set the mean motion to zero), `parseTle` throws an `EngineError` of
// category `invalid-tle`, and `fetchTle` for the NORAD number of the original text rejects with category
// `invalid-tle` when a status-200 Fetch_Function returns the mutated text as its body.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { EngineError, createTleFetcher, isEngineError, parseTle } from '../../src/lib/orbit/index';
import { formatTle, mutationArb, tleFieldsArb, type TleLines } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';
import { createMockCelestrakFetch } from '../helpers/mock-celestrak';

// "Property test settings" of design.md (D20, D21): Property 3 runs 200 cases, and every case runs
// `twoline2satrec` on the original TLE, so the test gets a timeout of 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

/**
 * Whether `parseTle` accepts the three-line text of the TLE. The generators leave it to `parseTle` whether
 * satellite.js accepts a generated TLE, and Property 3 applies to accepted TLEs only.
 */
function isAccepted({ name, line1, line2 }: TleLines): boolean {
  try {
    parseTle(`${name}\n${line1}\n${line2}`);
    return true;
  } catch (error) {
    if (isEngineError(error) && error.category === 'invalid-tle') {
      return false;
    }
    throw error;
  }
}

/** The accepted TLEs: the two Baseline_TLE_Snapshots and the generated TLEs that `parseTle` accepts. */
const acceptedTleArb: fc.Arbitrary<TleLines> = fc
  .oneof(fc.constantFrom<TleLines>(ISS_BASELINE, ZHTW_BASELINE), tleFieldsArb.map(formatTle))
  .filter(isAccepted);

/** An accepted TLE together with one mutation of it. */
const malformedArb = acceptedTleArb.chain((tle) => mutationArb(tle).map((mutation) => ({ tle, mutation })));

/** The NORAD catalog number of the original text: line 1 columns [2:7] (C18). */
function noradIdOf(tle: TleLines): number {
  return Number(tle.line1.slice(2, 7));
}

/** Calls `parseTle` on a text that it must reject and returns what it throws. */
function parseRejection(text: string): unknown {
  try {
    parseTle(text);
  } catch (error) {
    return error;
  }
  throw new Error('parseTle accepted the mutated TLE text');
}

/** Awaits the promise of `fetchTle` and returns what it rejects with. */
async function fetchRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('fetchTle resolved for the mutated TLE text');
}

/** Expects an `EngineError` of category `invalid-tle`; `source` names the function that reported it. */
function expectInvalidTle(error: unknown, source: string): void {
  expect(error, `${source} must report an EngineError`).toBeInstanceOf(EngineError);
  expect((error as EngineError).category, `${source} category`).toBe('invalid-tle');
}

// Feature: orbit-engine, Property 3: Malformed TLE text is rejected
// **Validates: Requirements 2.7, 3.10, 4.11, 4.12, 4.13, 4.14, 4.15, 4.21, 4.22**
it(
  'Property 3: Malformed TLE text is rejected',
  async () => {
    await fc.assert(
      fc.asyncProperty(malformedArb, async ({ tle, mutation }) => {
        expectInvalidTle(parseRejection(mutation.text), 'parseTle');

        const fetchFunction = createMockCelestrakFetch({ kind: 'answer', status: 200, body: mutation.text });
        const fetcher = createTleFetcher({ fetch: fetchFunction });
        expectInvalidTle(await fetchRejection(fetcher.fetchTle(noradIdOf(tle))), 'fetchTle');
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
