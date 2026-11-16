// Orbit_Ring of the AR tab (S9 design "Decision S9-1"): one revolution in a frozen-Earth frame.
import { normalizeAzimuthDeg, propagateAt } from '../orbit/index';
import type { Observer, Satrec } from '../orbit/index';
import { RING_STEPS } from './constants';
import type { SkySample, SkySampleOk } from './sky-track';
import { gmstRad } from './time';

export interface OrbitRing {
  readonly anchorMs: number;
  readonly periodMs: number;
  /** RING_STEPS + 1 samples; the last one is one full period after the anchor. */
  readonly samples: readonly SkySample[];
}

export interface Direction {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

const DEG = Math.PI / 180;
const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

function observerEcfKm(o: Observer): { x: number; y: number; z: number } {
  const lat = o.latitudeDeg * DEG;
  const lon = o.longitudeDeg * DEG;
  const n = WGS84_A_KM / Math.sqrt(1 - WGS84_E2 * Math.sin(lat) ** 2);
  return {
    x: (n + o.altitudeKm) * Math.cos(lat) * Math.cos(lon),
    y: (n + o.altitudeKm) * Math.cos(lat) * Math.sin(lon),
    z: (n * (1 - WGS84_E2) + o.altitudeKm) * Math.sin(lat),
  };
}

/** The ring of one revolution from `anchorMs`, or null when the mean motion is not a positive number. */
export function buildOrbitRing(
  satrec: Satrec,
  meanMotionRevPerDay: number,
  anchorMs: number,
  observer: Observer,
): OrbitRing | null {
  if (!Number.isFinite(meanMotionRevPerDay) || meanMotionRevPerDay <= 0) return null;
  const periodMs = (1440 / meanMotionRevPerDay) * 60_000;
  const theta = gmstRad(anchorMs);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const lat = observer.latitudeDeg * DEG;
  const lon = observer.longitudeDeg * DEG;
  const o = observerEcfKm(observer);
  const samples: SkySample[] = [];
  for (let k = 0; k <= RING_STEPS; k += 1) {
    const tMs = anchorMs + Math.round((k * periodMs) / RING_STEPS);
    const r = propagateAt(satrec, tMs);
    if (!r.ok) {
      samples.push({ ok: false, tMs });
      continue;
    }
    const { x, y, z } = r.eciPositionKm;
    const dx = x * cosT + y * sinT - o.x;
    const dy = -x * sinT + y * cosT - o.y;
    const dz = z - o.z;
    const east = -Math.sin(lon) * dx + Math.cos(lon) * dy;
    const north = -Math.sin(lat) * Math.cos(lon) * dx - Math.sin(lat) * Math.sin(lon) * dy + Math.cos(lat) * dz;
    const up = Math.cos(lat) * Math.cos(lon) * dx + Math.cos(lat) * Math.sin(lon) * dy + Math.sin(lat) * dz;
    const range = Math.hypot(dx, dy, dz);
    samples.push({
      ok: true,
      tMs,
      azimuthDeg: normalizeAzimuthDeg(Math.atan2(east, north) / DEG),
      elevationDeg: Math.asin(Math.max(-1, Math.min(1, up / range))) / DEG,
    });
  }
  return { anchorMs, periodMs, samples };
}

/** Segments split at the horizon (below 0° is dashed); the boundary sample is shared so the line is continuous. */
export function ringSegments(
  ring: OrbitRing,
): Array<{ inShadow: false; belowHorizon: boolean; samples: SkySampleOk[] }> {
  const out: Array<{ inShadow: false; belowHorizon: boolean; samples: SkySampleOk[] }> = [];
  let current: { inShadow: false; belowHorizon: boolean; samples: SkySampleOk[] } | null = null;
  for (const s of ring.samples) {
    if (!s.ok) {
      current = null;
      continue;
    }
    const below = s.elevationDeg < 0;
    if (current === null) {
      current = { inShadow: false, belowHorizon: below, samples: [s] };
      out.push(current);
    } else if (current.belowHorizon === below) {
      current.samples.push(s);
    } else {
      const last: SkySampleOk = current.samples[current.samples.length - 1];
      current = { inShadow: false, belowHorizon: below, samples: [last, s] };
      out.push(current);
    }
  }
  return out;
}

/** Small time ticks at multiples of period/count after the anchor, labelled "+N min". */
export function ringTicks(ring: OrbitRing, count = 12): Array<{ label: string } & Direction> {
  const out: Array<{ label: string } & Direction> = [];
  const periodMin = ring.periodMs / 60_000;
  for (let i = 1; i < count; i += 1) {
    const s = ring.samples[Math.round((i * (ring.samples.length - 1)) / count)];
    if (s === undefined || !s.ok) continue;
    out.push({ label: `+${Math.round((i * periodMin) / count)} min`, azimuthDeg: s.azimuthDeg, elevationDeg: s.elevationDeg });
  }
  return out;
}

function toVec(d: Direction): { x: number; y: number; z: number } {
  const az = d.azimuthDeg * DEG;
  const el = d.elevationDeg * DEG;
  return { x: Math.cos(el) * Math.sin(az), y: Math.sin(el), z: -Math.cos(el) * Math.cos(az) };
}

/** Mixes two directions as unit vectors (S9-2); the result is `b` when the mix degenerates. */
export function blendDirection(a: Direction, b: Direction, w: number): Direction {
  const va = toVec(a);
  const vb = toVec(b);
  const x = va.x * (1 - w) + vb.x * w;
  const y = va.y * (1 - w) + vb.y * w;
  const z = va.z * (1 - w) + vb.z * w;
  const n = Math.hypot(x, y, z);
  if (n < 1e-9) return b;
  return {
    azimuthDeg: normalizeAzimuthDeg(Math.atan2(x / n, -z / n) / DEG),
    elevationDeg: Math.asin(Math.max(-1, Math.min(1, y / n))) / DEG,
  };
}

/** Sample-wise blend of two rings; where either sample failed the sample of `to` is kept. */
export function blendRings(from: OrbitRing, to: OrbitRing, w: number): OrbitRing {
  const samples = to.samples.map((t, i): SkySample => {
    const f = from.samples[i];
    if (f === undefined || !f.ok || !t.ok) return t;
    return { ok: true, tMs: t.tMs, ...blendDirection(f, t, w) };
  });
  return { anchorMs: to.anchorMs, periodMs: to.periodMs, samples };
}