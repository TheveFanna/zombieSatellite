// Time-zone repeat test (design.md, D20, D23 and "Time-zone repeat"; Requirement 2, criterion 5; Requirement 14,
// criteria 8, 10 and 11). `computeAll()` runs the baseline computations of Requirement 14, criterion 8 once with the host
// time zone set to UTC and once with Asia/Shanghai, and the two outputs must be exactly equal. The zone is switched
// through `process.env.TZ` inside the forked worker (`pool: 'forks'`, so `process.env` is the real environment), which
// works the same on Windows and POSIX without a command prefix. The offset that the process reports for
// 2026-11-09T00:00:00Z must be 0 min in the first computation and −480 min in the second, so the test fails on a
// platform where the switch does not take effect (Requirement 14, criterion 10).
//
// Both computations get the same time values: the instants are numbers of milliseconds from tests/helpers/baseline.ts
// or `Date.parse` of a `Z` string, fixed once when this module loads. Records, Satrecs and Observers are created anew
// by every `computeAll()`. The output is plain data, and an Engine_Error is captured as `{ category, message }`,
// because Vitest's equality compares `Error` objects by message only.
import { describe, expect, it } from 'vitest';
import {
  createSatrec,
  isEngineError,
  observeAt,
  parseTle,
  predictPasses,
  propagateAt,
} from '../../src/lib/orbit/index';
import type { EngineErrorCategory } from '../../src/lib/orbit/index';
import {
  ISS_AT_1123Z,
  ISS_AT_1200Z,
  ISS_BASELINE,
  REFERENCE_OBSERVER,
  ZHTW_AT_1200Z,
  ZHTW_BASELINE,
} from '../helpers/baseline';
import type { BaselineInstant, BaselineTle } from '../helpers/baseline';

// D20, Requirement 14, criterion 11: the time-zone test gets 60 000 ms (the Vitest default is 5 000 ms).
const TEST_TIMEOUT_MS = 60_000;

// Requirement 14, criterion 10: the instant whose UTC offset the process must report, and the two expected offsets in
// minutes (`getTimezoneOffset` is positive west of UTC, so Asia/Shanghai, UTC+8, gives −480).
const OFFSET_PROBE_ISO = '2026-11-09T00:00:00Z';
const UTC_OFFSET_MIN = 0;
const SHANGHAI_OFFSET_MIN = -480;

/** Requirement 4, criteria 18 and 19: the parsed Baseline_TLE_Snapshots. */
interface RecordCase {
  readonly criterion: string;
  readonly baseline: BaselineTle;
}

const RECORD_CASES: readonly RecordCase[] = [
  { criterion: '4.18', baseline: ISS_BASELINE },
  { criterion: '4.19', baseline: ZHTW_BASELINE },
];

/**
 * One section 4.3 row with the criteria that pin its Propagator output (Requirement 6, criteria 7 to 9), its Look_Angles
 * (Requirement 7, criteria 5 to 7) and its Range_Rate (Requirement 8, criteria 5 to 7). One `observeAt` call returns the
 * Look_Angles and the Range_Rate.
 */
interface InstantCase {
  readonly propagation: string;
  readonly lookAngles: string;
  readonly rangeRate: string;
  readonly row: BaselineInstant;
}

const INSTANT_CASES: readonly InstantCase[] = [
  { propagation: '6.7', lookAngles: '7.5', rangeRate: '8.5', row: ISS_AT_1123Z },
  { propagation: '6.8', lookAngles: '7.6', rangeRate: '8.6', row: ISS_AT_1200Z },
  { propagation: '6.9', lookAngles: '7.7', rangeRate: '8.7', row: ZHTW_AT_1200Z },
];

/** One Pass_Predictor run of Requirement 13 for the Reference_Observer. */
interface PassRunCase {
  readonly criterion: string;
  readonly baseline: BaselineTle;
  readonly startIso: string;
  /** The same instant in ms since 1970-01-01T00:00:00Z: `Date.parse(startIso)`. */
  readonly startMs: number;
  readonly durationHours: number;
  readonly minElevationDeg: number;
}

function passRunCase(
  criterion: string,
  baseline: BaselineTle,
  startIso: string,
  durationHours: number,
  minElevationDeg: number,
): PassRunCase {
  return { criterion, baseline, startIso, startMs: Date.parse(startIso), durationHours, minElevationDeg };
}

const PASS_RUN_CASES: readonly PassRunCase[] = [
  // Criterion 1: the ISS, window start 2026-11-09T00:00:00Z, 24 h, Min_Elevation 0°.
  passRunCase('13.1', ISS_BASELINE, '2026-11-09T00:00:00Z', 24, 0),
  // Criterion 5: ZHIHUI TIANWANG-1 01A with the window start, duration and Min_Elevation of criterion 1.
  passRunCase('13.5', ZHTW_BASELINE, '2026-11-09T00:00:00Z', 24, 0),
  // Criterion 7: the ISS, window start 2026-11-09T11:00:00Z, 1 h, Min_Elevation 47.0167°.
  passRunCase('13.7', ISS_BASELINE, '2026-11-09T11:00:00Z', 1, 47.0167),
];

/** An Engine_Error as plain data. */
interface CapturedError {
  readonly category: EngineErrorCategory;
  readonly message: string;
}

/** The outcome of one engine call: its result, or the Engine_Error that it threw. */
type Outcome<T> = { readonly result: T } | { readonly error: CapturedError };

/** Every output of one `computeAll()`, under a label that names the criteria and the call. */
type TimeZoneOutput = Record<string, Outcome<unknown>>;

/** Runs `call` and returns its result, or its Engine_Error as `{ category, message }`; any other error is a defect. */
function capture<T>(call: () => T): Outcome<T> {
  try {
    return { result: call() };
  } catch (error) {
    if (isEngineError(error)) {
      return { error: { category: error.category, message: error.message } };
    }
    throw error;
  }
}

/** Computes every output of Requirement 14, criterion 8 from fresh records, Satrecs and Observers. */
function computeAll(): TimeZoneOutput {
  const output: TimeZoneOutput = {};

  for (const { criterion, baseline } of RECORD_CASES) {
    output[`${criterion}: parseTle, ${baseline.name}`] = capture(() => parseTle(baseline.text));
  }

  for (const { propagation, lookAngles, rangeRate, row } of INSTANT_CASES) {
    const where = `${row.tle.name} at ${row.iso}`;
    output[`${propagation}: propagateAt, ${where}`] = capture(() =>
      propagateAt(createSatrec(parseTle(row.tle.text)), row.timeMs),
    );
    output[`${lookAngles} and ${rangeRate}: observeAt, ${where}`] = capture(() =>
      observeAt(createSatrec(parseTle(row.tle.text)), row.timeMs, { ...REFERENCE_OBSERVER }),
    );
  }

  for (const run of PASS_RUN_CASES) {
    const where = `${run.baseline.name}, ${run.durationHours} h from ${run.startIso}, Min_Elevation ${run.minElevationDeg}°`;
    output[`${run.criterion}: predictPasses, ${where}`] = capture(() =>
      predictPasses({
        observer: { ...REFERENCE_OBSERVER },
        tle: parseTle(run.baseline.text),
        start: run.startMs,
        durationHours: run.durationHours,
        minElevationDeg: run.minElevationDeg,
      }),
    );
  }

  return output;
}

/** The UTC offset in minutes that the process currently reports for 2026-11-09T00:00:00Z. */
function reportedOffsetMinutes(): number {
  return new Date(OFFSET_PROBE_ISO).getTimezoneOffset();
}

describe('Time-zone repeat (Requirement 2, criterion 5; Requirement 14, criteria 8 and 10)', () => {
  it(
    'returns exactly the same outputs with the host time zone set to Asia/Shanghai as with UTC',
    () => {
      const originalTz = process.env.TZ;
      try {
        process.env.TZ = 'UTC';
        expect(reportedOffsetMinutes(), `UTC offset in minutes of ${OFFSET_PROBE_ISO} with TZ=UTC`).toBe(UTC_OFFSET_MIN);
        const utcOutput = computeAll();

        process.env.TZ = 'Asia/Shanghai';
        expect(reportedOffsetMinutes(), `UTC offset in minutes of ${OFFSET_PROBE_ISO} with TZ=Asia/Shanghai`).toBe(
          SHANGHAI_OFFSET_MIN,
        );
        const shanghaiOutput = computeAll();

        expect(shanghaiOutput).toStrictEqual(utcOutput);
      } finally {
        if (originalTz === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = originalTz;
        }
      }
    },
    TEST_TIMEOUT_MS,
  );
});
