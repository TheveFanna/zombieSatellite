// Property 19: Peak search on the integer grid (design.md, Correctness Properties).
//
// For any integers a < b with b − a ≤ 600 000 and for any strictly unimodal score function on [a, b] with its
// maximum at x* (generated from shifted and scaled bell, parabola and absolute-value shapes, including x* = a and
// x* = b), the argmax t̂ over the instants returned by `maximizeOnGrid` satisfies |t̂ − x*| ≤ 100; every returned
// instant is an integer in [a, b]; both a and b are returned; and t̂ = x* exactly when x* is a bracket end.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { maximizeOnGrid } from '../../src/lib/orbit/refine';
import { unimodalArb } from '../helpers/arbitraries';

// "Property test settings" of design.md (D20, D21): Property 19 is a pure property, so it runs 200 cases
// with the default test timeout of 5 000 ms, and the test sets no timeout.
const NUM_RUNS = 200;

/** The bound of the first clause: the Peak_Instant is bracketed within 0.1 s (Requirement 10, criterion 3). */
const PEAK_TOLERANCE_MS = 100;

/** The argmax t̂ of `score` over `instants`: the instant with the highest score, the earliest one on ties (D15). */
function argmax(instants: readonly number[], score: (t: number) => number): number {
  let best = instants[0];
  let bestScore = score(best);
  for (const t of instants) {
    const value = score(t);
    if (value > bestScore || (value === bestScore && t < best)) {
      best = t;
      bestScore = value;
    }
  }
  return best;
}

// Feature: orbit-engine, Property 19: Peak search on the integer grid
// **Validates: Requirements 10.3, 11.5**
it('Property 19: Peak search on the integer grid', () => {
  fc.assert(
    fc.property(unimodalArb, ({ a, b, xStar, score }) => {
      const evaluated = maximizeOnGrid(score, a, b);

      // Every returned instant is an integer in [a, b]: the list of instants that are not is empty.
      expect(evaluated.filter((t) => !Number.isInteger(t) || t < a || t > b)).toEqual([]);

      // Both a and b are returned.
      expect(evaluated).toContain(a);
      expect(evaluated).toContain(b);

      // The argmax t̂ over the returned instants is within 100 ms of x* ...
      const tHat = argmax(evaluated, score);
      expect(Math.abs(tHat - xStar)).toBeLessThanOrEqual(PEAK_TOLERANCE_MS);

      // ... and it is x* itself, not only within 100 ms of it, when x* is a bracket end. This clause is read in
      // that direction: an x* inside the bracket can be found exactly as well, for example as the start point.
      if (xStar === a || xStar === b) {
        expect(tHat).toBe(xStar);
      }
    }),
    { numRuns: NUM_RUNS },
  );
});
