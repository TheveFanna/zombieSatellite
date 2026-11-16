// Pure dial geometry for the Satellite_Dial (S8, design "Satellite dial"). No DOM, no imports.

/** Degrees between two neighbouring slots; 0 for an empty dial. */
export function dialSlotDeg(count: number): number {
  return count > 0 ? 360 / count : 0;
}

/** Rotation of the dial group that puts node `index` at the top centre: -index * 360 / count. */
export function dialRotationDeg(index: number, count: number): number {
  return -index * dialSlotDeg(count);
}

/** Angle of node `index` on the unrotated dial, clockwise from the top: index * 360 / count. */
export function dialNodeAngleDeg(index: number, count: number): number {
  return index * dialSlotDeg(count);
}

/** Nearest node for a rotation, wrapped into [0, count). */
export function dialIndexFromRotation(rotationDeg: number, count: number): number {
  if (count <= 0 || !Number.isFinite(rotationDeg)) return 0;
  const raw = Math.round(-rotationDeg / dialSlotDeg(count));
  return ((raw % count) + count) % count;
}

/** Selection after dragging `deltaDeg` (clockwise positive) starting from node `startIndex`. */
export function dialIndexFromDrag(startIndex: number, deltaDeg: number, count: number): number {
  return dialIndexFromRotation(dialRotationDeg(startIndex, count) + deltaDeg, count);
}

/** Neighbour of `index` (step +1 next, -1 previous), wrapping around. */
export function dialStep(index: number, step: 1 | -1, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}
