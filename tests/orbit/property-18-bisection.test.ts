// Property 18: Crossing bisection (design.md, Correctness Properties).
//
// For any integers lo < hi and for any crossing instant x with lo < x ≤ hi, `bisectCrossing` applied to the
// rising predicate `t ≥ x` or to the setting predicate `t < x` evaluates only integer instants in [lo, hi] and
// returns r with x ≤ r < x + 1000, so the returned instant is the later end of a final bracket at most 1 s wide.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { bisectCrossing } from '../../src/lib/orbit/refine';

// "Property test settings" of design.md (D20, D21): Property 18 is a pure property, so it runs 200 cases
// with the default test timeout of 5 000 ms, and the test sets no timeout.
const NUM_RUNS = 200;

/** The bound on r − x in the property text: the final bracket is at most 1 s wide (Requirement 10, criterion 2). */
const FINAL_BRACKET_MS = 1_000;

/** The instant range of the engine in whole ms: an absolute value of at most 8.64 × 10¹⁵ (D3). */
const MAX_INSTANT_MS = 8.64e15;

/** The widest bracket generated, 2⁴¹ ms (about 70 years), far wider than a 168 h Search_Window. */
const MAX_WIDTH_MS = 2 ** 41;

/**
 * hi − lo in ms: up to 2.1 s, around the 1 000 ms stop of the bisection loop; up to two Coarse_Scan steps of
 * 60 000 ms, the scale of the brackets of the Pass_Predictor; or very wide.
 */
const widthArb = fc.oneof(
  fc.integer({ min: 1, max: 2_100 }),
  fc.integer({ min: 1, max: 120_000 }),
  fc.integer({ min: 1, max: MAX_WIDTH_MS }),
);

/**
 * Integers lo < x ≤ hi. lo lies anywhere in the instant range, negative or positive, and hi stays inside it. x is
 * 1 to `width` ms after lo, so x = hi is generated as well.
 */
const bracketArb = fc
  .record({
    lo: fc.integer({ min: -MAX_INSTANT_MS, max: MAX_INSTANT_MS - MAX_WIDTH_MS }),
    width: widthArb,
  })
  .chain(({ lo, width }) =>
    fc.integer({ min: 1, max: width }).map((lead) => ({ lo, x: lo + lead, hi: lo + width })),
  );

/**
 * Applies `bisectCrossing` to `isAbove` and checks the two clauses of the property: every instant that the
 * predicate is asked to evaluate is an integer in [lo, hi], and the result r satisfies x ≤ r < x + 1000.
 */
function expectBisection(
  label: string,
  isAbove: (t: number) => boolean,
  lo: number,
  hi: number,
  x: number,
): void {
  const evaluated: number[] = [];
  const r = bisectCrossing((t) => {
    evaluated.push(t);
    return isAbove(t);
  }, lo, hi);

  for (const t of evaluated) {
    expect(Number.isInteger(t), `${label}: evaluated ${t}, which is not an integer`).toBe(true);
    expect(t, `${label}: evaluated ${t}, below lo = ${lo}`).toBeGreaterThanOrEqual(lo);
    expect(t, `${label}: evaluated ${t}, above hi = ${hi}`).toBeLessThanOrEqual(hi);
  }
  expect(r, `${label}: returned ${r}, before x = ${x}`).toBeGreaterThanOrEqual(x);
  expect(r, `${label}: returned ${r}, ${FINAL_BRACKET_MS} ms or more after x = ${x}`).toBeLessThan(
    x + FINAL_BRACKET_MS,
  );
}

// Feature: orbit-engine, Property 18: Crossing bisection
// **Validates: Requirements 10.2, 10.11, 12.5, 12.6**
it('Property 18: Crossing bisection', () => {
  fc.assert(
    fc.property(bracketArb, ({ lo, x, hi }) => {
      expectBisection('rising predicate t >= x', (t) => t >= x, lo, hi, x);
      expectBisection('setting predicate t < x', (t) => t < x, lo, hi, x);
    }),
    { numRuns: NUM_RUNS },
  );
});
