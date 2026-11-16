/**
 * Sky dome geometry (S6 task 7C). An azimuthal equidistant projection of the sky seen from the
 * observer: the zenith at the centre, the horizon on a circle of radius `radius`, north up, east right.
 * Screen coordinates follow SVG: +x right, +y down.
 */
export interface DomePoint {
  readonly x: number;
  readonly y: number;
}

const DEG = Math.PI / 180;

/** The dome point of a direction, or null below the horizon (elevation < 0). */
export function domePoint(azimuthDeg: number, elevationDeg: number, radius: number): DomePoint | null {
  if (!Number.isFinite(azimuthDeg) || !Number.isFinite(elevationDeg) || elevationDeg < 0) return null;
  const r = (radius * (90 - Math.min(elevationDeg, 90))) / 90;
  return { x: r * Math.sin(azimuthDeg * DEG), y: -r * Math.cos(azimuthDeg * DEG) };
}

/** The dome radius of an angular distance near the zenith-to-horizon scale (degrees of elevation). */
export function domeRadius(angleDeg: number, radius: number): number {
  return (radius * angleDeg) / 90;
}

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * A schematic elevation-over-time profile of a pass: it rises at x = 0, peaks at the share of the
 * pass where `peakMs` lies, at a height of maxElevation / 90 of `height`, and sets at x = `width`.
 * Two cubic segments meet at the peak with a horizontal tangent. y = `height` is the horizon.
 */
export function passProfilePath(
  riseMs: number,
  peakMs: number,
  setMs: number,
  maxElevationDeg: number,
  width: number,
  height: number,
): string {
  const span = setMs - riseMs;
  const share = span > 0 ? Math.min(Math.max((peakMs - riseMs) / span, 0), 1) : 0.5;
  const px = share * width;
  const py = height - (Math.min(Math.max(maxElevationDeg, 0), 90) / 90) * height;
  return [
    `M 0 ${fmt(height)}`,
    `C ${fmt(px * 0.45)} ${fmt(height)} ${fmt(px * 0.55)} ${fmt(py)} ${fmt(px)} ${fmt(py)}`,
    `C ${fmt(px + (width - px) * 0.45)} ${fmt(py)} ${fmt(px + (width - px) * 0.55)} ${fmt(height)} ${fmt(width)} ${fmt(height)}`,
  ].join(' ');
}