// Visibility_Bar math of the AR tab (S9 design "Visibility bar", S10 design "Visibility_Bar").
import type { Pass } from '../orbit/index';

export const VISIBILITY_SPAN_MS = 86_400_000;

export interface VisibilityWindow {
  readonly startFrac: number;
  readonly endFrac: number;
  readonly riseMs: number;
  readonly setMs: number;
  readonly maxElevationDeg: number;
  readonly running: boolean;
}

/** Windows clipped to [now, now + span] as fractions of the bar; windows outside it are dropped. */
export function visibilityWindows(
  passes: readonly Pass[],
  nowMs: number,
  spanMs: number = VISIBILITY_SPAN_MS,
): VisibilityWindow[] {
  const out: VisibilityWindow[] = [];
  for (const p of passes) {
    if (p.setMs <= nowMs || p.riseMs >= nowMs + spanMs) continue;
    out.push({
      startFrac: Math.max(0, (p.riseMs - nowMs) / spanMs),
      endFrac: Math.min(1, (p.setMs - nowMs) / spanMs),
      riseMs: p.riseMs,
      setMs: p.setMs,
      maxElevationDeg: p.maxElevationDeg,
      running: p.riseMs <= nowMs,
    });
  }
  return out;
}

/** One tick per whole UTC hour strictly after `originMs` and up to `originMs + spanMs`, labelled "HH". */
export function hourTicks(originMs: number, spanMs: number = VISIBILITY_SPAN_MS): Array<{ frac: number; label: string }> {
  const stepMs = 3_600_000;
  const out: Array<{ frac: number; label: string }> = [];
  for (let t = Math.floor(originMs / stepMs) * stepMs + stepMs; t <= originMs + spanMs; t += stepMs) {
    out.push({ frac: (t - originMs) / spanMs, label: String(new Date(t).getUTCHours()).padStart(2, '0') });
  }
  return out;
}
