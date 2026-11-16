import { propagateAt } from '../orbit/index';
import type { Satrec } from '../orbit/index';
import { GROUND_TRACK_STEPS } from './constants';
import { subSatellitePoint } from './geodetic';
import type { MapLine, MapPoint } from './geodetic';

/** Orbital period in minutes from the TLE mean motion in revolutions per day. */
export function orbitalPeriodMin(meanMotionRevPerDay: number): number {
  return 1440 / meanMotionRevPerDay;
}

function sampleLines(satrec: Satrec, instantsMs: readonly number[]): MapLine[] {
  const lines: MapPoint[][] = [];
  let current: MapPoint[] = [];
  let prevLon: number | null = null;
  const flush = (): void => {
    if (current.length > 0) lines.push(current);
    current = [];
    prevLon = null;
  };
  for (const t of instantsMs) {
    const r = propagateAt(satrec, t);
    if (!r.ok) {
      flush();
      continue;
    }
    const g = subSatellitePoint(r.ecfPositionKm);
    if (prevLon !== null && Math.abs(g.longitudeDeg - prevLon) > 180) flush();
    current.push({ lonDeg: g.longitudeDeg, latDeg: g.latitudeDeg });
    prevLon = g.longitudeDeg;
  }
  flush();
  return lines;
}

/** One period back and forward from `centerMs`, on an absolute time grid, split at the antimeridian. */
export function groundTrack(
  satrec: Satrec,
  centerMs: number,
  periodMin: number,
): { past: readonly MapLine[]; future: readonly MapLine[]; stepMs: number } {
  const periodMs = periodMin * 60_000;
  const stepMs = periodMs / GROUND_TRACK_STEPS;
  const first = Math.ceil((centerMs - periodMs) / stepMs);
  const last = Math.floor((centerMs + periodMs) / stepMs);
  const past: number[] = [];
  const future: number[] = [];
  for (let k = first; k <= last; k += 1) {
    const t = k * stepMs;
    if (t < centerMs) past.push(t);
    else if (t > centerMs) future.push(t);
  }
  past.push(centerMs);
  future.unshift(centerMs);
  return { past: sampleLines(satrec, past), future: sampleLines(satrec, future), stepMs };
}
