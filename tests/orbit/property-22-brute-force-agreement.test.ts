// Property 22 of design.md (Correctness Properties): Agreement with the Brute_Force_Reference.
//
// For any Min_Elevation in [−90°, 90°], for each baseline TleRecord and for each Observer of the fixed set
// {Reference_Observer, (0°, 0°, 0 km), (−33.8688°, 151.2093°, 0 km)}, with window start 2026-11-09T00:00:00Z and
// duration 24 h: every Brute_Force_Pass whose peak elevation exceeds Min_Elevation by more than 0.1° is overlapped by
// a Pass on the closed interval from the Brute_Force_Reference sample before it (or the window start) to its set (or
// the window end); and every Pass that overlaps exactly one Brute_Force_Pass has, against that Brute_Force_Pass, a
// Rise_Instant within ±10 s unless start-truncated, a Set_Instant within ±10 s unless end-truncated, and a
// Maximum_Elevation within ±0.5°.
//
// A Pass that overlaps no Brute_Force_Pass, or more than one, is exempt from the second half (Requirement 10,
// criterion 12). The 1 s samples of the six satellite–Observer pairs are computed once in a `beforeAll` hook and
// reused for every generated Min_Elevation.
import fc from 'fast-check';
import { beforeAll, expect, it } from 'vitest';
import { createSatrec, parseTle, predictPasses } from '../../src/lib/orbit/index';
import type { Observer } from '../../src/lib/orbit/index';
import { ISS_BASELINE, REFERENCE_OBSERVER, ZHTW_BASELINE } from '../helpers/baseline';
import type { BaselineTle } from '../helpers/baseline';
import { bruteForcePasses, bruteForceSamples, passOverlaps } from '../helpers/brute-force';
import type { BruteForceSamples } from '../helpers/brute-force';

// "Property test settings" of design.md (D20, D21): Property 22 reuses Brute_Force_Reference samples and runs 100
// cases, each a generated Min_Elevation with a generated satellite and Observer from the fixed sets. The test and the
// `beforeAll` hook that computes the samples of the six pairs each have a timeout of 120 000 ms.
const NUM_RUNS = 100;
const TIMEOUT_MS = 120_000;
const HOOK_TIMEOUT_MS = 120_000;

const MS_PER_HOUR = 3_600_000;

/** The Search_Window: start 2026-11-09T00:00:00Z and duration 24 h; its end is the start plus the duration (D14). */
const WINDOW_START_MS = Date.parse('2026-11-09T00:00:00Z');
const DURATION_HOURS = 24;
const WINDOW_END_MS = WINDOW_START_MS + DURATION_HOURS * MS_PER_HOUR;

/** A Brute_Force_Pass must be found when its peak exceeds Min_Elevation by more than this (Requirement 12, criterion 3). */
const PEAK_MARGIN_DEG = 0.1;

/** The Rise_Instant and the Set_Instant agree within ±10 s (Requirement 10, criteria 5 and 6). */
const BOUNDARY_TOLERANCE_MS = 10_000;

/** The Maximum_Elevation agrees within ±0.5° (Requirement 10, criterion 7). */
const PEAK_TOLERANCE_DEG = 0.5;

/** An Observer of the fixed set, with the name that appears in failure reports. */
interface NamedObserver {
  readonly name: string;
  readonly observer: Observer;
}

/** The fixed set of Observers: the Reference_Observer, (0°, 0°, 0 km) and (−33.8688°, 151.2093°, 0 km). */
const OBSERVERS: readonly NamedObserver[] = [
  { name: 'Reference_Observer', observer: REFERENCE_OBSERVER },
  { name: '(0°, 0°, 0 km)', observer: { latitudeDeg: 0, longitudeDeg: 0, altitudeKm: 0 } },
  { name: '(-33.8688°, 151.2093°, 0 km)', observer: { latitudeDeg: -33.8688, longitudeDeg: 151.2093, altitudeKm: 0 } },
];

/** The fixed set of satellites: the two Baseline_TLE_Snapshots. */
const BASELINES: readonly BaselineTle[] = [ISS_BASELINE, ZHTW_BASELINE];

function pairName(baseline: BaselineTle, observer: NamedObserver): string {
  return `${baseline.name} over ${observer.name}`;
}

/**
 * The Brute_Force_Reference samples of each of the six satellite–Observer pairs over the Search_Window, by `pairName`.
 * They are kept outside the generated values so that a failure report does not print 86 401 samples.
 */
const samplesOfPair = new Map<string, BruteForceSamples>();

beforeAll(() => {
  for (const baseline of BASELINES) {
    const satrec = createSatrec(parseTle(baseline.text));
    for (const observer of OBSERVERS) {
      const samples = bruteForceSamples(satrec, observer.observer, WINDOW_START_MS, WINDOW_END_MS);
      samplesOfPair.set(pairName(baseline, observer), samples);
    }
  }
}, HOOK_TIMEOUT_MS);

/** Min_Elevation in [−90°, 90°], uniform in steps of 10⁻⁵° (`fc.double` is dense near zero). */
const minElevationArb: fc.Arbitrary<number> = fc
  .integer({ min: -9_000_000, max: 9_000_000 })
  .map((units) => units / 100_000);

const cases = fc.record({
  baseline: fc.constantFrom(...BASELINES),
  observer: fc.constantFrom(...OBSERVERS),
  minElevationDeg: minElevationArb,
});

// Feature: orbit-engine, Property 22: Agreement with the Brute_Force_Reference
// **Validates: Requirements 10.5, 10.6, 10.7, 10.12, 12.1, 12.2, 12.3**
it(
  'Property 22: Agreement with the Brute_Force_Reference',
  () => {
    fc.assert(
      fc.property(cases, ({ baseline, observer, minElevationDeg }) => {
        const pair = pairName(baseline, observer);
        const samples = samplesOfPair.get(pair);
        if (samples === undefined) throw new Error(`The beforeAll hook computed no samples for ${pair}.`);

        const passes = predictPasses({
          observer: observer.observer,
          tle: parseTle(baseline.text),
          start: WINDOW_START_MS,
          durationHours: DURATION_HOURS,
          minElevationDeg,
        });
        const bruteForce = bruteForcePasses(samples, minElevationDeg);
        const context = `${pair}, Min_Elevation ${minElevationDeg}, passes ${JSON.stringify(passes)}`;

        // Every Brute_Force_Pass whose peak exceeds Min_Elevation by more than 0.1° is overlapped by a Pass on the
        // closed interval from the sample before it (or the window start) to its set (or the window end).
        for (const bruteForcePass of bruteForce) {
          if (!(bruteForcePass.peakDeg - minElevationDeg > PEAK_MARGIN_DEG)) continue;
          const fromMs = bruteForcePass.beforeMs ?? WINDOW_START_MS;
          const toMs = bruteForcePass.setMs ?? WINDOW_END_MS;
          const found = passes.some((pass) => pass.riseMs <= toMs && pass.setMs >= fromMs);
          const label = `no Pass overlaps [${fromMs}, ${toMs}] of the Brute_Force_Pass ${JSON.stringify(bruteForcePass)}`;
          expect(found, `${label}; ${context}`).toBe(true);
        }

        // Every Pass that overlaps exactly one Brute_Force_Pass agrees with it; any other Pass is exempt.
        for (const pass of passes) {
          const overlapped = bruteForce.filter((bruteForcePass) => passOverlaps(pass, bruteForcePass));
          if (overlapped.length !== 1) continue;
          const [reference] = overlapped;
          const label = `Pass ${JSON.stringify(pass)} against the Brute_Force_Pass ${JSON.stringify(reference)}`;

          if (!pass.startTruncated) {
            expect(Math.abs(pass.riseMs - reference.riseMs), `${label}; ${context}`).toBeLessThanOrEqual(
              BOUNDARY_TOLERANCE_MS,
            );
          }
          if (!pass.endTruncated) {
            // A Brute_Force_Pass that runs to the window end has no set, so a Pass that is not end-truncated cannot
            // agree with it.
            const setDifferenceMs =
              reference.setMs === null ? Number.POSITIVE_INFINITY : Math.abs(pass.setMs - reference.setMs);
            expect(setDifferenceMs, `${label}; ${context}`).toBeLessThanOrEqual(BOUNDARY_TOLERANCE_MS);
          }
          expect(Math.abs(pass.maxElevationDeg - reference.peakDeg), `${label}; ${context}`).toBeLessThanOrEqual(
            PEAK_TOLERANCE_DEG,
          );
        }
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
