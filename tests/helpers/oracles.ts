// Independent test oracles for the look angles (Requirement 7) and the Range_Rate (Requirement 8), used by
// Properties 9 and 11. They apply the formulas of Reference_Document section 2 (C24, C29, C30, C34 to C37,
// formula 2.9.2) and of Requirement 8, criterion 2 by hand, so that the Propagator is compared with a second
// implementation. This file imports nothing: it calls no satellite.js function and no engine module.

/** A vector in km (position) or km/s (velocity). Structurally the same as the engine's `Vec3`. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A geodetic Observer (C26 to C28). Structurally the same as the engine's `Observer`. */
export interface Observer {
  /** WGS84 geodetic latitude in degrees, north positive. */
  readonly latitudeDeg: number;
  /** Longitude in degrees, east positive. */
  readonly longitudeDeg: number;
  /** Altitude above the WGS84 ellipsoid in km, up positive. */
  readonly altitudeKm: number;
}

/** The look angles of the oracle, with the names and units of the Propagator's `LookAngles`. */
export interface LookAngles {
  /** C37: 0° north, 90° east, clockwise; formula 2.9.2 maps 2π rad to 0. */
  readonly azimuthDeg: number;
  /** C36: from −90° to +90°, up positive, no refraction. */
  readonly elevationDeg: number;
  /** C35: km. */
  readonly slantRangeKm: number;
}

/** The fields of a successful `propagateAt` result that the range-rate oracle reads. */
export interface PropagatedState {
  /** GMST θ in rad. */
  readonly gmstRad: number;
  /** TEME velocity v_teme in km/s. */
  readonly eciVelocityKmPerS: Vec3;
  /** ECF position r_ecf in km. */
  readonly ecfPositionKm: Vec3;
}

/** WGS84 semi-major and semi-minor axes in km (C29). */
const WGS84_A_KM = 6378.137;
const WGS84_B_KM = 6356.7523142;

/** Flattening f = (a − b) / a and first eccentricity squared e² = 2f − f² (C29). */
const FLATTENING = (WGS84_A_KM - WGS84_B_KM) / WGS84_A_KM;
const ECCENTRICITY_SQUARED = 2 * FLATTENING - FLATTENING * FLATTENING;

/** ω⊕ in rad/s about the ECF +Z axis (Glossary: Earth_Rotation_Rate). */
const EARTH_ROTATION_RATE_RAD_PER_S = 7.292115e-5;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number): number {
  return (radians / Math.PI) * 180;
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/** The Observer's ECF position in km (C30). */
function observerEcfKm(observer: Observer): Vec3 {
  const latitude = degreesToRadians(observer.latitudeDeg);
  const longitude = degreesToRadians(observer.longitudeDeg);
  const sinLatitude = Math.sin(latitude);
  const n = WGS84_A_KM / Math.sqrt(1 - ECCENTRICITY_SQUARED * sinLatitude * sinLatitude);
  const h = observer.altitudeKm;
  return {
    x: (n + h) * Math.cos(latitude) * Math.cos(longitude),
    y: (n + h) * Math.cos(latitude) * Math.sin(longitude),
    z: (n * (1 - ECCENTRICITY_SQUARED) + h) * sinLatitude,
  };
}

/**
 * Look angles of a satellite at the ECF position `ecfPositionKm` (km) as seen from `observer`: the Observer's ECF
 * position (C30), the south-east-up transform (C34), Slant_Range (C35), Elevation (C36) and Azimuth (C37, with the
 * normalisation of formula 2.9.2). For a satellite directly above the Observer the Azimuth is not meaningful, so
 * a test compares it only where the horizontal distance is large enough.
 */
export function lookAngleOracle(ecfPositionKm: Vec3, observer: Observer): LookAngles {
  const latitude = degreesToRadians(observer.latitudeDeg);
  const longitude = degreesToRadians(observer.longitudeDeg);
  const delta = subtract(ecfPositionKm, observerEcfKm(observer));

  // C34: S points south, E east, U up.
  const south =
    Math.sin(latitude) * Math.cos(longitude) * delta.x +
    Math.sin(latitude) * Math.sin(longitude) * delta.y -
    Math.cos(latitude) * delta.z;
  const east = -Math.sin(longitude) * delta.x + Math.cos(longitude) * delta.y;
  const up =
    Math.cos(latitude) * Math.cos(longitude) * delta.x +
    Math.cos(latitude) * Math.sin(longitude) * delta.y +
    Math.sin(latitude) * delta.z;

  const range = Math.sqrt(south * south + east * east + up * up); // C35
  const elevation = Math.asin(up / range); // C36
  let azimuth = Math.atan2(-east, south) + Math.PI; // C37
  if (azimuth >= 2 * Math.PI) azimuth -= 2 * Math.PI; // formula 2.9.2

  return {
    azimuthDeg: radiansToDegrees(azimuth),
    elevationDeg: radiansToDegrees(elevation),
    slantRangeKm: range,
  };
}

/**
 * Range_Rate in km/s from the outputs of a successful `propagateAt` (Requirement 8, criteria 1 and 2):
 * `(Rz(−θ)·v_teme − ω⊕ × r_ecf) · (r_ecf − r_obs) / ρ`, with Rz(−θ) the C24 rotation, ω⊕ = (0, 0, 7.292115e-5 rad/s),
 * r_obs the Observer's ECF position (C30) and ρ = |r_ecf − r_obs|. Negative while the satellite approaches.
 */
export function rangeRateOracle(state: PropagatedState, observer: Observer): number {
  const { gmstRad, eciVelocityKmPerS: v, ecfPositionKm: r } = state;

  // Rz(−θ) · v_teme, the C24 rotation applied to the velocity components.
  const cosTheta = Math.cos(gmstRad);
  const sinTheta = Math.sin(gmstRad);
  const vRotated: Vec3 = {
    x: v.x * cosTheta + v.y * sinTheta,
    y: -v.x * sinTheta + v.y * cosTheta,
    z: v.z,
  };

  // The Observer is fixed in the ECF frame, so the satellite's ECF velocity loses ω⊕ × r_ecf.
  const earthRotation = cross({ x: 0, y: 0, z: EARTH_ROTATION_RATE_RAD_PER_S }, r);
  const vEcf = subtract(vRotated, earthRotation);

  const lineOfSight = subtract(r, observerEcfKm(observer));
  const rho = Math.sqrt(dot(lineOfSight, lineOfSight));
  return dot(vEcf, lineOfSight) / rho;
}
