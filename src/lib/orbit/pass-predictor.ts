// Pass_Predictor (design.md, "Pass_Predictor"; Requirements 9 to 12): the passes of one satellite over one Observer
// in a Search_Window. A Coarse_Scan every 60 s finds the runs of samples above Min_Elevation, bisection locates each
// rise and set to within 1 s, and Brent's method locates each peak to within 0.1 s. A Coarse_Scan_Maximum at or below
// Min_Elevation is refined in the same way, so that a short pass between two samples is found (Requirement 12). Every
// instant that is evaluated or reported is an integer number of ms since 1970-01-01T00:00:00Z (D2, D13).
import { DEFAULT_MIN_ELEVATION_DEG, DEFAULT_WINDOW_HOURS, MAX_TIME_MS, MAX_WINDOW_HOURS } from './constants';
import { EngineError } from './errors';
import { observeMs, prepareObserver } from './propagator';
import type { Observer } from './propagator';
import { bisectCrossing, coarseScanInstants, maximizeOnGrid } from './refine';
import { createSatrec } from './satrec';
import type { Satrec } from './satrec';
import { toTimeMs } from './time';
import type { TimeInput } from './time';
import type { TleRecord } from './tle-parser';
import { assertObserver, assertTleRecord } from './validate';

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

/** The input of `predictPasses` (Requirement 9, criterion 1). */
export interface PassSearch {
  /** The Observer. It must pass the checks of `observeAt` (Requirement 9, criterion 12). */
  readonly observer: Observer;
  /** The TLE_Record of the satellite (Requirement 2, criterion 11). */
  readonly tle: TleRecord;
  /** The window start: a Date, or a number of ms since 1970-01-01T00:00:00Z (Requirement 2, criterion 4). */
  readonly start: TimeInput;
  /** The window duration in hours, a finite number greater than 0 and at most 168. Omitted or `undefined`: 24. */
  readonly durationHours?: number;
  /** Min_Elevation in degrees, a finite number from -90 to 90. Omitted or `undefined`: 0. */
  readonly minElevationDeg?: number;
}

/**
 * One pass of the satellite above Min_Elevation (D6). Every instant is an integer number of ms since
 * 1970-01-01T00:00:00Z (D2), and every Pass is a fresh plain object.
 */
export interface Pass {
  /** Rise_Instant: the first instant known to be above Min_Elevation (D16), or the window start when `startTruncated`. */
  readonly riseMs: number;
  /** Peak_Instant: the evaluated instant of the highest Elevation in [riseMs, setMs], the earliest one on ties (D15). */
  readonly peakMs: number;
  /** Set_Instant: the first instant known not to be above Min_Elevation (D16), or the window end when `endTruncated`. */
  readonly setMs: number;
  /** Maximum_Elevation in degrees: the Propagator's Elevation at `peakMs`, greater than Min_Elevation. */
  readonly maxElevationDeg: number;
  /** (setMs - riseMs) / 60 000 in minutes, not rounded (C79). */
  readonly durationMin: number;
  /** Start_Truncated: true only for the Pass in progress at the window start, whose `riseMs` is the window start. */
  readonly startTruncated: boolean;
  /** End_Truncated: true only for the Pass still running at the window end, whose `setMs` is the window end. */
  readonly endTruncated: boolean;
}

/** A Pass before the assembly of step 6 attaches its duration. */
type PassBounds = Omit<Pass, 'durationMin'>;

/** The memoised Elevation of the satellite over the Observer at integer instants (step 2). */
interface ElevationOracle {
  /** True when the Elevation is strictly greater than Min_Elevation. A propagation failure is not above (Requirement 9, criterion 11). */
  readonly above: (timeMs: number) => boolean;
  /** The Elevation in degrees, or -Infinity for a propagation failure, so a failure never wins a comparison. */
  readonly score: (timeMs: number) => number;
}

/** The inputs of `predictPasses` after step 1. */
interface ValidatedSearch {
  readonly observer: Observer;
  readonly satrec: Satrec;
  readonly minElevationDeg: number;
  readonly startMs: number;
  readonly endMs: number;
}

function kindOf(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

/** A received number is shown as the number itself (NaN, Infinity), anything else as its kind. */
function receivedOf(value: unknown): string {
  return typeof value === 'number' ? String(value) : kindOf(value);
}

/** Step 1, item 5: `undefined` gives the default; anything else must be a finite number in (0, 168] (criteria 2, 8). */
function readDurationHours(value: unknown): number {
  if (value === undefined) return DEFAULT_WINDOW_HOURS;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_WINDOW_HOURS) {
    throw new EngineError(
      'invalid-input',
      `durationHours must be a finite number greater than 0 and at most ${MAX_WINDOW_HOURS}, received ${receivedOf(value)}`,
    );
  }
  return value;
}

/** Step 1, item 6: `undefined` gives the default; anything else must be a finite number in [-90, 90] (criteria 3, 9). */
function readMinElevationDeg(value: unknown): number {
  if (value === undefined) return DEFAULT_MIN_ELEVATION_DEG;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -90 || value > 90) {
    throw new EngineError(
      'invalid-input',
      `minElevationDeg must be a finite number from -90 to 90, received ${receivedOf(value)}`,
    );
  }
  return value;
}

/**
 * Step 1. The checks run in the order of D18, so the first failing check fixes the category and the message: the
 * `search` object, the Observer, the TLE_Record, the window start, `durationHours`, `minElevationDeg`, the window end
 * (D14), and last the Satrec, whose rejection is `invalid-tle` (Requirement 9, criterion 15).
 */
function validateSearch(search: PassSearch): ValidatedSearch {
  if (typeof search !== 'object' || search === null) {
    throw new EngineError('invalid-input', `search must be an object, received ${kindOf(search)}`);
  }
  // The Observer and the TLE_Record are read once, so the checks and the computation see the same value.
  const observer = search.observer;
  assertObserver(observer);
  const tle = search.tle;
  assertTleRecord(tle);
  const startMs = toTimeMs(search.start, 'start');
  const durationHours = readDurationHours(search.durationHours);
  const minElevationDeg = readMinElevationDeg(search.minElevationDeg);

  // D14. The sum of an integer start and at most 168 h in ms is an exact integer, so the range check is exact.
  const endMs = startMs + Math.round(durationHours * MS_PER_HOUR);
  if (Math.abs(endMs) > MAX_TIME_MS) {
    throw new EngineError(
      'invalid-input',
      `the window end must be a number of milliseconds with an absolute value of at most ${MAX_TIME_MS}, received ${endMs}`,
    );
  }

  const satrec = createSatrec(tle);
  return { observer, satrec, minElevationDeg, startMs, endMs };
}

/**
 * Step 2. `elevation(t)` is the Elevation in degrees at the integer instant `t` from the same `observeMs` code that
 * `observeAt` runs, or null for a propagation failure. Results are memoised per call, and one prepared Observer serves
 * every evaluation. The reported Maximum_Elevation is `score(peakMs)`, so it equals the Propagator's Elevation at the
 * Peak_Instant exactly (Requirement 9, criterion 7).
 */
function createElevationOracle(satrec: Satrec, observer: Observer, minElevationDeg: number): ElevationOracle {
  const prepared = prepareObserver(observer);
  const memo = new Map<number, number | null>();

  const elevation = (timeMs: number): number | null => {
    const known = memo.get(timeMs);
    if (known !== undefined) return known;
    const observation = observeMs(satrec, timeMs, prepared);
    const value = observation.ok ? observation.lookAngles.elevationDeg : null;
    memo.set(timeMs, value);
    return value;
  };

  return {
    above: (timeMs) => {
      const value = elevation(timeMs);
      return value !== null && value > minElevationDeg;
    },
    score: (timeMs) => elevation(timeMs) ?? Number.NEGATIVE_INFINITY,
  };
}

/** The candidate with the highest score, the earliest one when several share it (D15). `candidates` is not empty. */
function earliestArgmax(candidates: readonly number[], score: (timeMs: number) => number): number {
  let best = candidates[0];
  let bestScore = score(best);
  for (const timeMs of candidates) {
    const candidateScore = score(timeMs);
    if (candidateScore > bestScore || (candidateScore === bestScore && timeMs < best)) {
      best = timeMs;
      bestScore = candidateScore;
    }
  }
  return best;
}

/**
 * Step 4. Every maximal index range [i, j] of Coarse_Scan samples above Min_Elevation gives one Pass. A run that
 * starts at the first sample is clipped to the window start, and a run that ends at the last sample to the window end;
 * every other rise and set is located by bisection between a sample above and a sample not above (D16).
 */
function passesFromRuns(samples: readonly number[], oracle: ElevationOracle): PassBounds[] {
  const { above, score } = oracle;
  const last = samples.length - 1;
  const sampleAbove = samples.map((timeMs) => above(timeMs));
  const passes: PassBounds[] = [];

  let i = 0;
  while (i <= last) {
    if (!sampleAbove[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < last && sampleAbove[j + 1]) j += 1;

    const startTruncated = i === 0;
    const endTruncated = j === last;
    const riseMs = startTruncated ? samples[0] : bisectCrossing(above, samples[i - 1], samples[i]);
    const setMs = endTruncated ? samples[last] : bisectCrossing(above, samples[j], samples[j + 1]);

    // The highest sample of the run, the earliest one on ties.
    let h = i;
    for (let q = i + 1; q <= j; q += 1) {
      if (score(samples[q]) > score(samples[h])) h = q;
    }

    // Peak bracket: from the sample before the highest one to the sample after it. At a window bound the bracket ends
    // there: [S, c1] for the first sample, [c(m-1), E] for the last one, and [S, S] when the scan has one sample
    // (Requirement 10, criteria 9 and 10). Only the evaluated instants inside [riseMs, setMs] can be the peak (D15).
    // The highest Coarse_Scan sample is itself a candidate, so the Maximum_Elevation is above Min_Elevation and at
    // least the Elevation of every Coarse_Scan sample of the Pass (Requirement 9, criterion 13; Requirement 10,
    // criterion 8). A Pass clipped at a window bound reports exactly that bound when its Elevation is the highest
    // there (Requirement 11, criterion 5).
    const evaluated = maximizeOnGrid(score, samples[Math.max(h - 1, 0)], samples[Math.min(h + 1, last)], samples[h]);
    const inPass = evaluated.filter((timeMs) => timeMs >= riseMs && timeMs <= setMs);
    const peakMs = earliestArgmax([samples[h], ...inPass], score);

    passes.push({ riseMs, peakMs, setMs, maxElevationDeg: score(peakMs), startTruncated, endTruncated });
    i = j + 1;
  }
  return passes;
}

/**
 * Step 5. A short pass can peak above Min_Elevation between two Coarse_Scan samples that are not above it, so every
 * Coarse_Scan_Maximum at or below Min_Elevation is refined with `maximizeOnGrid` inside the bracket of its neighbouring
 * samples, with the window bound in place of a missing neighbour (Requirement 12, criterion 1). When the highest
 * evaluated instant is above Min_Elevation, it is the peak of a Pass whose rise and set are located by bisection from
 * the peak to the two bracket ends, and neither truncation flag is set (criteria 2, 5 and 6; Requirement 11, criteria 3
 * and 4). Otherwise there is no Pass (criterion 7).
 *
 * The samples c[k-1], c[k] and c[k+1] around a maximum at index k are not above Min_Elevation, because a neighbour
 * above it would be higher than the maximum. So both bracket ends are not above, which gives each bisection a valid
 * bracket, and the Pass lies in (c[k-1], c[k+1]]. Every run of step 4 therefore ends at index k-2 or earlier or starts
 * at index k+2 or later, and two maxima are never adjacent (the condition is ">" towards the sample before and ">="
 * towards the sample after). The Passes of steps 4 and 5 do not overlap, and each Set_Instant is earlier than the next
 * Rise_Instant (Requirement 9, criterion 5).
 */
function passesFromSubThresholdMaxima(samples: readonly number[], oracle: ElevationOracle): PassBounds[] {
  const { above, score } = oracle;
  const last = samples.length - 1;
  const passes: PassBounds[] = [];

  for (let k = 0; k <= last; k += 1) {
    // A Coarse_Scan_Maximum is higher than the sample before it and at least as high as the sample after it. A
    // propagation failure scores -Infinity: it is never a maximum, and as a neighbour it is lower than every Elevation.
    const here = score(samples[k]);
    const isMaximum =
      here !== Number.NEGATIVE_INFINITY &&
      (k === 0 || here > score(samples[k - 1])) &&
      (k === last || here >= score(samples[k + 1]));
    // A maximum above Min_Elevation lies in a run that step 4 has handled.
    if (!isMaximum || above(samples[k])) continue;

    const lo = samples[Math.max(k - 1, 0)];
    const hi = samples[Math.min(k + 1, last)];
    const peakMs = earliestArgmax(maximizeOnGrid(score, lo, hi), score);
    if (!above(peakMs)) continue;

    passes.push({
      riseMs: bisectCrossing(above, lo, peakMs),
      peakMs,
      setMs: bisectCrossing(above, peakMs, hi),
      maxElevationDeg: score(peakMs),
      startTruncated: false,
      endTruncated: false,
    });
  }
  return passes;
}

/**
 * Lists the Passes of the satellite over the Observer in the Search_Window from `search.start` to
 * `search.start + durationHours` (design.md, "Pass_Predictor"; Requirement 9). The Passes are in ascending order of
 * `riseMs` and do not overlap. A Pass in progress at the window start or end is clipped to the window and flagged
 * (Requirement 11). An SGP4 propagation failure counts as "not above Min_Elevation" and never throws (Requirement 9,
 * criterion 11). A value that is not valid input throws `invalid-input`, and TLE lines that satellite.js rejects throw
 * `invalid-tle`.
 */
export function predictPasses(search: PassSearch): Pass[] {
  // Step 1: validation.
  const { observer, satrec, minElevationDeg, startMs, endMs } = validateSearch(search);

  // Steps 2 and 3: the elevation oracle and the Coarse_Scan (Requirement 10, criterion 1).
  const oracle = createElevationOracle(satrec, observer, minElevationDeg);
  const samples = coarseScanInstants(startMs, endMs);

  // Step 4: the Passes of the runs of Coarse_Scan samples above Min_Elevation.
  const found = passesFromRuns(samples, oracle);

  // Step 5: the Passes of the Coarse_Scan_Maxima at or below Min_Elevation (Requirement 12). They are kept apart from
  // the Passes of step 4 by construction, so the assembly below only has to sort them in.
  found.push(...passesFromSubThresholdMaxima(samples, oracle));

  // Step 6: assembly. The Passes of steps 4 and 5 are sorted by Rise_Instant, and the duration in minutes is not
  // rounded (C79).
  return found
    .sort((a, b) => a.riseMs - b.riseMs)
    .map((pass) => ({ ...pass, durationMin: (pass.setMs - pass.riseMs) / MS_PER_MINUTE }));
}
