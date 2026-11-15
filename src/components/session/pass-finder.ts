// Pass selection (design.md, "Pass selection"; Requirement 3, criteria 3, 5, 7, 8 and 9). The function calls the
// engine, so it lives in the component layer (D3). Every window start is an explicit instant. Engine exceptions
// propagate; the controllers catch them.
import { predictPasses } from '../../lib/orbit/index';
import type { Observer, Pass, TleRecord } from '../../lib/orbit/index';
import {
  IN_PROGRESS_LOOKBACK_HOURS,
  PASS_MIN_ELEVATION_DEG,
  PASS_SEARCH_FALLBACK_HOURS,
  PASS_SEARCH_HOURS,
} from '../../lib/session/index';
import type { ClockMode } from '../../lib/session/index';

export type PassSearchOutcome = { readonly kind: 'found'; readonly pass: Pass } | { readonly kind: 'none' };

const MS_PER_HOUR = 3_600_000;

/** One search over `[startMs, startMs + durationHours]`, always with the session's minimum elevation. */
function search(tle: TleRecord, observer: Observer, startMs: number, durationHours: number): Pass[] {
  return predictPasses({ observer, tle, start: startMs, durationHours, minElevationDeg: PASS_MIN_ELEVATION_DEG });
}

/** Step 1 candidate rule: the first pass for `real`, the first pass that starts inside the window for `demo`. */
function firstCandidate(passes: readonly Pass[], mode: ClockMode): Pass | undefined {
  return mode === 'real' ? passes[0] : passes.find((pass) => !pass.startTruncated);
}

export function findTargetPass(tle: TleRecord, observer: Observer, nowMs: number, mode: ClockMode): PassSearchOutcome {
  // Steps 1 and 2.
  let candidate =
    firstCandidate(search(tle, observer, nowMs, PASS_SEARCH_HOURS), mode) ??
    firstCandidate(search(tle, observer, nowMs, PASS_SEARCH_FALLBACK_HOURS), mode);
  if (candidate === undefined) return { kind: 'none' };

  // Step 3: a real-time pass cut at the window start is searched again from 24 h earlier to find its true rise.
  if (mode === 'real' && candidate.startTruncated) {
    const lookbackStartMs = nowMs - IN_PROGRESS_LOOKBACK_HOURS * MS_PER_HOUR;
    const inProgress = search(tle, observer, lookbackStartMs, 2 * IN_PROGRESS_LOOKBACK_HOURS).find(
      (pass) => pass.riseMs <= nowMs && nowMs < pass.setMs && !pass.startTruncated,
    );
    if (inProgress !== undefined) candidate = inProgress;
  }

  // Step 4: a pass cut at the window end is searched again from its rise to find its true set.
  if (candidate.endTruncated) {
    const full = search(tle, observer, candidate.riseMs, PASS_SEARCH_FALLBACK_HOURS)[0];
    if (full !== undefined && full.riseMs === candidate.riseMs) {
      candidate = {
        riseMs: candidate.riseMs,
        peakMs: full.peakMs,
        setMs: full.setMs,
        maxElevationDeg: full.maxElevationDeg,
        durationMin: (full.setMs - candidate.riseMs) / 60_000,
        startTruncated: candidate.startTruncated,
        endTruncated: full.endTruncated,
      };
    }
  }

  // Step 5.
  return { kind: 'found', pass: candidate };
}
