/** Earth gravitational parameter in km^3/s^2 (C19, formula 2.9.7). */
export const MU_KM3_PER_S2 = 398600.4418;

/** WGS84 equatorial radius in km (C19, C29). */
export const WGS84_A_KM = 6378.137;

/** Earth rotation rate about the ECF +Z axis in rad/s. */
export const EARTH_ROTATION_RATE_RAD_PER_S = 7.292115e-5;

/** Largest absolute time value of an ECMAScript Date, in ms. */
export const MAX_TIME_MS = 8.64e15;

/** CelesTrak general perturbations (GP) query endpoint. */
export const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php';

/** TLE_Cache time-to-live in ms: 2 h, the CelesTrak GP update interval (D9). */
export const TLE_CACHE_TTL_MS = 7_200_000;

/** Request_Timeout in ms; covers the Fetch_Function call and the body read (D10). */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Coarse_Scan step in ms (Requirement 10, criterion 1). */
export const COARSE_STEP_MS = 60_000;

/** Final bracket width of a rise or set refinement, in ms (Requirement 10, criterion 2). */
export const CROSSING_BRACKET_MS = 1_000;

/** Final bracket width of a peak refinement, in ms (Requirement 10, criterion 3). */
export const PEAK_BRACKET_MS = 100;

/** Default pass-search duration in hours (C81, Requirement 9, criterion 2). */
export const DEFAULT_WINDOW_HOURS = 24;

/** Maximum pass-search duration in hours (Requirement 9, criterion 8). */
export const MAX_WINDOW_HOURS = 168;

/** Default Min_Elevation in degrees (Requirement 9, criterion 3). */
export const DEFAULT_MIN_ELEVATION_DEG = 0;

/**
 * Radians to degrees (D8). Maps `Math.PI / 2` to exactly 90 and `2 * Math.PI` to exactly 360,
 * and is monotone.
 */
export function radToDeg(radians: number): number {
  return (radians / Math.PI) * 180;
}
