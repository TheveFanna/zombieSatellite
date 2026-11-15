import type { TargetDirection } from '../pointing/index';

export const AUTO_POINT_EXCURSION_PROBABILITY = 0.1;
export const AUTO_POINT_WOBBLE_MIN_DEG = 1;
export const AUTO_POINT_WOBBLE_MAX_DEG = 8; // exclusive
export const AUTO_POINT_EXCURSION_MIN_DEG = 12;
export const AUTO_POINT_EXCURSION_MAX_DEG = 20; // exclusive

export interface Jitter {
  readonly offsetDeg: number;
  readonly bearingDeg: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Maps three Noise_Source values in [0, 1) to a jitter: excursion when u2 < 0.1, otherwise wobble. */
export function drawJitter(u1: number, u2: number, u3: number): Jitter {
  const excursion = u2 < AUTO_POINT_EXCURSION_PROBABILITY;
  const offsetDeg = excursion
    ? AUTO_POINT_EXCURSION_MIN_DEG + (AUTO_POINT_EXCURSION_MAX_DEG - AUTO_POINT_EXCURSION_MIN_DEG) * u1
    : AUTO_POINT_WOBBLE_MIN_DEG + (AUTO_POINT_WOBBLE_MAX_DEG - AUTO_POINT_WOBBLE_MIN_DEG) * u1;
  return { offsetDeg, bearingDeg: 360 * u3 };
}

/**
 * Great-circle destination point from the target at distance offsetDeg and initial bearing bearingDeg,
 * with elevation as latitude and azimuth as longitude. Azimuth is normalized to [0, 360).
 */
export function offsetDirection(target: TargetDirection, jitter: Jitter): TargetDirection {
  const phi1 = target.elevationDeg * DEG_TO_RAD;
  const lambda1 = target.azimuthDeg * DEG_TO_RAD;
  const delta = jitter.offsetDeg * DEG_TO_RAD;
  const theta = jitter.bearingDeg * DEG_TO_RAD;

  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.min(1, Math.max(-1, sinPhi2)));
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * sinPhi2,
    );

  let azimuthDeg = (((lambda2 * RAD_TO_DEG) % 360) + 360) % 360;
  if (azimuthDeg >= 360) azimuthDeg = 0; // rounding of a tiny negative value
  return { azimuthDeg, elevationDeg: phi2 * RAD_TO_DEG };
}
