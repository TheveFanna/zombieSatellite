// Property 10: Azimuth normalisation (design.md, Correctness Properties).
//
// For any finite number `x`, `normalizeAzimuthDeg(x)` lies in [0, 360) and is not −0; for any `x` in
// [0, 360) it returns `x` unchanged; for any such `x` and integer `k` from −4 to 4,
// `normalizeAzimuthDeg(x + 360k)` is within 10⁻⁹° of `x` in circular distance; and
// `normalizeAzimuthDeg(360)` and `normalizeAzimuthDeg(radToDeg(2π))` are exactly +0.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { radToDeg } from '../../src/lib/orbit/constants';
import { normalizeAzimuthDeg } from '../../src/lib/orbit/index';

// "Property test settings" of design.md (D20, D21): Property 10 is a pure property, so it runs 200 cases
// with the default test timeout of 5 000 ms, and the test sets no timeout.
const NUM_RUNS = 200;

/** The circular-distance bound of the third clause, in degrees. */
const CIRCULAR_TOLERANCE_DEG = 1e-9;

/** The difference between two angles in degrees along the shorter way round the circle; 0° and 360° differ by 0. */
function circularDifferenceDeg(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

/** The first clause: the value lies in [0, 360) and is not −0. NaN fails the range checks. */
function expectInRangeAndNotNegativeZero(value: number): void {
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThan(360);
  // `toBe` compares with Object.is, so `not.toBe(-0)` fails for −0 and passes for +0.
  expect(value).not.toBe(-0);
}

/** Every finite number: all magnitudes from the subnormals to ±Number.MAX_VALUE, and ±0. */
const finiteArb = fc.double({ noNaN: true, noDefaultInfinity: true });

/**
 * Every x in [0, 360). `fc.double` spreads its values over the exponents, so it yields mostly tiny
 * values (and +0 and 359.99999999999994 as range ends; −0 lies below `min: 0` and is not generated).
 * The second branch adds evenly spread values such as 100.1.
 */
const inRangeArb = fc.oneof(
  fc.double({ min: 0, max: 360, maxExcluded: true, noNaN: true }),
  fc.integer({ min: 0, max: 359_999 }).map((milliDegrees) => milliDegrees / 1_000),
);

// Feature: orbit-engine, Property 10: Azimuth normalisation
// **Validates: Requirements 7.8, 7.10**
it('Property 10: Azimuth normalisation', () => {
  fc.assert(
    fc.property(finiteArb, inRangeArb, fc.integer({ min: -4, max: 4 }), (finite, x, k) => {
      // For any finite number: the result lies in [0, 360) and is not −0.
      expectInRangeAndNotNegativeZero(normalizeAzimuthDeg(finite));

      // For any x in [0, 360): the result is x itself.
      expect(normalizeAzimuthDeg(x)).toBe(x);

      // For any such x and integer k from −4 to 4: x + 360k maps back to x in circular distance, up to
      // the rounding of the sum. x + 360k is a finite number, so the first clause applies to it too.
      const shifted = normalizeAzimuthDeg(x + 360 * k);
      expectInRangeAndNotNegativeZero(shifted);
      expect(circularDifferenceDeg(shifted, x)).toBeLessThanOrEqual(CIRCULAR_TOLERANCE_DEG);
    }),
    { numRuns: NUM_RUNS },
  );

  // 360° and the 2π rad of C37 (radToDeg(2π) is exactly 360, D8) are exactly +0; `toBe` fails for −0.
  expect(normalizeAzimuthDeg(360)).toBe(0);
  expect(normalizeAzimuthDeg(radToDeg(2 * Math.PI))).toBe(0);
});
