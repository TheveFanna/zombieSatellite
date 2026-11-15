// Property 23 of design.md (Correctness Properties): Window-shift stability.
//
// For any baseline TleRecord, Observer (latitude in [−90°, 90°], longitude in [−180°, 180°], altitude 0 km), window
// start S from 2026-11-09T00:00:00Z to 2026-11-10T00:00:00Z, duration from 1 to 24 hours, Min_Elevation in
// [−90°, 90°] (biased toward [−10°, 60°]) and integer offset δ with −60 000 < δ < 60 000 ms, every Pass of either run
// (start S or S + δ) whose rise and set lie inside both Search_Windows, that is neither start- nor end-truncated, and
// that overlaps no truncated Pass of the other run, has exactly one Pass in the other run with rise and set within
// ±10 s and Maximum_Elevation within ±0.5°.
//
// A Pass whose peak lies within about 1e-5° of Min_Elevation can make the two runs disagree about that one Pass. The
// design lists this as a known limitation, and a failure is reported with the seed that fast-check prints.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { parseTle, predictPasses } from '../../src/lib/orbit/index';
import type { Pass } from '../../src/lib/orbit/index';
import { instantArb, observerArb } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 23 runs the Pass_Predictor, so it runs 100 cases with a
// timeout of 60 000 ms. Requirement 14, criterion 7 asks for at least 100 cases and the seed of a failing run, which
// fast-check reports by default.
const NUM_RUNS = 100;
const TIMEOUT_MS = 60_000;

const MS_PER_HOUR = 3_600_000;

/** The match tolerances of Requirement 12, criterion 4: ±10 s for the Rise_Instant and the Set_Instant, ±0.5° for the Maximum_Elevation. */
const TIME_TOLERANCE_MS = 10_000;
const ELEVATION_TOLERANCE_DEG = 0.5;

/** The domain of S: 2026-11-09T00:00:00Z to 2026-11-10T00:00:00Z. */
const WINDOW_START_FROM_MS = Date.parse('2026-11-09T00:00:00Z');
const WINDOW_START_TO_MS = Date.parse('2026-11-10T00:00:00Z');

/** δ is an integer with −60 000 < δ < 60 000 ms, so its largest magnitude is 59 999 ms. */
const MAX_OFFSET_MS = 59_999;

/** A duration from 1 to 24 hours, drawn as whole ms. */
const durationHoursArb: fc.Arbitrary<number> = fc
  .integer({ min: 1 * MS_PER_HOUR, max: 24 * MS_PER_HOUR })
  .map((ms) => ms / MS_PER_HOUR);

/**
 * Min_Elevation in [−90°, 90°] in steps of 10⁻⁶°, biased toward [−10°, 60°]: three draws in four come from that range.
 * The values are drawn as integers, because `fc.double` is dense near zero and would hardly leave Min_Elevation 0°.
 */
const minElevationArb: fc.Arbitrary<number> = fc.oneof(
  { weight: 3, arbitrary: fc.integer({ min: -10_000_000, max: 60_000_000 }).map((units) => units / 1_000_000) },
  { weight: 1, arbitrary: fc.integer({ min: -90_000_000, max: 90_000_000 }).map((units) => units / 1_000_000) },
);

const cases = fc.record({
  baseline: fc.constantFrom(ISS_BASELINE, ZHTW_BASELINE),
  observer: observerArb({ altitudeKm: 0 }),
  startMs: instantArb(WINDOW_START_FROM_MS, WINDOW_START_TO_MS),
  durationHours: durationHoursArb,
  minElevationDeg: minElevationArb,
  offsetMs: fc.integer({ min: -MAX_OFFSET_MS, max: MAX_OFFSET_MS }),
});

/** A Pass is truncated when it is start-truncated or end-truncated. */
function isTruncated(pass: Pass): boolean {
  return pass.startTruncated || pass.endTruncated;
}

/** Two Passes overlap when their closed intervals [riseMs, setMs] share an instant. */
function overlaps(a: Pass, b: Pass): boolean {
  return a.riseMs <= b.setMs && b.riseMs <= a.setMs;
}

/** `candidate` matches `pass` when Rise_Instant and Set_Instant are each within ±10 s and Maximum_Elevation within ±0.5°. */
function matches(pass: Pass, candidate: Pass): boolean {
  return (
    Math.abs(candidate.riseMs - pass.riseMs) <= TIME_TOLERANCE_MS &&
    Math.abs(candidate.setMs - pass.setMs) <= TIME_TOLERANCE_MS &&
    Math.abs(candidate.maxElevationDeg - pass.maxElevationDeg) <= ELEVATION_TOLERANCE_DEG
  );
}

// Feature: orbit-engine, Property 23: Window-shift stability
// **Validates: Requirements 12.4, 14.7**
it(
  'Property 23: Window-shift stability',
  () => {
    fc.assert(
      fc.property(cases, ({ baseline, observer, startMs, durationHours, minElevationDeg, offsetMs }) => {
        const tle = parseTle(baseline.text);
        const search = (start: number): Pass[] =>
          predictPasses({ observer, tle, start, durationHours, minElevationDeg });
        const firstRun = search(startMs);
        const shiftedRun = search(startMs + offsetMs);

        // The Search_Windows are [S, S + w] and [S + δ, S + δ + w] with the same width w (D14); they intersect in
        // [S + max(0, δ), S + w + min(0, δ)].
        const windowMs = Math.round(durationHours * MS_PER_HOUR);
        const intersectionStartMs = startMs + Math.max(0, offsetMs);
        const intersectionEndMs = startMs + windowMs + Math.min(0, offsetMs);
        const caseLabel =
          `${baseline.name}, observer ${JSON.stringify(observer)}, S ${startMs}, δ ${offsetMs}, ` +
          `duration ${durationHours} h, Min_Elevation ${minElevationDeg}`;

        const checkRun = (runName: string, own: readonly Pass[], other: readonly Pass[]): void => {
          for (const pass of own) {
            const insideBothWindows = pass.riseMs >= intersectionStartMs && pass.setMs <= intersectionEndMs;
            const overlapsTruncatedPass = other.some((candidate) => isTruncated(candidate) && overlaps(pass, candidate));
            if (!insideBothWindows || isTruncated(pass) || overlapsTruncatedPass) continue;

            const matching = other.filter((candidate) => matches(pass, candidate));
            expect(
              matching,
              `${runName} pass ${JSON.stringify(pass)} needs exactly one match among ${JSON.stringify(other)}; ${caseLabel}`,
            ).toHaveLength(1);
          }
        };
        checkRun('first-run (start S)', firstRun, shiftedRun);
        checkRun('shifted-run (start S + δ)', shiftedRun, firstRun);
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
