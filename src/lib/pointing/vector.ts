import { clamp, degToRad, normalizeDeg360, radToDeg } from './angles';
import { VERTICAL_EPSILON } from './constants';
import type { SceneVector } from './types';

/** Internal constructor: the only place that casts to the branded SceneVector. Not re-exported by the barrel. */
export function sceneVector(x: number, y: number, z: number): SceneVector {
  return { x, y, z } as SceneVector;
}

export function dot(a: SceneVector, b: SceneVector): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: SceneVector, b: SceneVector): SceneVector {
  return sceneVector(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

/** C43 with R = 1, Scene_Frame: az 0° → −Z, 90° → +X, 180° → +Z, 270° → −X. */
export function sceneDirection(azimuthDeg: number, elevationDeg: number): SceneVector {
  const az = degToRad(azimuthDeg);
  const el = degToRad(elevationDeg);
  return sceneVector(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
}

/**
 * Single heading and pitch extraction. ENU appears only as the local names east, north, up
 * (east = x, north = −z, up = y). headingDeg is null when the forward vector is vertical.
 */
export function headingPitch(forward: SceneVector): { headingDeg: number | null; pitchDeg: number } {
  const east = forward.x;
  const north = -forward.z;
  const up = forward.y;
  const horizontal = Math.hypot(east, north);
  const headingDeg = horizontal < VERTICAL_EPSILON ? null : normalizeDeg360(radToDeg(Math.atan2(east, north)));
  const pitchDeg = radToDeg(Math.asin(clamp(up, -1, 1)));
  return { headingDeg, pitchDeg };
}
