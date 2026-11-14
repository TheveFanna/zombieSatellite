// Refinement primitives of the Pass_Predictor (design.md, "Refinement primitives"; Requirements 10 and 12).
// Pure numeric code on integer instants, in whole milliseconds since 1970-01-01T00:00:00Z. The functions
// evaluate only the predicate or score function that the caller supplies. Internal: not exported from index.ts.
import { COARSE_STEP_MS, CROSSING_BRACKET_MS, PEAK_BRACKET_MS } from './constants';

/**
 * Brent's golden-section fraction (3 - sqrt 5) / 2 to six digits, as in design.md. It places the first point of the
 * peak search inside its bracket and sets the length of a golden-section step as a fraction of the larger part.
 */
const GOLDEN_SECTION_RATIO = 0.381966;

/**
 * Internal, not exported from index.ts. The Coarse_Scan instants of Requirement 10, criterion 1, for integer
 * `startMs <= endMs`: `startMs`, then `startMs + k * 60 000` for every integer k >= 1 that lies before `endMs`, then
 * `endMs` when `endMs > startMs`. The list is strictly increasing, and `startMs === endMs` gives `[startMs]`.
 */
export function coarseScanInstants(startMs: number, endMs: number): number[] {
  const instants: number[] = [startMs];
  for (let k = 1; startMs + k * COARSE_STEP_MS < endMs; k += 1) {
    instants.push(startMs + k * COARSE_STEP_MS);
  }
  if (endMs > startMs) instants.push(endMs);
  return instants;
}

/**
 * Internal, not exported from index.ts. Bisection of a crossing between the integer instants `lo < hi` with
 * `isAbove(lo) !== isAbove(hi)` (Requirement 10, criterion 2; Requirement 12, criteria 5 and 6). While the bracket is
 * wider than 1000 ms, the integer midpoint `lo + Math.floor((hi - lo) / 2)` replaces the end on its own side of the
 * crossing, so every evaluated instant is an integer in [lo, hi] and the final bracket is at most 1 s wide (D13).
 * Returns the later end of the final bracket (D16, Requirement 10, criterion 11): for a rise the first instant known
 * to be above, for a set the first instant known not to be above. A bracket of at most 1000 ms is returned as `hi`
 * without any evaluation.
 */
export function bisectCrossing(isAbove: (t: number) => boolean, lo: number, hi: number): number {
  let low = lo;
  let high = hi;
  while (high - low > CROSSING_BRACKET_MS) {
    const mid = low + Math.floor((high - low) / 2);
    if (isAbove(mid) === isAbove(low)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return high;
}

/**
 * Internal, not exported from index.ts. Maximises `score` on the integer instants of [a, b] with Brent's method for a
 * maximum (successive parabolic interpolation safeguarded by golden-section steps; Requirement 10, criterion 3) and
 * returns every instant it evaluated, so that the caller can take the argmax over all of them (D15). The list is in
 * evaluation order: `a`, then `b` (once when `a === b`), then the start point, then one trial point per iteration. An
 * instant can appear twice. For integer `a`, `b` and `x0`, every returned instant is an integer in [a, b].
 *
 * The start point is `x0` when `a < x0 < b`, otherwise the golden-section point of the bracket; it is evaluated
 * whenever an integer lies strictly inside (a, b), that is when `b - a >= 2`. The search stops when the bracket is at
 * most 100 ms wide; the bracket then contains Brent's best point. A score that is not finite (a propagation failure is
 * -Infinity) never takes part in a parabolic step.
 */
export function maximizeOnGrid(
  score: (t: number) => number,
  a: number,
  b: number,
  x0?: number,
): readonly number[] {
  const evaluated: number[] = [];
  const evaluate = (t: number): number => {
    evaluated.push(t);
    return score(t);
  };

  // Both ends are always candidates (D15).
  evaluate(a);
  if (b !== a) evaluate(b);
  // No integer lies strictly inside (a, b), so there is nothing to search.
  if (b - a < 2) return evaluated;

  // Brent's state for a maximum. The bracket [lo, hi] starts as [a, b]; x is the best point so far, w the second best
  // and v the previous w; d is the last step and e the step before last. For b - a >= 2 the rounded golden-section
  // point is strictly inside (a, b).
  let lo = a;
  let hi = b;
  let x = x0 !== undefined && x0 > lo && x0 < hi ? x0 : lo + Math.round(GOLDEN_SECTION_RATIO * (hi - lo));
  let fx = evaluate(x);
  let w = x;
  let fw = fx;
  let v = x;
  let fv = fx;
  let d = 0;
  let e = 0;

  while (hi - lo > PEAK_BRACKET_MS) {
    // Vertex of the parabola through (x, fx), (w, fw) and (v, fv), as a distance from x. It exists only for three
    // distinct points with finite scores. A degenerate parabola gives NaN or an infinite step, and both fail the
    // acceptance test below.
    let parabolicStep = Number.NaN;
    if (x !== w && x !== v && w !== v && Number.isFinite(fx) && Number.isFinite(fw) && Number.isFinite(fv)) {
      const r = (x - w) * (fx - fv);
      const q = (x - v) * (fx - fw);
      parabolicStep = -((x - v) * q - (x - w) * r) / (2 * (q - r));
    }

    // Brent's acceptance test: the vertex lies strictly inside the bracket and the step is less than half the step
    // before last. With e = 0 at the start, the first step is always a golden-section step.
    let step: number;
    if (Math.abs(parabolicStep) < Math.abs(e) / 2 && x + parabolicStep > lo && x + parabolicStep < hi) {
      e = d;
      step = parabolicStep;
    } else {
      // Golden-section step into the larger part of the bracket.
      e = x < (lo + hi) / 2 ? hi - x : lo - x;
      step = GOLDEN_SECTION_RATIO * e;
    }

    // Round to the integer grid; "+ 0" turns -0 into +0. A point equal to x or not strictly inside the bracket is
    // replaced by x + 1 or x - 1, preferring the step direction. One of them is strictly inside, because x is
    // strictly inside and hi - lo > 100.
    let u = Math.round(x + step) + 0;
    if (u === x || u <= lo || u >= hi) {
      const direction = step < 0 ? -1 : 1;
      u = x + direction;
      if (u <= lo || u >= hi) u = x - direction;
    }
    d = u - x;

    const fu = evaluate(u);
    if (fu >= fx) {
      // u is at least as good as x: the bracket shrinks to the side of x that contains u, and u becomes x.
      if (u < x) {
        hi = x;
      } else {
        lo = x;
      }
      v = w;
      fv = fw;
      w = x;
      fw = fx;
      x = u;
      fx = fu;
    } else {
      // u is worse than x: it replaces the bracket end on its own side.
      if (u < x) {
        lo = u;
      } else {
        hi = u;
      }
      if (fu >= fw || w === x) {
        v = w;
        fv = fw;
        w = u;
        fw = fu;
      } else if (fu >= fv || v === x || v === w) {
        v = u;
        fv = fu;
      }
    }
  }

  return evaluated;
}
