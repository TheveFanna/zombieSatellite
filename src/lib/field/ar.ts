import {
  LOCK_TOLERANCE_DEG,
  VERTICAL_FOV_DEG,
  effectiveAzimuthDeg,
  headingPitch,
  projectMarker,
  sceneDirection,
} from '../pointing/index';
import type { CameraBasis, MarkerPosition, SceneVector } from '../pointing/index';
import { AR_NDC_LIMIT } from './constants';
import type { SkySampleOk, SkyTrack } from './sky-track';

export interface ArPoint { readonly ndcX: number; readonly ndcY: number }
export interface ArPiece {
  readonly inShadow: boolean;
  /** Elevation below 0°: the overlay draws the piece dashed. */
  readonly belowHorizon: boolean;
  readonly points: readonly ArPoint[];
}

const DEG = Math.PI / 180;

/** Landed projectMarker (fixed 75°) rescaled by a tangent ratio; identical to it at 75°. */
export function projectAr(
  target: SceneVector,
  basis: CameraBasis,
  aspect: number,
  verticalFovDeg: number,
): MarkerPosition {
  const base = projectMarker(target, basis, aspect);
  if (!base.inFront) return base;
  const k = Math.tan((VERTICAL_FOV_DEG * Math.PI) / 360) / Math.tan((verticalFovDeg * Math.PI) / 360);
  const ndcX = base.ndcX * k;
  const ndcY = base.ndcY * k;
  return { inFront: true, ndcX, ndcY, onScreen: Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1 };
}

function dir(az: number, el: number, offsetDeg: number): SceneVector {
  return sceneDirection(effectiveAzimuthDeg(az, offsetDeg), el);
}

export function arMarker(
  az: number,
  el: number,
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): MarkerPosition {
  return projectAr(dir(az, el, offsetDeg), basis, aspect, fovDeg);
}

/** A drawable point: in front and within AR_NDC_LIMIT. */
function drawable(m: MarkerPosition): m is Extract<MarkerPosition, { inFront: true }> {
  return m.inFront && Math.abs(m.ndcX) <= AR_NDC_LIMIT && Math.abs(m.ndcY) <= AR_NDC_LIMIT;
}

/** Projects a polyline of az/el points; splits at behind and out-of-limit points. */
function projectPolyline(
  pts: ReadonlyArray<{ az: number; el: number }>,
  inShadow: boolean,
  belowHorizon: boolean,
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): ArPiece[] {
  const out: ArPiece[] = [];
  let cur: ArPoint[] | null = null;
  for (const p of pts) {
    const m = arMarker(p.az, p.el, offsetDeg, basis, aspect, fovDeg);
    if (!drawable(m)) {
      cur = null;
      continue;
    }
    if (cur === null) {
      cur = [];
      out.push({ inShadow, belowHorizon, points: cur });
    }
    cur.push({ ndcX: m.ndcX, ndcY: m.ndcY });
  }
  return out;
}

export function projectTrackArc(
  segments: ReadonlyArray<{ inShadow: boolean; belowHorizon?: boolean; samples: readonly SkySampleOk[] }>,
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): ArPiece[] {
  const out: ArPiece[] = [];
  for (const seg of segments) {
    const pts = seg.samples.map((s) => ({ az: s.azimuthDeg, el: s.elevationDeg }));
    out.push(...projectPolyline(pts, seg.inShadow, seg.belowHorizon === true, offsetDeg, basis, aspect, fovDeg));
  }
  return out;
}

export function projectTicks(
  track: SkyTrack,
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): Array<{ tMs: number; ndcX: number; ndcY: number }> {
  const out: Array<{ tMs: number; ndcX: number; ndcY: number }> = [];
  for (const t of track.tickMs) {
    const s = track.samples.find((x) => x.tMs === t);
    if (s === undefined || !s.ok) continue;
    const m = arMarker(s.azimuthDeg, s.elevationDeg, offsetDeg, basis, aspect, fovDeg);
    if (drawable(m)) out.push({ tMs: t, ndcX: m.ndcX, ndcY: m.ndcY });
  }
  return out;
}

export function horizonLine(
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): ArPiece[] {
  const pts: Array<{ az: number; el: number }> = [];
  for (let az = 0; az <= 360; az += 5) pts.push({ az, el: 0 });
  return projectPolyline(pts, false, false, offsetDeg, basis, aspect, fovDeg);
}

export function cardinalMarks(
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): Array<{ label: 'N' | 'E' | 'S' | 'W'; ndcX: number; ndcY: number }> {
  const marks = [
    { label: 'N', az: 0 },
    { label: 'E', az: 90 },
    { label: 'S', az: 180 },
    { label: 'W', az: 270 },
  ] as const;
  const out: Array<{ label: 'N' | 'E' | 'S' | 'W'; ndcX: number; ndcY: number }> = [];
  for (const c of marks) {
    const m = arMarker(c.az, 0, offsetDeg, basis, aspect, fovDeg);
    if (m.inFront && Math.abs(m.ndcX) <= 1.2 && Math.abs(m.ndcY) <= 1.2) {
      out.push({ label: c.label, ndcX: m.ndcX, ndcY: m.ndcY });
    }
  }
  return out;
}

export function lockRing(
  az: number,
  el: number,
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): ArPiece[] {
  const u = dir(az, el, offsetDeg);
  // e1 is horizontal and perpendicular to u (or east at the zenith); e2 = u x e1.
  const h = Math.hypot(u.x, u.z);
  const e1 = h < 1e-9 ? { x: 1, y: 0, z: 0 } : { x: -u.z / h, y: 0, z: u.x / h };
  const e2 = {
    x: u.y * e1.z - u.z * e1.y,
    y: u.z * e1.x - u.x * e1.z,
    z: u.x * e1.y - u.y * e1.x,
  };
  const rho = LOCK_TOLERANCE_DEG * DEG;
  const c = Math.cos(rho);
  const s = Math.sin(rho);
  const pieces: ArPiece[] = [];
  let cur: ArPoint[] | null = null;
  for (let i = 0; i <= 36; i += 1) {
    const th = ((i % 36) / 36) * 2 * Math.PI;
    const ct = Math.cos(th);
    const st = Math.sin(th);
    const x = c * u.x + s * (ct * e1.x + st * e2.x);
    const y = c * u.y + s * (ct * e1.y + st * e2.y);
    const z = c * u.z + s * (ct * e1.z + st * e2.z);
    // Rebuild a SceneVector through the pointing barrel (heading and pitch of the point).
    const hp = headingPitch({ x, y, z } as SceneVector);
    const p = sceneDirection(hp.headingDeg ?? 0, hp.pitchDeg);
    const m = projectAr(p, basis, aspect, fovDeg);
    if (!drawable(m)) {
      cur = null;
      continue;
    }
    if (cur === null) {
      cur = [];
      pieces.push({ inShadow: false, belowHorizon: false, points: cur });
    }
    cur.push({ ndcX: m.ndcX, ndcY: m.ndcY });
  }
  return pieces;
}

export function edgeArrow(
  az: number,
  el: number,
  offsetDeg: number,
  basis: CameraBasis,
  aspect: number,
  fovDeg: number,
): { angleRad: number; ndcX: number; ndcY: number } | null {
  const u = dir(az, el, offsetDeg);
  const m = projectAr(u, basis, aspect, fovDeg);
  if (m.inFront && m.onScreen) return null;
  const rx = u.x * basis.right.x + u.y * basis.right.y + u.z * basis.right.z;
  const ry = u.x * basis.up.x + u.y * basis.up.y + u.z * basis.up.z;
  if (Math.abs(rx) < 1e-9 && Math.abs(ry) < 1e-9) return { angleRad: 0, ndcX: 0.9, ndcY: 0 };
  const angleRad = Math.atan2(ry, rx);
  const scale = 0.9 / Math.max(Math.abs(rx), Math.abs(ry));
  return { angleRad, ndcX: rx * scale, ndcY: ry * scale };
}
