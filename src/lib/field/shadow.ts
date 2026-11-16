import type { Vec3 } from '../orbit/index';
import { SHADOW_EARTH_RADIUS_KM } from './constants';
import { sunDirection } from './sun';

/** Cylindrical model: Penumbra never occurs. */
export type IlluminationState = 'sunlit' | 'umbra';

export function illuminationState(eciPositionKm: Vec3, sunUnit: Vec3): IlluminationState {
  const dot = eciPositionKm.x * sunUnit.x + eciPositionKm.y * sunUnit.y + eciPositionKm.z * sunUnit.z;
  if (dot >= 0) return 'sunlit';
  const px = eciPositionKm.x - dot * sunUnit.x;
  const py = eciPositionKm.y - dot * sunUnit.y;
  const pz = eciPositionKm.z - dot * sunUnit.z;
  return Math.hypot(px, py, pz) < SHADOW_EARTH_RADIUS_KM ? 'umbra' : 'sunlit';
}

export function isInShadow(eciPositionKm: Vec3, instantMs: number): boolean {
  return illuminationState(eciPositionKm, sunDirection(instantMs)) === 'umbra';
}
