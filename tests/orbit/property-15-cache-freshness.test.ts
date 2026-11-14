// Property 15 of design.md (Correctness Properties): Cache freshness follows Entry_Age.
//
// For any Cache_Clock reading T₀ at which a request for N ends in a TleRecord and for any integer offset
// Δ from −3·TTL to +3·TTL (TTL − 1 and TTL always included), a second request for N with the Cache_Clock
// at T₀ + Δ calls the Fetch_Function if and only if Δ ≥ TTL; when it does not, it returns the stored
// record itself.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { TLE_CACHE_TTL_MS, createTleFetcher } from '../../src/lib/orbit/index';
import { createMockCelestrakFetch } from '../helpers/mock-celestrak';

// "Property test settings" of design.md (D20, D21): Property 15 is a mocked property, so it runs 200
// cases and keeps the Vitest default timeout of 5 000 ms.
const NUM_RUNS = 200;

const TTL_MS = TLE_CACHE_TTL_MS;

/** N: the NORAD catalog number of the ISS, whose TLE the Mock_CelesTrak_Fetch answers with. */
const NORAD_ID = 25544;

/** Largest absolute UTC_Instant: the ECMAScript Date range in ms (Requirement 2, criterion 9). */
const MAX_INSTANT_MS = 8.64e15;

/** T₀: any Cache_Clock reading for which T₀ + Δ stays a valid UTC_Instant at every offset Δ. */
const t0Arb = fc.integer({ min: -MAX_INSTANT_MS + 3 * TTL_MS, max: MAX_INSTANT_MS - 3 * TTL_MS });

/** Δ: any integer offset from −3·TTL to +3·TTL, drawn together with the boundary offsets TTL − 1 and TTL. */
const deltaArb = fc.oneof(
  fc.constantFrom(TTL_MS - 1, TTL_MS),
  fc.integer({ min: -3 * TTL_MS, max: 3 * TTL_MS }),
);

/** The boundary offsets TTL − 1 and TTL, which fast-check always runs first (here at T₀ = 2026-11-09T00:00:00Z). */
const BOUNDARY_EXAMPLES: [t0: number, delta: number][] = [
  [Date.UTC(2026, 10, 9), TTL_MS - 1],
  [Date.UTC(2026, 10, 9), TTL_MS],
];

// Feature: orbit-engine, Property 15: Cache freshness follows Entry_Age
// **Validates: Requirements 5.3, 5.4, 5.8, 5.12**
it('Property 15: Cache freshness follows Entry_Age', async () => {
  await fc.assert(
    fc.asyncProperty(t0Arb, deltaArb, async (t0, delta) => {
      // The Cache_Clock is the `now` option (D11). A new fetcher starts with an empty cache.
      let nowMs = t0;
      const mock = createMockCelestrakFetch();
      const fetcher = createTleFetcher({ fetch: mock, now: () => nowMs });

      // The first request for N ends in a TleRecord at the Cache_Clock reading T₀.
      const stored = await fetcher.fetchTle(NORAD_ID);
      const callsBeforeSecondRequest = mock.calls.length;

      // The second request for N reads the Cache_Clock at T₀ + Δ.
      nowMs = t0 + delta;
      const answer = await fetcher.fetchTle(NORAD_ID);

      const calledFetchFunction = mock.calls.length > callsBeforeSecondRequest;
      expect(calledFetchFunction).toBe(delta >= TTL_MS);
      if (!calledFetchFunction) {
        expect(answer).toBe(stored);
      }
    }),
    { numRuns: NUM_RUNS, examples: BOUNDARY_EXAMPLES },
  );
});
