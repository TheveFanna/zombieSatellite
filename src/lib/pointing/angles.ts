export function normalizeDeg360(v: number): number {
  return ((v % 360) + 360) % 360;
}

/** Wraps to (−180, 180]: 180 stays 180, −180 becomes 180. */
export function wrapDeg180(v: number): number {
  const w = normalizeDeg360(v);
  return w > 180 ? w - 360 : w;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
