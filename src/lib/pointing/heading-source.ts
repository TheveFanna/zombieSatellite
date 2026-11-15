import { normalizeDeg360 } from './angles';
import type { HeadingSource, OrientationSample, SensorAttitude } from './types';

/** Requirement 2, criterion 2: highest priority first. */
export const HEADING_SOURCE_PRIORITY = ['absolute', 'compass', 'relative'] as const;

/** Requirement 2, criterion 1. */
export function selectHeadingSource(s: OrientationSample): HeadingSource {
  if (s.type === 'deviceorientationabsolute' || s.absolute === true) return 'absolute';
  if (s.webkitCompassHeading !== undefined) return 'compass';
  return 'relative';
}

/** Highest-priority source present; null for an empty list. */
export function pickHeadingSource(sources: readonly HeadingSource[]): HeadingSource | null {
  for (const candidate of HEADING_SOURCE_PRIORITY) {
    if (sources.includes(candidate)) return candidate;
  }
  return null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Valid_Sample per D4: "absolute" and "relative" need alpha, beta, gamma;
 * "compass" needs webkitCompassHeading, beta, gamma and never reads alpha.
 * Returns null when a required field is not a finite number; never substitutes a number.
 */
export function toSensorAttitude(s: OrientationSample): SensorAttitude | null {
  const source = selectHeadingSource(s);
  const { beta, gamma } = s;
  if (!isFiniteNumber(beta) || !isFiniteNumber(gamma)) return null;
  if (source === 'compass') {
    const heading = s.webkitCompassHeading;
    if (!isFiniteNumber(heading)) return null;
    return { source, compassHeadingDeg: heading, betaDeg: beta, gammaDeg: gamma };
  }
  const alpha = s.alpha;
  if (!isFiniteNumber(alpha)) return null;
  return { source, alphaDeg: alpha, betaDeg: beta, gammaDeg: gamma };
}

/** Finite number → [0, 360); anything else → 0. */
export function normalizeScreenOrientationDeg(raw: unknown): number {
  return isFiniteNumber(raw) ? normalizeDeg360(raw) : 0;
}
