// Property 13: Invalid catalog numbers never reach the Fetch_Function (design.md, Correctness Properties).
//
// For any value that is not a `number` with an integer value from 1 to 99999 (0, negative integers,
// integers ≥ 100 000, fractional numbers, NaN, ±∞, numeric strings such as `"25544"`, bigints, `null`,
// `undefined`, objects), `fetchTle` rejects with an `EngineError` of category `invalid-input` and the
// Fetch_Function is never called.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { createTleFetcher, EngineError } from '../../src/lib/orbit/index';
import { invalidNoradArb } from '../helpers/arbitraries';
import { createMockCelestrakFetch } from '../helpers/mock-celestrak';

// "Property test settings" of design.md (D20, D21): Property 13 is a pure or mocked property, so it runs
// 200 cases with the default test timeout of 5 000 ms, and the test sets no timeout.
const NUM_RUNS = 200;

// Feature: orbit-engine, Property 13: Invalid catalog numbers never reach the Fetch_Function
// **Validates: Requirements 2.7, 3.7**
it('Property 13: Invalid catalog numbers never reach the Fetch_Function', async () => {
  await fc.assert(
    fc.asyncProperty(invalidNoradArb, async (noradId) => {
      // Every case gets a new fetcher and a new mock. The mock answers with the ISS TLE, so a request
      // that reached it would show up in `calls`. The built-in `fetch` is not involved.
      const mock = createMockCelestrakFetch();
      const fetcher = createTleFetcher({ fetch: mock });

      // `fetchTle` is declared for a number; the property passes values of every type.
      const pending = fetcher.fetchTle(noradId as number);

      await expect(pending).rejects.toBeInstanceOf(EngineError);
      await expect(pending).rejects.toHaveProperty('category', 'invalid-input');
      expect(mock.calls).toHaveLength(0);
    }),
    { numRuns: NUM_RUNS },
  );
});
