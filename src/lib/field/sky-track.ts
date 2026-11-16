import { observeAt } from '../orbit/index';
import type { Observer, Pass, Satrec } from '../orbit/index';
import { formatUtc } from '../session/index';
import { MAX_TICKS, SKY_MAX_STEPS, SKY_STEP_MS } from './constants';
import { shadowedAt } from './illumination';
import type { IlluminationProfile } from './illumination';

export type SkySample =
  | { readonly ok: true; readonly tMs: number; readonly azimuthDeg: number; readonly elevationDeg: number }
  | { readonly ok: false; readonly tMs: number };
export type SkySampleOk = Extract<SkySample, { ok: true }>;

export interface SkyTrack {
  readonly samples: readonly SkySample[];
  readonly tickMs: readonly number[];
  readonly aos: SkySample;
  readonly tca: SkySample;
  readonly los: SkySample;
}

const TICK_INTERVALS_MIN = [1, 2, 5, 10, 15, 30, 60] as const;

/** Smallest interval of 1, 2, 5, 10, 15, 30, 60 min with at most MAX_TICKS ticks, on UTC multiples. */
function tickInstants(pass: Pass): number[] {
  for (const min of TICK_INTERVALS_MIN) {
    const stepMs = min * 60_000;
    const out: number[] = [];
    for (let t = Math.ceil(pass.riseMs / stepMs) * stepMs; t <= pass.setMs; t += stepMs) out.push(t);
    if (out.length <= MAX_TICKS || min === 60) return out.slice(0, MAX_TICKS);
  }
  return [];
}

function sampleAt(satrec: Satrec, observer: Observer, tMs: number): SkySample {
  const obs = observeAt(satrec, tMs, observer);
  if (!obs.ok) return { ok: false, tMs };
  return { ok: true, tMs, azimuthDeg: obs.lookAngles.azimuthDeg, elevationDeg: obs.lookAngles.elevationDeg };
}

export function buildSkyTrack(satrec: Satrec, observer: Observer, pass: Pass): SkyTrack {
  const duration = pass.setMs - pass.riseMs;
  const step = Math.max(SKY_STEP_MS, Math.ceil(duration / SKY_MAX_STEPS / 1000) * 1000);
  const ticks = tickInstants(pass);
  const instants = new Set<number>([pass.riseMs, pass.peakMs, pass.setMs, ...ticks]);
  for (let t = pass.riseMs + step; t < pass.setMs; t += step) instants.add(t);
  const samples = [...instants].sort((a, b) => a - b).map((t) => sampleAt(satrec, observer, t));
  const find = (t: number): SkySample => samples.find((s) => s.tMs === t) ?? { ok: false, tMs: t };
  return {
    samples,
    tickMs: ticks,
    aos: find(pass.riseMs),
    tca: find(pass.peakMs),
    los: find(pass.setMs),
  };
}

/** Polyline segments split at sample failures and at illumination changes; segments stay continuous. */
export function trackSegments(
  track: SkyTrack,
  profile: IlluminationProfile,
): ReadonlyArray<{ inShadow: boolean; samples: readonly SkySampleOk[] }> {
  const out: Array<{ inShadow: boolean; samples: SkySampleOk[] }> = [];
  type Segment = { inShadow: boolean; samples: SkySampleOk[] };
  let current: Segment | null = null;
  for (const s of track.samples) {
    if (!s.ok) {
      current = null;
      continue;
    }
    const shadow = shadowedAt(profile, s.tMs) === true;
    if (current === null) {
      current = { inShadow: shadow, samples: [s] };
      out.push(current);
    } else if (current.inShadow === shadow) {
      current.samples.push(s);
    } else {
      const prev: Segment = current;
      const lastSample: SkySampleOk = prev.samples[prev.samples.length - 1];
      current = { inShadow: shadow, samples: [lastSample, s] };
      out.push(current);
    }
  }
  return out;
}

export function tickLabel(tMs: number): string {
  return `${formatUtc(tMs).slice(11, 16)}Z`;
}
