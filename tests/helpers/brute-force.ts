// Brute_Force_Reference helper (design.md, "Brute_Force_Reference helper"; Requirement 14, criterion 6). The Elevation
// of a satellite over an Observer is evaluated every 1 s with the public Propagator, `observeAt`, and the
// Brute_Force_Passes are read off the samples. The helper never calls `predictPasses` and reads no stored results.
import { observeAt } from '../../src/lib/orbit/index';
import type { Observer, Pass, Satrec } from '../../src/lib/orbit/index';

/** The spacing of the samples in ms. */
const STEP_MS = 1000;

/**
 * The Elevation samples of a Brute_Force_Reference over an interval: at `startMs`, at every `startMs + 1000 * k` before
 * `endMs`, and at `endMs`. Both bounds are integers in ms since 1970-01-01T00:00:00Z, and `endMs ≥ startMs`.
 */
export interface BruteForceSamples {
  readonly startMs: number;
  readonly endMs: number;
  /** The Elevation in degrees of every sample, in time order; NaN for a propagation failure. */
  readonly elevationsDeg: Float64Array;
}

/**
 * A Brute_Force_Pass: a maximal run of consecutive samples whose Elevation is greater than Min_Elevation. Every instant
 * is the instant of a sample, in ms since 1970-01-01T00:00:00Z.
 */
export interface BruteForcePass {
  /** The rise: the first sample of the run. */
  readonly riseMs: number;
  /** The last sample of the run. */
  readonly lastAboveMs: number;
  /** The set: the first sample after the run; null when the run ends at the interval end. */
  readonly setMs: number | null;
  /** The peak elevation: the highest Elevation in the run, in degrees. */
  readonly peakDeg: number;
  /** The first sample whose Elevation is `peakDeg`. */
  readonly peakMs: number;
  /** The sample before the run; null when the run starts at the interval start. */
  readonly beforeMs: number | null;
}

/** The instant of sample `index`: `startMs + 1000 * index`, and `endMs` for the last sample. */
function sampleMs(samples: BruteForceSamples, index: number): number {
  return index === samples.elevationsDeg.length - 1 ? samples.endMs : samples.startMs + STEP_MS * index;
}

/**
 * The Brute_Force_Reference of `satrec` over `observer` on [startMs, endMs]: `observeAt` at `startMs`, at every 1 s
 * step before `endMs`, and at `endMs`.
 */
export function bruteForceSamples(
  satrec: Satrec,
  observer: Observer,
  startMs: number,
  endMs: number,
): BruteForceSamples {
  const count = Math.ceil((endMs - startMs) / STEP_MS) + 1;
  const samples: BruteForceSamples = { startMs, endMs, elevationsDeg: new Float64Array(count) };
  for (let index = 0; index < count; index += 1) {
    const result = observeAt(satrec, sampleMs(samples, index), observer);
    samples.elevationsDeg[index] = result.ok ? result.lookAngles.elevationDeg : Number.NaN;
  }
  return samples;
}

/**
 * The Brute_Force_Passes of `samples` for `minElevationDeg`, in time order. A sample is above when its Elevation is
 * greater than `minElevationDeg`; the comparison is strict, so a propagation failure (NaN) counts as not above.
 */
export function bruteForcePasses(samples: BruteForceSamples, minElevationDeg: number): BruteForcePass[] {
  const { elevationsDeg } = samples;
  const last = elevationsDeg.length - 1;
  const above = (index: number): boolean => elevationsDeg[index] > minElevationDeg;
  const passes: BruteForcePass[] = [];

  let first = 0;
  while (first <= last) {
    if (!above(first)) {
      first += 1;
      continue;
    }
    // `first` is above and the sample before it is not (or it is the first sample), so it opens a run.
    let end = first;
    let peak = first;
    while (end < last && above(end + 1)) {
      end += 1;
      if (elevationsDeg[end] > elevationsDeg[peak]) peak = end;
    }
    passes.push({
      riseMs: sampleMs(samples, first),
      lastAboveMs: sampleMs(samples, end),
      setMs: end < last ? sampleMs(samples, end + 1) : null,
      peakDeg: elevationsDeg[peak],
      peakMs: sampleMs(samples, peak),
      beforeMs: first > 0 ? sampleMs(samples, first - 1) : null,
    });
    first = end + 1;
  }
  return passes;
}

/**
 * True when `pass` overlaps `bruteForcePass`: `riseMs ≤ pass.setMs` and `lastAboveMs ≥ pass.riseMs` (design.md).
 * A Pass that overlaps no Brute_Force_Pass, or more than one, is exempt from the comparisons of Requirement 10,
 * criteria 5 to 7 (criterion 12).
 */
export function passOverlaps(pass: Pick<Pass, 'riseMs' | 'setMs'>, bruteForcePass: BruteForcePass): boolean {
  return bruteForcePass.riseMs <= pass.setMs && bruteForcePass.lastAboveMs >= pass.riseMs;
}
