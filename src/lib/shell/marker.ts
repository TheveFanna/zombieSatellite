import { effectiveAzimuthDeg, projectMarker, sceneDirection } from '../pointing/index';
import type { CameraBasis, TargetDirection } from '../pointing/index';

/** Width / height of the Sky_View box (CSS `aspect-ratio: 3 / 4`). */
export const SKY_VIEW_ASPECT = 3 / 4;

export type MarkerPlacement =
  | { readonly kind: 'none' }
  | { readonly kind: 'out-of-view' }
  | { readonly kind: 'on-screen'; readonly leftPct: number; readonly topPct: number };

/**
 * Where the marker sits in the Sky_View. The target vector is built exactly as `evaluateLock`
 * builds it (calibrated azimuth), so the marker and the lock agree. NDC +y is up, CSS top is down.
 */
export function markerPlacement(
  target: TargetDirection | null,
  calibrationOffsetDeg: number,
  basis: CameraBasis | null,
): MarkerPlacement {
  if (target === null || basis === null) return { kind: 'none' };
  const vector = sceneDirection(effectiveAzimuthDeg(target.azimuthDeg, calibrationOffsetDeg), target.elevationDeg);
  const marker = projectMarker(vector, basis, SKY_VIEW_ASPECT);
  if (!marker.inFront || !marker.onScreen) return { kind: 'out-of-view' };
  return { kind: 'on-screen', leftPct: (marker.ndcX + 1) * 50, topPct: (1 - marker.ndcY) * 50 };
}
