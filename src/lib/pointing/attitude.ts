import { clamp, degToRad, normalizeDeg360 } from './angles';
import { DRAG_SENSITIVITY_DEG_PER_PX } from './constants';
import { multiply, qAxis, rotate } from './quaternion';
import type { Quaternion } from './quaternion';
import type { CameraBasis, DragPose, SensorAttitude } from './types';
import { cross, headingPitch, sceneDirection, sceneVector } from './vector';

/** Pose at the start of Drag_Compass mode: north, level. */
export const INITIAL_DRAG_POSE: DragPose = { headingDeg: 0, pitchDeg: 0 };

/** Formula 2.9.5 (C61): qAxis(Y, α_eff) ⊗ qAxis(X, β) ⊗ qAxis(Z, −γ) ⊗ qAxis(X, −90°) ⊗ qAxis(Z, −σ). */
function cameraQuaternion(alphaEffDeg: number, betaDeg: number, gammaDeg: number, screenOrientationDeg: number): Quaternion {
  let q = qAxis('Y', degToRad(alphaEffDeg));
  q = multiply(q, qAxis('X', degToRad(betaDeg)));
  q = multiply(q, qAxis('Z', -degToRad(gammaDeg)));
  q = multiply(q, qAxis('X', -Math.PI / 2));
  q = multiply(q, qAxis('Z', -degToRad(screenOrientationDeg)));
  return q;
}

function basisFromQuaternion(q: Quaternion): CameraBasis {
  return {
    forward: rotate(q, sceneVector(0, 0, -1)),
    up: rotate(q, sceneVector(0, 1, 0)),
    right: rotate(q, sceneVector(1, 0, 0)),
  };
}

/** Effective alpha per Heading_Source (D3). The "compass" path never reads alpha. */
function effectiveAlphaDeg(a: SensorAttitude, screenOrientationDeg: number, declinationDeg: number): number {
  switch (a.source) {
    case 'relative':
      return a.alphaDeg;
    case 'absolute':
      return a.alphaDeg - declinationDeg;
    case 'compass': {
      const atZero = basisFromQuaternion(cameraQuaternion(0, a.betaDeg, a.gammaDeg, screenOrientationDeg));
      const h0 = headingPitch(atZero.forward).headingDeg ?? 0;
      return h0 - (a.compassHeadingDeg + declinationDeg);
    }
  }
}

export function cameraBasisFromSensor(
  attitude: SensorAttitude,
  screenOrientationDeg: number,
  declinationDeg: number,
): CameraBasis {
  const alphaEff = effectiveAlphaDeg(attitude, screenOrientationDeg, declinationDeg);
  return basisFromQuaternion(cameraQuaternion(alphaEff, attitude.betaDeg, attitude.gammaDeg, screenOrientationDeg));
}

export function cameraBasisFromDrag(pose: DragPose): CameraBasis {
  const forward = sceneDirection(pose.headingDeg, pose.pitchDeg);
  const heading = degToRad(pose.headingDeg);
  const right = sceneVector(Math.cos(heading), 0, Math.sin(heading));
  return { forward, up: cross(right, forward), right };
}

/** Device-steering direction: drag right raises the heading; drag toward the top (dy < 0) raises the pitch. */
export function applyDrag(pose: DragPose, dxPx: number, dyPx: number): DragPose {
  return {
    headingDeg: normalizeDeg360(pose.headingDeg + DRAG_SENSITIVITY_DEG_PER_PX * dxPx),
    pitchDeg: clamp(pose.pitchDeg - DRAG_SENSITIVITY_DEG_PER_PX * dyPx, -90, 90),
  };
}
