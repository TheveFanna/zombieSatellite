// Property 16 of design.md (Correctness Properties): Concurrent callers share one In_Flight_Request.
//
// For any number k from 2 to 10 of callers that request the same N before the first request settles, and
// for any outcome of that request (success, or any failure scenario of Property 14), the Fetch_Function
// is called exactly once, all k callers receive the same TleRecord object or the same `EngineError`
// object, and after an error the next request for N calls the Fetch_Function again.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { EngineError, createTleFetcher, type TleRecord } from '../../src/lib/orbit/index';
import { failureScenarioArb } from '../helpers/arbitraries';
import { ISS_BASELINE } from '../helpers/baseline';
import {
  celestrakBody,
  createMockCelestrakFetch,
  recordingFetch,
  type MockCelestrakFetch,
} from '../helpers/mock-celestrak';

// "Property test settings" of design.md (D20, D21): Property 16 is a mocked property, so it runs 200
// cases with the default test timeout of 5 000 ms, and the test sets no timeout.
const NUM_RUNS = 200;

/** The outcome in which the one shared request ends. */
interface Outcome {
  /** N: the NORAD catalog number that every caller requests. */
  readonly noradId: number;
  /** Creates a new Fetch_Function that produces the outcome for every request for N. */
  readonly createFetch: () => MockCelestrakFetch;
  /** True when the request ends in a TleRecord, false when it ends in an EngineError. */
  readonly succeeds: boolean;
}

/** The CelesTrak body for `id`: the ISS lines with NORAD catalog number `id` in both lines. No checksum is recomputed (D1). */
function issBodyForNorad(id: number): string {
  const norad = String(id).padStart(5, '0');
  return celestrakBody({
    name: ISS_BASELINE.name,
    line1: ISS_BASELINE.line1.slice(0, 2) + norad + ISS_BASELINE.line1.slice(7),
    line2: ISS_BASELINE.line2.slice(0, 2) + norad + ISS_BASELINE.line2.slice(7),
  });
}

/** Success: status 200 and an accepted TLE for N. */
const successArb: fc.Arbitrary<Outcome> = fc.integer({ min: 1, max: 99_999 }).map((noradId) => ({
  noradId,
  createFetch: () => createMockCelestrakFetch({ kind: 'answer', body: issBodyForNorad(noradId) }),
  succeeds: true,
}));

/** Any outcome of the request: success, or any failure scenario of Property 14. */
const outcomeArb: fc.Arbitrary<Outcome> = fc.oneof(
  successArb,
  failureScenarioArb.map(
    (scenario): Outcome => ({ noradId: scenario.noradId, createFetch: scenario.createFetch, succeeds: false }),
  ),
);

/**
 * The number k of callers (2 to 10), how many of them request N only after the Fetch_Function has been
 * called, while its answer is pending (0 to k − 1), and the outcome. The other callers request N in the
 * same synchronous turn as the first one, before the Fetch_Function is called; an In_Flight_Request
 * counts as started at the first caller request (Glossary).
 */
const caseArb = fc.integer({ min: 2, max: 10 }).chain((callerCount) =>
  fc.record({
    callerCount: fc.constant(callerCount),
    lateCallers: fc.integer({ min: 0, max: callerCount - 1 }),
    outcome: outcomeArb,
  }),
);

/** A promise that the test resolves later, together with the function that resolves it. */
function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

// Feature: orbit-engine, Property 16: Concurrent callers share one In_Flight_Request
// **Validates: Requirements 5.7**
it('Property 16: Concurrent callers share one In_Flight_Request', async () => {
  await fc.assert(
    fc.asyncProperty(caseArb, async ({ callerCount, lateCallers, outcome }) => {
      const { noradId } = outcome;

      // The Fetch_Function answers only after the test opens the gate, so the request stays in flight
      // while the callers request N. `called` marks the instant at which the Fetch_Function is called.
      // The outcome is produced after the gate opens, so a synchronous throw of a scenario reaches the
      // engine as a rejection with the same value; Property 14 checks the classification itself.
      const gate = deferred();
      const called = deferred();
      const scenarioFetch = outcome.createFetch();
      const fetchFunction = recordingFetch((url, init) => {
        called.resolve();
        return gate.promise.then(() => scenarioFetch(url, init));
      });
      // Every case gets a new fetcher, so its cache is empty and the first caller starts the request.
      const fetcher = createTleFetcher({ fetch: fetchFunction });

      const callers: Promise<TleRecord>[] = [];
      for (let i = 0; i < callerCount - lateCallers; i++) {
        callers.push(fetcher.fetchTle(noradId));
      }
      await called.promise;
      for (let i = 0; i < lateCallers; i++) {
        callers.push(fetcher.fetchTle(noradId));
      }
      gate.resolve();
      const settled = await Promise.allSettled(callers);

      // The Fetch_Function was called exactly once, for the k callers together.
      expect(fetchFunction.calls).toHaveLength(1);

      // All k callers received the outcome of that request: one TleRecord object or one EngineError object.
      const expectedStatus = outcome.succeeds ? 'fulfilled' : 'rejected';
      expect(settled.map((result) => result.status)).toEqual(
        Array.from({ length: callerCount }, () => expectedStatus),
      );
      const answers: unknown[] = settled.map((result) => (result.status === 'fulfilled' ? result.value : result.reason));
      for (const answer of answers) {
        expect(answer).toBe(answers[0]);
      }

      if (!outcome.succeeds) {
        expect(answers[0]).toBeInstanceOf(EngineError);

        // The error ended the In_Flight_Request and stored no entry, so the next request for N calls the
        // Fetch_Function again. The gate is open, so that request ends without further waiting.
        await fetcher.fetchTle(noradId).catch(() => undefined);
        expect(fetchFunction.calls).toHaveLength(2);
      }
    }),
    { numRuns: NUM_RUNS },
  );
});
