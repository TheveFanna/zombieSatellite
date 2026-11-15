// Pass baseline tests (design.md, Testing Strategy, pass-baselines.test.ts): one `it` for each of criteria 1 to 9 of
// Requirement 13, and one for Requirement 10, criterion 4. None of them is skipped, whether the Live_Test_Variable is
// set or unset (Requirement 13, criterion 10), and none reads the environment.
//
// Every expected number is the one the criterion states. The section 4.6 tables and the section 4.7 values of ISS pass
// 2 come from tests/helpers/baseline.ts, which copies them from docs/reference/TECHNICAL_ROUTE.md; nothing is
// recomputed here. Criterion 6 compares the Passes of the three runs (criteria 1, 5 and 7) with Brute_Force_References
// that the `beforeAll` hook computes with the Propagator (Requirement 14, criterion 6). That comparison also covers
// Requirement 10, criteria 5 to 7. The run of criterion 7 gives a Pass that only the refinement of Requirement 12,
// criteria 1 and 2 can produce, so criterion 7 covers those two criteria.
import { beforeAll, describe, expect, it } from 'vitest';
import { createSatrec, parseTle, predictPasses } from '../../src/lib/orbit/index';
import type { Pass, TleRecord } from '../../src/lib/orbit/index';
import {
  ISS_BASELINE,
  ISS_PASS_2_1S_REFERENCE,
  ISS_PASS_TABLE,
  REFERENCE_OBSERVER,
  ZHTW_BASELINE,
  ZHTW_PASS_TABLE,
} from '../helpers/baseline';
import { bruteForcePasses, bruteForceSamples, passOverlaps } from '../helpers/brute-force';
import type { BruteForcePass } from '../helpers/brute-force';

const MS_PER_HOUR = 3_600_000;

// Requirement 13, criteria 2 and 5: the section 4.6 times are 1-minute samples, so each true crossing lies at most 60 s
// before the listed time. The Rise_Instant and the Set_Instant may lie from 70 s before to 10 s after the listed time.
const TABLE_TOLERANCE_BEFORE_MS = 70_000;
const TABLE_TOLERANCE_AFTER_MS = 10_000;

// Requirement 10, criteria 5 and 6; Requirement 13, criteria 4 and 8: ±10 s.
const CROSSING_TOLERANCE_MS = 10_000;

// Requirement 10, criteria 4 and 7; Requirement 13, criteria 7 and 8: ±0.5°.
const PEAK_TOLERANCE_DEG = 0.5;

// Requirement 13, criterion 3: half of the 0.01° rounding step of the section 4.6 tables.
const TABLE_HALF_STEP_DEG = 0.005;

// Requirement 10, criterion 4 and Requirement 13, criterion 8: the peak elevations of ISS passes 2 and 6, as stated.
const ISS_PASS_2_PEAK_DEG = 48.61;
const ISS_PASS_6_PEAK_DEG = 58.59;

// Requirement 13, criterion 9: the 89.79° of section 4.6 minus 0.005°.
const ZHTW_PEAK_MIN_DEG = 89.785;

// Requirement 13, criterion 7: the Pass is shorter than 60 s.
const SHORT_PASS_LIMIT_MS = 60_000;

// Requirement 13, criterion 6: all 8 Passes of the two 24-hour runs (7 for the ISS, 1 for ZHIHUI TIANWANG-1 01A).
const PASSES_OF_24_HOUR_RUNS = 8;

// D20: the hook that computes a Brute_Force_Reference over 24 h gets 120 000 ms (Requirement 14, criterion 11).
const BRUTE_FORCE_HOOK_TIMEOUT_MS = 120_000;

const ISS_TLE = parseTle(ISS_BASELINE.text);
const ZHTW_TLE = parseTle(ZHTW_BASELINE.text);

/** One Pass_Predictor run over the Reference_Observer: its inputs and the Passes that it reports. */
interface PassRun {
  /** The satellite, window, Min_Elevation and criterion of the run, for assertion messages. */
  readonly label: string;
  readonly tle: TleRecord;
  readonly startMs: number;
  /** The window start plus the window duration. */
  readonly endMs: number;
  readonly minElevationDeg: number;
  readonly passes: readonly Pass[];
}

function runPredictor(
  label: string,
  tle: TleRecord,
  startIso: string,
  durationHours: number,
  minElevationDeg: number,
): PassRun {
  const startMs = Date.parse(startIso);
  const passes = predictPasses({ observer: REFERENCE_OBSERVER, tle, start: startMs, durationHours, minElevationDeg });
  return { label, tle, startMs, endMs: startMs + durationHours * MS_PER_HOUR, minElevationDeg, passes };
}

// Criterion 1: the ISS and the Reference_Observer, window start 2026-11-09T00:00:00Z, 24 h, Min_Elevation 0°.
const ISS_DAY_RUN = runPredictor(
  'ISS, 24 h from 2026-11-09T00:00:00Z, Min_Elevation 0° (criterion 1)',
  ISS_TLE,
  '2026-11-09T00:00:00Z',
  24,
  0,
);

// Criterion 5: ZHIHUI TIANWANG-1 01A with the window start, duration, Observer and Min_Elevation of criterion 1.
const ZHTW_DAY_RUN = runPredictor(
  'ZHIHUI TIANWANG-1 01A, 24 h from 2026-11-09T00:00:00Z, Min_Elevation 0° (criterion 5)',
  ZHTW_TLE,
  '2026-11-09T00:00:00Z',
  24,
  0,
);

// Criterion 7: the ISS, window start 2026-11-09T11:00:00Z, 1 h, Min_Elevation 47.0167°.
const ISS_HIGH_MIN_ELEVATION_RUN = runPredictor(
  'ISS, 1 h from 2026-11-09T11:00:00Z, Min_Elevation 47.0167° (criterion 7)',
  ISS_TLE,
  '2026-11-09T11:00:00Z',
  1,
  47.0167,
);

/** The three runs that criterion 6 compares with a Brute_Force_Reference. */
const PASS_RUNS: readonly PassRun[] = [ISS_DAY_RUN, ZHTW_DAY_RUN, ISS_HIGH_MIN_ELEVATION_RUN];

function isoOf(timeMs: number): string {
  return new Date(timeMs).toISOString();
}

/** A Pass as text for assertion messages. */
function describePass(pass: Pass): string {
  return (
    `rise ${isoOf(pass.riseMs)}, peak ${isoOf(pass.peakMs)}, set ${isoOf(pass.setMs)}, ` +
    `Maximum_Elevation ${pass.maxElevationDeg}°, Start_Truncated ${pass.startTruncated}, ` +
    `End_Truncated ${pass.endTruncated}`
  );
}

/** A Pass list as text for assertion messages. */
function describePasses(passes: readonly Pass[]): string {
  if (passes.length === 0) return 'no Passes';
  return passes.map((pass, index) => `[${index + 1}] ${describePass(pass)}`).join('; ');
}

/** The k-th Pass of `run` (k from 1), which must exist. */
function nthPass(run: PassRun, k: number): Pass {
  const pass = run.passes[k - 1];
  expect(pass, `${run.label}: Pass ${k} exists; the run reported ${describePasses(run.passes)}`).toBeDefined();
  return pass;
}

/** Fails unless `expectedMs − beforeMs ≤ actualMs ≤ expectedMs + afterMs`. */
function expectInstantWithin(
  actualMs: number,
  expectedMs: number,
  beforeMs: number,
  afterMs: number,
  quantity: string,
): void {
  const offsetMs = actualMs - expectedMs;
  const message =
    `${quantity}: ${isoOf(actualMs)} against ${isoOf(expectedMs)}, an offset of ${offsetMs / 1000} s, ` +
    `allowed from −${beforeMs / 1000} s to +${afterMs / 1000} s`;
  expect(offsetMs, message).toBeGreaterThanOrEqual(-beforeMs);
  expect(offsetMs, message).toBeLessThanOrEqual(afterMs);
}

/** Fails unless `actualDeg` is within ±`toleranceDeg` of `expectedDeg`. */
function expectDegreesWithin(actualDeg: number, expectedDeg: number, toleranceDeg: number, quantity: string): void {
  expect(
    Math.abs(actualDeg - expectedDeg),
    `${quantity}: ${actualDeg}° against ${expectedDeg}° ± ${toleranceDeg}°`,
  ).toBeLessThanOrEqual(toleranceDeg);
}

describe('Pass baselines (Requirement 13, criteria 1 to 9; Requirement 10, criterion 4)', () => {
  // The Brute_Force_Passes of each run of PASS_RUNS, in the same order, from a Brute_Force_Reference over the run's own
  // Search_Window.
  let bruteForceOfRuns: readonly (readonly BruteForcePass[])[] = [];

  beforeAll(() => {
    bruteForceOfRuns = PASS_RUNS.map((run) => {
      const samples = bruteForceSamples(createSatrec(run.tle), REFERENCE_OBSERVER, run.startMs, run.endMs);
      return bruteForcePasses(samples, run.minElevationDeg);
    });
  }, BRUTE_FORCE_HOOK_TIMEOUT_MS);

  it('13.1: reports exactly 7 Passes for the ISS in the 24 h window, none start- or end-truncated', () => {
    const { passes } = ISS_DAY_RUN;

    expect(passes, `${ISS_DAY_RUN.label}: ${describePasses(passes)}`).toHaveLength(7);
    passes.forEach((pass, index) => {
      expect(pass.startTruncated, `Start_Truncated of Pass ${index + 1}: ${describePass(pass)}`).toBe(false);
      expect(pass.endTruncated, `End_Truncated of Pass ${index + 1}: ${describePass(pass)}`).toBe(false);
    });
  });

  it('13.2: puts the rise and the set of each ISS Pass from 70 s before to 10 s after its section 4.6 row', () => {
    ISS_PASS_TABLE.forEach((row, index) => {
      const k = index + 1;
      const pass = nthPass(ISS_DAY_RUN, k);

      expectInstantWithin(
        pass.riseMs,
        row.startMs,
        TABLE_TOLERANCE_BEFORE_MS,
        TABLE_TOLERANCE_AFTER_MS,
        `Rise_Instant of ISS Pass ${k} against the start time of row ${k}`,
      );
      expectInstantWithin(
        pass.setMs,
        row.endMs,
        TABLE_TOLERANCE_BEFORE_MS,
        TABLE_TOLERANCE_AFTER_MS,
        `Set_Instant of ISS Pass ${k} against the end time of row ${k}`,
      );
    });
  });

  it('13.3: gives each ISS Pass a Maximum_Elevation of at least its section 4.6 maximum elevation minus 0.005°', () => {
    ISS_PASS_TABLE.forEach((row, index) => {
      const k = index + 1;
      const pass = nthPass(ISS_DAY_RUN, k);

      expect(
        pass.maxElevationDeg,
        `Maximum_Elevation of ISS Pass ${k} against ${row.maxElevationDeg}° of row ${k} minus ${TABLE_HALF_STEP_DEG}°`,
      ).toBeGreaterThanOrEqual(row.maxElevationDeg - TABLE_HALF_STEP_DEG);
    });
  });

  it('13.4: puts the rise and the set of ISS pass 2 within ±10 s of the 1 s reference', () => {
    const pass = nthPass(ISS_DAY_RUN, 2);

    expectInstantWithin(
      pass.riseMs,
      ISS_PASS_2_1S_REFERENCE.riseMs,
      CROSSING_TOLERANCE_MS,
      CROSSING_TOLERANCE_MS,
      'Rise_Instant of ISS Pass 2 against the 1 s reference',
    );
    expectInstantWithin(
      pass.setMs,
      ISS_PASS_2_1S_REFERENCE.setMs,
      CROSSING_TOLERANCE_MS,
      CROSSING_TOLERANCE_MS,
      'Set_Instant of ISS Pass 2 against the 1 s reference',
    );
  });

  it('13.5: reports exactly one ZHIHUI TIANWANG-1 01A Pass, not truncated, with the rise and the set of its section 4.6 row', () => {
    const { passes } = ZHTW_DAY_RUN;
    const [row] = ZHTW_PASS_TABLE;

    expect(passes, `${ZHTW_DAY_RUN.label}: ${describePasses(passes)}`).toHaveLength(1);
    const [pass] = passes;
    expect(pass.startTruncated, `Start_Truncated: ${describePass(pass)}`).toBe(false);
    expect(pass.endTruncated, `End_Truncated: ${describePass(pass)}`).toBe(false);
    expectInstantWithin(
      pass.riseMs,
      row.startMs,
      TABLE_TOLERANCE_BEFORE_MS,
      TABLE_TOLERANCE_AFTER_MS,
      'Rise_Instant of the ZHIHUI TIANWANG-1 01A Pass against the start time of its row',
    );
    expectInstantWithin(
      pass.setMs,
      row.endMs,
      TABLE_TOLERANCE_BEFORE_MS,
      TABLE_TOLERANCE_AFTER_MS,
      'Set_Instant of the ZHIHUI TIANWANG-1 01A Pass against the end time of its row',
    );
  });

  it('13.6: lets every Pass of the runs of criteria 1, 5 and 7 overlap exactly one Brute_Force_Pass and meet its tolerances', () => {
    PASS_RUNS.forEach((run, runIndex) => {
      const reference = bruteForceOfRuns[runIndex];
      expect(run.passes.length, `${run.label}: the number of Passes to compare`).toBeGreaterThan(0);

      run.passes.forEach((pass, index) => {
        const where = `${run.label}, Pass ${index + 1} (${describePass(pass)})`;
        const overlapped = reference.filter((bruteForcePass) => passOverlaps(pass, bruteForcePass));
        expect(overlapped.length, `${where}: the number of Brute_Force_Passes that the Pass overlaps`).toBe(1);
        const [bruteForcePass] = overlapped;

        // Requirement 10, criterion 5: the Rise_Instant of a Pass that is not start-truncated, ±10 s.
        if (!pass.startTruncated) {
          expectInstantWithin(
            pass.riseMs,
            bruteForcePass.riseMs,
            CROSSING_TOLERANCE_MS,
            CROSSING_TOLERANCE_MS,
            `${where}: Rise_Instant against the rise of its Brute_Force_Pass`,
          );
        }
        // Requirement 10, criterion 6: the Set_Instant of a Pass that is not end-truncated, ±10 s.
        if (!pass.endTruncated) {
          const bruteForceSetMs = bruteForcePass.setMs;
          if (bruteForceSetMs === null) {
            throw new Error(`${where}: its Brute_Force_Pass runs to the end of the interval and has no set to compare`);
          }
          expectInstantWithin(
            pass.setMs,
            bruteForceSetMs,
            CROSSING_TOLERANCE_MS,
            CROSSING_TOLERANCE_MS,
            `${where}: Set_Instant against the set of its Brute_Force_Pass`,
          );
        }
        // Requirement 10, criterion 7: the Maximum_Elevation, ±0.5°.
        expectDegreesWithin(
          pass.maxElevationDeg,
          bruteForcePass.peakDeg,
          PEAK_TOLERANCE_DEG,
          `${where}: Maximum_Elevation against the peak elevation of its Brute_Force_Pass`,
        );
      });
    });

    expect(
      ISS_DAY_RUN.passes.length + ZHTW_DAY_RUN.passes.length,
      'the number of Passes of the two 24-hour runs, all of which are compared',
    ).toBe(PASSES_OF_24_HOUR_RUNS);
  });

  it('13.7: reports exactly one ISS Pass shorter than 60 s for Min_Elevation 47.0167°, with Maximum_Elevation within ±0.5° of 48.6098°', () => {
    const { passes } = ISS_HIGH_MIN_ELEVATION_RUN;

    expect(passes, `${ISS_HIGH_MIN_ELEVATION_RUN.label}: ${describePasses(passes)}`).toHaveLength(1);
    const [pass] = passes;
    expect(pass.setMs - pass.riseMs, `Set_Instant minus Rise_Instant in ms: ${describePass(pass)}`).toBeLessThan(
      SHORT_PASS_LIMIT_MS,
    );
    expect(pass.startTruncated, `Start_Truncated: ${describePass(pass)}`).toBe(false);
    expect(pass.endTruncated, `End_Truncated: ${describePass(pass)}`).toBe(false);
    expectDegreesWithin(
      pass.maxElevationDeg,
      ISS_PASS_2_1S_REFERENCE.maxElevationDeg,
      PEAK_TOLERANCE_DEG,
      'Maximum_Elevation of the ISS Pass',
    );
  });

  it('13.8: gives ISS pass 2 a Maximum_Elevation of 48.61° ± 0.5° and a Peak_Instant of 11:23:24Z ± 10 s', () => {
    const pass = nthPass(ISS_DAY_RUN, 2);

    expectDegreesWithin(pass.maxElevationDeg, ISS_PASS_2_PEAK_DEG, PEAK_TOLERANCE_DEG, 'Maximum_Elevation of ISS Pass 2');
    expectInstantWithin(
      pass.peakMs,
      ISS_PASS_2_1S_REFERENCE.peakMs,
      CROSSING_TOLERANCE_MS,
      CROSSING_TOLERANCE_MS,
      'Peak_Instant of ISS Pass 2 against the 1 s reference',
    );
  });

  it('13.9: gives the ZHIHUI TIANWANG-1 01A Pass a Maximum_Elevation of at least 89.785°', () => {
    const pass = nthPass(ZHTW_DAY_RUN, 1);

    expect(pass.maxElevationDeg, `Maximum_Elevation of the ZHIHUI TIANWANG-1 01A Pass against ${ZHTW_PEAK_MIN_DEG}°`)
      .toBeGreaterThanOrEqual(ZHTW_PEAK_MIN_DEG);
  });

  it('10.4: gives ISS passes 2 and 6 a Maximum_Elevation within ±0.5° of 48.61° and of 58.59°', () => {
    expectDegreesWithin(
      nthPass(ISS_DAY_RUN, 2).maxElevationDeg,
      ISS_PASS_2_PEAK_DEG,
      PEAK_TOLERANCE_DEG,
      'Maximum_Elevation of ISS Pass 2',
    );
    expectDegreesWithin(
      nthPass(ISS_DAY_RUN, 6).maxElevationDeg,
      ISS_PASS_6_PEAK_DEG,
      PEAK_TOLERANCE_DEG,
      'Maximum_Elevation of ISS Pass 6',
    );
  });
});
