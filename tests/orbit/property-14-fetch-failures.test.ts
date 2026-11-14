// Property 14 of design.md (Correctness Properties): Failed requests are classified and leave the
// cache unchanged.
//
// For any set of fresh cache entries for other catalog numbers, for any requested N, and for any failure
// scenario (the Fetch_Function throws a generated value synchronously; returns a promise rejected with it;
// resolves with a non-response value; resolves with a status from 100 to 599 other than 200 and any body;
// resolves with status 200 and a body whose `text()` rejects; resolves with status 200 and an accepted TLE
// for a number M ≠ N), `fetchTle(N)` rejects with category `network` carrying the generated value as
// `cause` in the first two scenarios, `network` in the third, `http` with `status` equal to the generated
// status in the fourth, `network` carrying the rejection reason as `cause` in the fifth, and
// `catalog-mismatch` in the sixth; afterwards every earlier entry is still returned unchanged without
// calling the Fetch_Function, and the next requests for N and for M each call the Fetch_Function again.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EngineError, createTleFetcher, type TleRecord } from '../../src/lib/orbit/index';
import { failureScenarioArb } from '../helpers/arbitraries';
import { ISS_BASELINE } from '../helpers/baseline';
import { celestrakBody, createMockCelestrakFetch, recordingFetch } from '../helpers/mock-celestrak';

// "Property test settings" of design.md (D20, D21): Property 14 is a mocked property, so it runs 200
// cases with Vitest's default timeout of 5 000 ms.
const NUM_RUNS = 200;

/** Largest number of earlier cache entries in one case; the set may also be empty. */
const MAX_EARLIER_ENTRIES = 5;

/** Cache_Clock reading of every case: 2026-11-09T00:00:00Z. The clock never moves, so every earlier entry stays fresh. */
const CLOCK_MS = Date.parse('2026-11-09T00:00:00Z');

/** The ISS lines with NORAD catalog number `id` in both lines, which the TLE_Parser accepts. No checksum is recomputed (D1). */
function issTleWithNorad(id: number) {
  const norad = String(id).padStart(5, '0');
  return {
    name: ISS_BASELINE.name,
    line1: ISS_BASELINE.line1.slice(0, 2) + norad + ISS_BASELINE.line1.slice(7),
    line2: ISS_BASELINE.line2.slice(0, 2) + norad + ISS_BASELINE.line2.slice(7),
  };
}

/** The NORAD catalog number in the CATNR parameter of a request URL. */
function requestedId(url: string): number {
  return Number(new URL(url).searchParams.get('CATNR'));
}

/** Awaits a promise that must reject with an EngineError and returns that error. */
async function rejection(promise: Promise<unknown>): Promise<EngineError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof EngineError) {
      return error;
    }
    throw error;
  }
  throw new Error('The promise resolved, expected a rejection with an EngineError');
}

/**
 * A failure scenario for the requested number N, with the NORAD catalog numbers of the earlier cache
 * entries. Those numbers are neither N nor M, so no earlier entry can answer a request for N or M.
 */
const caseArb = failureScenarioArb.chain((scenario) =>
  fc
    .uniqueArray(
      fc.integer({ min: 1, max: 99_999 }).filter((id) => id !== scenario.noradId && id !== scenario.answeredNoradId),
      { maxLength: MAX_EARLIER_ENTRIES },
    )
    .map((earlierIds) => ({ scenario, earlierIds })),
);

describe('TLE_Fetcher failed requests', () => {
  it('classifies every failed request and leaves the cache unchanged', async () => {
    // Feature: orbit-engine, Property 14: Failed requests are classified and leave the cache unchanged
    // **Validates: Requirements 2.7, 3.8, 3.9, 3.11, 3.15, 5.6**
    await fc.assert(
      fc.asyncProperty(caseArb, async ({ scenario, earlierIds }) => {
        const { noradId, answeredNoradId, expected } = scenario;

        // One Fetch_Function serves the whole case: requests for N and M go to the failure scenario, and
        // requests for the earlier catalog numbers get an accepted TLE for the requested number.
        const scenarioFetch = scenario.createFetch();
        const answerEarlier = createMockCelestrakFetch({
          kind: 'answer',
          body: (url) => celestrakBody(issTleWithNorad(requestedId(url))),
        });
        const fetchFunction = recordingFetch((url, init) => {
          const id = requestedId(url);
          return id === noradId || id === answeredNoradId ? scenarioFetch(url, init) : answerEarlier(url, init);
        });
        const fetcher = createTleFetcher({ fetch: fetchFunction, now: () => CLOCK_MS });

        // The set of fresh cache entries for other catalog numbers.
        const earlier = new Map<number, TleRecord>();
        for (const id of earlierIds) {
          earlier.set(id, await fetcher.fetchTle(id));
        }

        // `fetchTle(N)` rejects with the category, the status and the cause that the scenario expects.
        const error = await rejection(fetcher.fetchTle(noradId));
        expect(error.category).toBe(expected.category);
        if (expected.status !== undefined) {
          expect(error.status).toBe(expected.status);
        }
        if (expected.cause !== undefined) {
          expect('cause' in error).toBe(true);
          expect(error.cause).toBe(expected.cause.value);
        }

        // Every earlier entry is still returned unchanged, without a call of the Fetch_Function.
        const callsAfterFailure = fetchFunction.calls.length;
        for (const [id, record] of earlier) {
          expect(await fetcher.fetchTle(id)).toBe(record);
        }
        expect(fetchFunction.calls).toHaveLength(callsAfterFailure);

        // The failure stored no entry for N and none for M, so the next request for each calls the
        // Fetch_Function again. M exists only in the catalog-mismatch scenario, and its request may succeed.
        for (const id of answeredNoradId === undefined ? [noradId] : [noradId, answeredNoradId]) {
          const callsBefore = fetchFunction.calls.length;
          await fetcher.fetchTle(id).catch(() => undefined);
          expect(fetchFunction.calls.length).toBeGreaterThan(callsBefore);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
