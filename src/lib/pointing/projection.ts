import { degToRad } from './angles';
import { VERTICAL_FOV_DEG } from './constants';
import type { CameraBasis, MarkerPosition, SceneVector } from './types';
import { dot } from './vector';

/**
 * Marker projection (C41). Independent of the lock: it never reads lock state.
 * aspect = viewport width / height. Points at or behind the camera plane are not in front.
 */
export function projectMarker(target: SceneVector, basis: CameraBasis, aspect: number): MarkerPosition {
  const zc = dot(target, basis.forward);
  if (zc <= 0) return { inFront: false };
  const t = Math.tan(degToRad(VERTICAL_FOV_DEG) / 2);
  const ndcX = dot(target, basis.right) / zc / (t * aspect);
  const ndcY = dot(target, basis.up) / zc / t;
  return { inFront: true, ndcX, ndcY, onScreen: Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1 };
}
