// Property 17 of design.md (Correctness Properties): Coarse_Scan instants.
//
// For any integers S ≤ E with E − S ≤ 168 h, `coarseScanInstants(S, E)` returns S, then S + k·60 000 for
// every k ≥ 1 with S + k·60 000 < E, then E when E > S; the list is strictly increasing and has no other
// element.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { coarseScanInstants } from '../../src/lib/orbit/refine';

// "Property test settings" of design.md (D20, D21): Property 17 is a pure property, so it runs 200 cases
// with the default test timeout of 5 000 ms, and the test sets no timeout.
const NUM_RUNS = 200;

/** The Coarse_Scan step of Requirement 10, criterion 1 (60 s), written out here instead of read from the engine. */
const STEP_MS = 60_000;

/** The longest scan of the property, E − S ≤ 168 h, in ms. It holds 10 080 steps. */
const MAX_LENGTH_MS = 168 * 3_600_000;

/** Largest absolute UTC_Instant: the ECMAScript Date range in ms (Requirement 2, criterion 9). */
const MAX_INSTANT_MS = 8.64e15;

/** S: any integer instant for which S + 168 h is still a UTC_Instant, so every sum in the test is exact. */
const startArb = fc.integer({ min: -MAX_INSTANT_MS, max: MAX_INSTANT_MS - MAX_LENGTH_MS });

/** E − S on or next to a multiple of the step (k·60 000 − 1, k·60 000, k·60 000 + 1), kept within [0, 168 h]. */
const nearStepLengthArb = fc
  .tuple(fc.integer({ min: 0, max: MAX_LENGTH_MS / STEP_MS }), fc.constantFrom(-1, 0, 1))
  .map(([steps, offset]) => Math.min(MAX_LENGTH_MS, Math.max(0, steps * STEP_MS + offset)));

/**
 * E − S: any integer from 0 to 168 h. Half of the draws lie on or next to a multiple of the step, where the
 * test "< E" and the final E meet. A uniform draw would hit such a length once in 60 000 cases.
 */
const lengthArb = fc.oneof(fc.integer({ min: 0, max: MAX_LENGTH_MS }), nearStepLengthArb);

/**
 * Lengths that fast-check always runs first (here at S = 2026-11-09T00:00:00Z): E = S, a length below one
 * step, E on the first grid point, E just past it, and 168 h.
 */
const START_2026_MS = Date.UTC(2026, 10, 9);
const BOUNDARY_EXAMPLES: [startMs: number, lengthMs: number][] = [
  [START_2026_MS, 0],
  [START_2026_MS, 1],
  [START_2026_MS, STEP_MS],
  [START_2026_MS, STEP_MS + 1],
  [START_2026_MS, MAX_LENGTH_MS],
];

// Feature: orbit-engine, Property 17: Coarse_Scan instants
// **Validates: Requirements 10.1**
it('Property 17: Coarse_Scan instants', () => {
  fc.assert(
    fc.property(startArb, lengthArb, (startMs, lengthMs) => {
      const endMs = startMs + lengthMs;
      const instants = coarseScanInstants(startMs, endMs);

      // The list starts with S and is strictly increasing. A list holds up to 10 081 instants, so the scans
      // use findIndex (-1 means no violation) instead of one `expect` per element.
      expect(instants[0]).toBe(startMs);
      expect(instants.findIndex((t, i) => i > 0 && t <= instants[i - 1])).toBe(-1);

      // E = S: S is the only element.
      if (lengthMs === 0) {
        expect(instants).toStrictEqual([startMs]);
        return;
      }

      // E > S: the last element is E ...
      const last = instants.length - 1;
      expect(instants[last]).toBe(endMs);
      // ... the elements between S and E are S + k·60 000 for k = 1, 2, … in sequence (each one is below E,
      // because the list is strictly increasing up to E) ...
      expect(instants.findIndex((t, k) => k > 0 && k < last && t !== startMs + k * STEP_MS)).toBe(-1);
      // ... and no grid point below E is missing: the next one after the last grid point listed is not below E.
      expect(startMs + last * STEP_MS).toBeGreaterThanOrEqual(endMs);
    }),
    { numRuns: NUM_RUNS, examples: BOUNDARY_EXAMPLES },
  );
});
