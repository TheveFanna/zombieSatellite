import type { SceneVector } from './types';
import { sceneVector } from './vector';

/** Internal module, not re-exported by the barrel. Hand-written quaternion math (Requirement 10.3). */

/** Quaternion in (x, y, z, w) order, Hamilton convention. */
export interface Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export type QuaternionAxis = 'X' | 'Y' | 'Z';

/** Rotation by `rad` about the unit axis X, Y or Z. */
export function qAxis(axis: QuaternionAxis, rad: number): Quaternion {
  const half = rad / 2;
  const s = Math.sin(half);
  const c = Math.cos(half);
  switch (axis) {
    case 'X':
      return { x: s, y: 0, z: 0, w: c };
    case 'Y':
      return { x: 0, y: s, z: 0, w: c };
    case 'Z':
      return { x: 0, y: 0, z: s, w: c };
  }
}

/** Hamilton product a ⊗ b: applying the result equals applying b first, then a. */
export function multiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

function conjugate(q: Quaternion): Quaternion {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

/** Active rotation v' = q v q*, with v embedded as the pure quaternion (v, 0). */
export function rotate(q: Quaternion, v: SceneVector): SceneVector {
  const r = multiply(multiply(q, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate(q));
  return sceneVector(r.x, r.y, r.z);
}
