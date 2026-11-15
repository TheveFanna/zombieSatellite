import { clamp, radToDeg, wrapDeg180 } from './angles';
import { effectiveAzimuthDeg } from './calibration';
import { LOCK_COMPARISON_EPSILON_DEG, LOCK_TOLERANCE_DEG } from './constants';
import type { LockResult, SceneVector, TargetDirection } from './types';
import { dot, headingPitch, sceneDirection } from './vector';

/** Lock geometry: angle between the forward vector and the calibrated target direction (C52, D5). */
export function evaluateLock(
  forward: SceneVector,
  target: TargetDirection,
  calibrationOffsetDeg: number,
): LockResult {
  const azEff = effectiveAzimuthDeg(target.azimuthDeg, calibrationOffsetDeg);
  const u = sceneDirection(azEff, target.elevationDeg);
  const d = dot(forward, u);
  const pointingErrorDeg = radToDeg(Math.acos(clamp(d, -1, 1)));
  const locked = pointingErrorDeg <= LOCK_TOLERANCE_DEG + LOCK_COMPARISON_EPSILON_DEG;
  const behind = d < 0;
  const { headingDeg, pitchDeg } = headingPitch(forward);
  return {
    pointingErrorDeg,
    locked,
    behind,
    deviceHeadingDeg: headingDeg,
    devicePitchDeg: pitchDeg,
    effectiveAzimuthDeg: azEff,
    azimuthDifferenceDeg: headingDeg === null ? null : wrapDeg180(azEff - headingDeg),
    elevationDifferenceDeg: target.elevationDeg - pitchDeg,
  };
}
