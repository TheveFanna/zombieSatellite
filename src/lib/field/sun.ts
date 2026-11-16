import type { Vec3 } from '../orbit/index';
import { gmstRad, julianDate } from './time';

const DEG = Math.PI / 180;

function wrap180(deg: number): number {
  const w = ((deg + 180) % 360 + 360) % 360 - 180;
  return w === -180 ? 180 : w;
}

/**
 * Unit vector toward the Sun in the equatorial frame, from the USNO approximate solar coordinates
 * (https://aa.usno.navy.mil/faq/sun_approx). Stated accuracy 0.02 deg over 2026 to 2030.
 */
export function sunDirection(instantMs: number): Vec3 {
  const d = julianDate(instantMs) - 2_451_545.0;
  const g = (357.529 + 0.98560028 * d) * DEG;
  const q = 280.459 + 0.98564736 * d;
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
  const e = (23.439 - 0.00000036 * d) * DEG;
  return { x: Math.cos(l), y: Math.cos(e) * Math.sin(l), z: Math.sin(e) * Math.sin(l) };
}

/** Latitude and longitude in degrees of the point where the Sun is at the zenith. */
export function subsolarPoint(instantMs: number): { latitudeDeg: number; longitudeDeg: number } {
  const s = sunDirection(instantMs);
  const latitudeDeg = Math.asin(s.z) / DEG;
  const alpha = Math.atan2(s.y, s.x);
  const longitudeDeg = wrap180((alpha - gmstRad(instantMs)) / DEG);
  return { latitudeDeg, longitudeDeg };
}
