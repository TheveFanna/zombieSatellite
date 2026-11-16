import type { Vec3 } from '../orbit/index';
import { FOOTPRINT_EARTH_RADIUS_KM, TERMINATOR_STEP_DEG } from './constants';
import { subsolarPoint } from './sun';

const DEG = Math.PI / 180;
const WGS84_A_KM = 6378.137;
const WGS84_B_KM = 6356.7523142;
const E2 = 1 - (WGS84_B_KM * WGS84_B_KM) / (WGS84_A_KM * WGS84_A_KM);

export interface MapPoint {
  readonly lonDeg: number;
  readonly latDeg: number;
}
export type MapLine = readonly MapPoint[];
export type MapRing = readonly MapPoint[];

function wrap180(deg: number): number {
  const w = ((deg + 180) % 360 + 360) % 360 - 180;
  return w === -180 ? 180 : w;
}

/** Geodetic latitude, longitude and altitude of an ECF position (WGS84, Bowring iteration). */
export function subSatellitePoint(ecfKm: Vec3): {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
} {
  const p = Math.hypot(ecfKm.x, ecfKm.y);
  const lon = Math.atan2(ecfKm.y, ecfKm.x);
  let phi = Math.atan2(ecfKm.z, p * (1 - E2));
  let n = WGS84_A_KM;
  for (let i = 0; i < 10; i += 1) {
    const s = Math.sin(phi);
    n = WGS84_A_KM / Math.sqrt(1 - E2 * s * s);
    const next = Math.atan2(ecfKm.z + E2 * n * s, p);
    const done = Math.abs(next - phi) < 1e-12;
    phi = next;
    if (done) break;
  }
  const s = Math.sin(phi);
  n = WGS84_A_KM / Math.sqrt(1 - E2 * s * s);
  const altitudeKm =
    Math.abs(phi) < 80 * DEG ? p / Math.cos(phi) - n : ecfKm.z / Math.sin(phi) - n * (1 - E2);
  return { latitudeDeg: phi / DEG, longitudeDeg: wrap180(lon / DEG), altitudeKm };
}

/** Angular radius in degrees of the 0-degree-elevation visibility circle on the spherical Earth. */
export function footprintAngularRadiusDeg(altitudeKm: number): number {
  const r = FOOTPRINT_EARTH_RADIUS_KM;
  return Math.acos(r / (r + Math.max(0, altitudeKm))) / DEG;
}

/** Closed ring of the visibility circle; longitudes are continuous around the center longitude. */
export function footprintRing(
  latitudeDeg: number,
  longitudeDeg: number,
  altitudeKm: number,
  points = 72,
): MapRing {
  const rho = footprintAngularRadiusDeg(altitudeKm) * DEG;
  const phi0 = latitudeDeg * DEG;
  const out: MapPoint[] = [];
  for (let i = 0; i < points; i += 1) {
    const theta = ((i * 360) / points) * DEG;
    const phi = Math.asin(
      Math.sin(phi0) * Math.cos(rho) + Math.cos(phi0) * Math.sin(rho) * Math.cos(theta),
    );
    const dLon = Math.atan2(
      Math.sin(theta) * Math.sin(rho) * Math.cos(phi0),
      Math.cos(rho) - Math.sin(phi0) * Math.sin(phi),
    );
    out.push({ lonDeg: longitudeDeg + dLon / DEG, latDeg: phi / DEG });
  }
  if (Math.abs(latitudeDeg) + rho / DEG > 90) {
    const pole = latitudeDeg >= 0 ? 90 : -90;
    // The ring wraps around the pole; order by longitude and close it through the pole.
    const sorted = [...out].sort((a, b) => a.lonDeg - b.lonDeg);
    return [
      { lonDeg: sorted[0].lonDeg, latDeg: pole },
      ...sorted,
      { lonDeg: sorted[sorted.length - 1].lonDeg, latDeg: pole },
    ];
  }
  return out;
}

/** Day-night boundary from the subsolar point; the night side lies toward `nightPoleLatDeg`. */
export function terminator(instantMs: number): {
  curve: readonly MapPoint[];
  nightPoleLatDeg: number;
} {
  const sub = subsolarPoint(instantMs);
  let dec = sub.latitudeDeg * DEG;
  if (Math.abs(dec) < 1e-6) dec = dec < 0 ? -1e-6 : 1e-6;
  const curve: MapPoint[] = [];
  for (let lon = -180; lon <= 180; lon += TERMINATOR_STEP_DEG) {
    const d = (lon - sub.longitudeDeg) * DEG;
    curve.push({ lonDeg: lon, latDeg: Math.atan(-Math.cos(d) / Math.tan(dec)) / DEG });
  }
  return { curve, nightPoleLatDeg: dec > 0 ? -90 : 90 };
}
