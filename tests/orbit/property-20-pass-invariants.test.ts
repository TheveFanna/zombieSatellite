// Property 20 of design.md (Correctness Properties): Pass list invariants.
//
// For any baseline TleRecord, for any Observer (latitude in [−90°, 90°], longitude in [−180°, 180°], altitude
// 0–3 km), for any integer window start S from 2026-11-08T00:00:00Z to 2026-11-11T00:00:00Z, for any duration in
// (0, 48] hours with E = S + round(duration × 3 600 000), and for any Min_Elevation in [−90°, 90°], every Pass of
// `predictPasses` has integer `riseMs`, `peakMs`, `setMs` with S ≤ rise ≤ peak ≤ set ≤ E,
// `durationMin === (set − rise) / 60 000`, `maxElevationDeg === elev(peak)` and `maxElevationDeg > minElevationDeg`,
// and `maxElevationDeg ≥ elev(c)` for every Coarse_Scan instant c in [rise, set] with non-null elev(c); Passes are in
// ascending order with each `setMs` strictly before the next `riseMs`; elev(S) > Min_Elevation holds if and only if
// the list is non-empty and its first Pass has `startTruncated` true and `riseMs = S`, and no other Pass has
// `startTruncated` true; elev(E) > Min_Elevation holds if and only if the list is non-empty and its last Pass has
// `endTruncated` true and `setMs = E`, and no other Pass has `endTruncated` true; if every Coarse_Scan instant is
// above Min_Elevation the list is the single Pass [S, E] with both flags true; for every Pass with `startTruncated`
// false, elev(rise) > Min_Elevation and elev(rise − 1000) is null or ≤ Min_Elevation; for every Pass with
// `endTruncated` false, elev(set) is null or ≤ Min_Elevation and elev(max(rise, set − 1000)) > Min_Elevation.
//
// elev(t) is the `elevationDeg` that `observeAt` returns at t, or null for a propagation-failure result.
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { createSatrec, observeAt, parseTle, predictPasses } from '../../src/lib/orbit/index';
import { instantArb, observerArb } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 20 runs the Pass_Predictor, so it runs 100 cases with a
// timeout of 60 000 ms.
const NUM_RUNS = 100;
const TIMEOUT_MS = 60_000;

const MS_PER_HOUR = 3_600_000;

/** The Coarse_Scan step of Requirement 10, criterion 1 (60 s), and the minute of `durationMin`, written out here. */
const COARSE_STEP_MS = 60_000;

/** The width of the final crossing bracket of Requirement 10, criterion 2 (1 s). */
const CROSSING_BRACKET_MS = 1_000;

/** The domain of S: 2026-11-08T00:00:00Z to 2026-11-11T00:00:00Z. */
const WINDOW_START_MIN_MS = Date.parse('2026-11-08T00:00:00Z');
const WINDOW_START_MAX_MS = Date.parse('2026-11-11T00:00:00Z');

/** The longest duration of the domain, 48 h, in ms. */
const MAX_DURATION_MS = 48 * MS_PER_HOUR;

/**
 * A duration in (0, 48] hours. `fc.double` spreads its draws over the exponents of the doubles, so nearly every draw
 * would be tiny and give E = S. Durations are therefore drawn as whole ms. Most draws cover all of (0, 48] h; some
 * are windows of at most 5 min, where the Coarse_Scan has a few samples; and 10⁻⁹ h rounds to 0 ms, so E = S and the
 * Coarse_Scan is the single sample S.
 */
const durationHoursArb: fc.Arbitrary<number> = fc.oneof(
  { weight: 6, arbitrary: fc.integer({ min: 1, max: MAX_DURATION_MS }).map((ms) => ms / MS_PER_HOUR) },
  { weight: 2, arbitrary: fc.integer({ min: 1, max: 5 * COARSE_STEP_MS }).map((ms) => ms / MS_PER_HOUR) },
  { weight: 1, arbitrary: fc.constant(1e-9) },
);

/** Min_Elevation in [−90°, 90°], uniform in steps of 10⁻⁵° (`fc.double` is dense near zero, see above). */
const minElevationArb: fc.Arbitrary<number> = fc
  .integer({ min: -9_000_000, max: 9_000_000 })
  .map((units) => units / 100_000);

const cases = fc.record({
  baseline: fc.constantFrom(ISS_BASELINE, ZHTW_BASELINE),
  observer: observerArb({ altitudeKm: { min: 0, max: 3 } }),
  startMs: instantArb(WINDOW_START_MIN_MS, WINDOW_START_MAX_MS),
  durationHours: durationHoursArb,
  minElevationDeg: minElevationArb,
});

/** The Coarse_Scan instants: S, S + k·60 s for every k ≥ 1 that lies before E, and E when E > S. */
function coarseScanOf(startMs: number, endMs: number): number[] {
  const instants = [startMs];
  for (let t = startMs + COARSE_STEP_MS; t < endMs; t += COARSE_STEP_MS) instants.push(t);
  if (endMs > startMs) instants.push(endMs);
  return instants;
}

// Feature: orbit-engine, Property 20: Pass list invariants
// **Validates: Requirements 2.8, 9.4, 9.5, 9.6, 9.7, 9.13, 10.2, 10.8, 10.11, 11.1, 11.2, 11.3, 11.4, 11.6, 12.5, 12.6, 12.7**
it(
  'Property 20: Pass list invariants',
  () => {
    fc.assert(
      fc.property(cases, ({ baseline, observer, startMs, durationHours, minElevationDeg }) => {
        const tle = parseTle(baseline.text);
        const satrec = createSatrec(tle);
        const endMs = startMs + Math.round(durationHours * MS_PER_HOUR);
        const passes = predictPasses({ observer, tle, start: startMs, durationHours, minElevationDeg });

        // elev(t), memoised per case.
        const elevations = new Map<number, number | null>();
        const elev = (timeMs: number): number | null => {
          let value = elevations.get(timeMs);
          if (value === undefined) {
            const observation = observeAt(satrec, timeMs, observer);
            value = observation.ok ? observation.lookAngles.elevationDeg : null;
            elevations.set(timeMs, value);
          }
          return value;
        };
        // Above Min_Elevation: strictly greater; a propagation failure is not above (Requirement 9, criterion 11).
        const isAbove = (timeMs: number): boolean => {
          const value = elev(timeMs);
          return value !== null && value > minElevationDeg;
        };

        const coarseScan = coarseScanOf(startMs, endMs);
        const windowLabel =
          `${baseline.name}, observer ${JSON.stringify(observer)}, S ${startMs}, E ${endMs}, ` +
          `Min_Elevation ${minElevationDeg}`;
        const listLabel = `${windowLabel}, passes ${JSON.stringify(passes)}`;

        passes.forEach((pass, index) => {
          const { riseMs, peakMs, setMs, maxElevationDeg } = pass;
          const label = `pass ${index} of ${passes.length}: ${JSON.stringify(pass)}; ${windowLabel}`;

          // Integer instants (Requirement 2, criterion 8), boolean flags (Requirement 9, criterion 4).
          expect([riseMs, peakMs, setMs].every(Number.isInteger), label).toBe(true);
          expect(typeof pass.startTruncated === 'boolean' && typeof pass.endTruncated === 'boolean', label).toBe(true);
          // S ≤ rise ≤ peak ≤ set ≤ E (Requirement 9, criterion 6).
          expect(startMs <= riseMs && riseMs <= peakMs && peakMs <= setMs && setMs <= endMs, label).toBe(true);
          expect(pass.durationMin, label).toBe((setMs - riseMs) / COARSE_STEP_MS);
          // The Maximum_Elevation is the Elevation at the Peak_Instant and above Min_Elevation (criteria 7 and 13).
          expect(maxElevationDeg, label).toBe(elev(peakMs));
          expect(maxElevationDeg > minElevationDeg, label).toBe(true);
          // No Coarse_Scan instant in [rise, set] has a higher Elevation (Requirement 10, criterion 8).
          const higherSamples = coarseScan.filter(
            (c) => c >= riseMs && c <= setMs && (elev(c) ?? Number.NEGATIVE_INFINITY) > maxElevationDeg,
          );
          expect(higherSamples, label).toStrictEqual([]);

          // A rise located by bisection is the first instant above, within 1 s of an instant not above
          // (Requirement 10, criteria 2 and 11; Requirement 12, criterion 5).
          if (pass.startTruncated === false) {
            expect(isAbove(riseMs), label).toBe(true);
            const before = elev(riseMs - CROSSING_BRACKET_MS);
            expect(before === null || before <= minElevationDeg, label).toBe(true);
          }
          // A set located by bisection is the first instant not above, and the Elevation 1 s before it (or at the
          // rise, if that is later) is above (Requirement 12, criterion 6).
          if (pass.endTruncated === false) {
            const atSet = elev(setMs);
            expect(atSet === null || atSet <= minElevationDeg, label).toBe(true);
            expect(isAbove(Math.max(riseMs, setMs - CROSSING_BRACKET_MS)), label).toBe(true);
          }
        });

        // Ascending order, with each Set_Instant strictly before the next Rise_Instant (Requirement 9, criterion 5).
        for (let index = 1; index < passes.length; index += 1) {
          const previous = passes[index - 1];
          const next = passes[index];
          expect(
            previous.riseMs < next.riseMs && previous.setMs < next.riseMs,
            `passes ${index - 1} and ${index}: ${listLabel}`,
          ).toBe(true);
        }

        // elev(S) > Min_Elevation iff the list is non-empty and its first Pass has startTruncated true and
        // riseMs = S; no other Pass has startTruncated true, so exactly one Pass is start-truncated when elev(S) is
        // above and none otherwise (Requirement 11, criteria 1 and 3).
        const aboveAtStart = isAbove(startMs);
        const firstPass = passes[0];
        const firstClippedAtStart =
          passes.length > 0 && firstPass.startTruncated === true && firstPass.riseMs === startMs;
        expect(firstClippedAtStart, listLabel).toBe(aboveAtStart);
        expect(passes.filter((pass) => pass.startTruncated).length, listLabel).toBe(aboveAtStart ? 1 : 0);

        // The same at the window end with the last Pass, endTruncated and setMs = E (criteria 2 and 4).
        const aboveAtEnd = isAbove(endMs);
        const lastPass = passes[passes.length - 1];
        const lastClippedAtEnd = passes.length > 0 && lastPass.endTruncated === true && lastPass.setMs === endMs;
        expect(lastClippedAtEnd, listLabel).toBe(aboveAtEnd);
        expect(passes.filter((pass) => pass.endTruncated).length, listLabel).toBe(aboveAtEnd ? 1 : 0);

        // Every Coarse_Scan instant above Min_Elevation: the single Pass [S, E] with both flags true (criterion 6).
        if (coarseScan.every(isAbove)) {
          const clipped = passes.map(({ riseMs, setMs, startTruncated, endTruncated }) => {
            return { riseMs, setMs, startTruncated, endTruncated };
          });
          expect(clipped, listLabel).toStrictEqual([
            { riseMs: startMs, setMs: endMs, startTruncated: true, endTruncated: true },
          ]);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
