import { degreesToRadians, ecfToLookAngles, eciToEcf, geodeticToEcf, gstime, propagate } from 'satellite.js';
import type { GeodeticLocation, PositionAndVelocity, SatRec as Satrec } from 'satellite.js';
import { EARTH_ROTATION_RATE_RAD_PER_S, radToDeg } from './constants';
import { toTimeMs } from './time';
import type { TimeInput } from './time';
import { assertObserver, assertSatrec } from './validate';

/** A vector in km (position) or km/s (velocity). A result holds fresh copies, never satellite.js objects. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** SGP4 propagation succeeded (Requirement 6, criteria 2, 3, 4 and 11). */
export interface PropagationSuccess {
  readonly ok: true;
  /** The integer evaluation instant, in ms since 1970-01-01T00:00:00Z. */
  readonly timeMs: number;
  /** GMST in rad, as satellite.js `gstime` returns it (C22). */
  readonly gmstRad: number;
  /** ECI_Position in km, TEME (C20, C21). */
  readonly eciPositionKm: Vec3;
  /** ECI_Velocity in km/s, TEME. */
  readonly eciVelocityKmPerS: Vec3;
  /** ECF_Position in km (C23, C24). */
  readonly ecfPositionKm: Vec3;
}

/**
 * SGP4 propagation failed (D5; Requirement 6, criterion 5). The result carries no position, velocity,
 * look angles or range rate (criterion 12).
 */
export interface PropagationFailure {
  readonly ok: false;
  readonly timeMs: number;
  /** GMST in rad, also reported on failure (Requirement 6, criterion 3). */
  readonly gmstRad: number;
  /** `satrec.error` after the call; 6 for the ISS Baseline_TLE_Snapshot at EPOCH + 3650 days. */
  readonly satrecError: number;
}

export type PropagationResult = PropagationSuccess | PropagationFailure;

/**
 * A position on or above the WGS84 ellipsoid. `observeAt` accepts a latitude in [-90, 90], a longitude in
 * [-180, 180] and a finite altitude, all of type number, and throws `invalid-input` otherwise
 * (Requirement 7, criterion 4).
 */
export interface Observer {
  /** WGS84 geodetic latitude in degrees, north positive (C26). */
  readonly latitudeDeg: number;
  /** Longitude in degrees, east positive (C27). */
  readonly longitudeDeg: number;
  /** Altitude above the ellipsoid in km, up positive (C28). */
  readonly altitudeKm: number;
}

/** Look_Angles of formula 2.9.2, in the units of Requirement 2, criterion 6. */
export interface LookAngles {
  /** Azimuth in degrees in [0, 360): 0 = north, 90 = east, clockwise (C37). */
  readonly azimuthDeg: number;
  /** Elevation in degrees in [-90, 90], up positive, no refraction (C36). */
  readonly elevationDeg: number;
  /** Slant_Range in km (C35). */
  readonly slantRangeKm: number;
}

/** Propagation succeeded; the result adds the Look_Angles (Requirement 7) and the Range_Rate (Requirement 8). */
export interface ObservationSuccess extends PropagationSuccess {
  readonly lookAngles: LookAngles;
  /** Range_Rate in km/s: negative while the satellite approaches, positive while it recedes. */
  readonly rangeRateKmPerS: number;
}

/** An observation succeeded, or SGP4 propagation failed and the result carries no look angles or range rate. */
export type ObservationResult = ObservationSuccess | PropagationFailure;

/** True for an object whose x, y and z are finite numbers (Requirement 6, criterion 5). */
function isFiniteVec3(value: unknown): value is Vec3 {
  if (typeof value !== 'object' || value === null) return false;
  const { x, y, z } = value as { readonly x?: unknown; readonly y?: unknown; readonly z?: unknown };
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}

/** A fresh plain object with the three components of `vector`. */
function copyVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

/**
 * Internal, not exported from index.ts. Propagates `satrec` to the integer instant `timeMs`, which the
 * caller has already validated (Requirement 6, criteria 2 to 5, 11 and 12). The ECI and ECF vectors are
 * the satellite.js values component by component.
 */
export function propagateMs(satrec: Satrec, timeMs: number): PropagationResult {
  const date = new Date(timeMs);
  const gmstRad = gstime(date);

  // satellite.js 6.0.2 returns null on its failure paths, which the Date overload does not declare.
  let state: PositionAndVelocity | null;
  try {
    state = propagate(satrec, date);
  } catch {
    // A thrown exception counts as a propagation failure (Requirement 6, criterion 5).
    state = null;
  }

  if (state === null || satrec.error !== 0 || !isFiniteVec3(state.position) || !isFiniteVec3(state.velocity)) {
    return { ok: false, timeMs, gmstRad, satrecError: satrec.error };
  }

  const ecf = eciToEcf(state.position, gmstRad);
  return {
    ok: true,
    timeMs,
    gmstRad,
    eciPositionKm: copyVec3(state.position),
    eciVelocityKmPerS: copyVec3(state.velocity),
    ecfPositionKm: copyVec3(ecf),
  };
}

/**
 * Propagates `satrec` to `instant` with SGP4 (design.md, "Propagator"). The checks run in a fixed order
 * (D18): the Satrec first, then the instant. A Date and the number equal to its time value give identical
 * results (Requirement 2, criterion 4). An SGP4 failure is returned as `{ ok: false }`, not thrown.
 * A value that is not a Satrec, or an invalid instant, throws `invalid-input` (Requirement 6, criterion 6).
 */
export function propagateAt(satrec: Satrec, instant: TimeInput): PropagationResult {
  assertSatrec(satrec);
  const timeMs = toTimeMs(instant, 'instant');
  return propagateMs(satrec, timeMs);
}

/**
 * Maps an azimuth in degrees into [0, 360) (D7; Requirement 7, criteria 8 and 10; formula 2.9.2). It is the
 * identity on [0, 360), maps 360 to exactly +0 (never -0), maps every finite input into [0, 360), returns NaN
 * for NaN and for +Infinity and -Infinity, and never throws. With `radToDeg` (D8), the 2 pi rad that C37 can
 * return for a satellite due north of the Observer is reported as exactly 0.
 */
export function normalizeAzimuthDeg(azimuthDeg: number): number {
  const remainder = azimuthDeg % 360;
  const wrapped = remainder < 0 ? remainder + 360 : remainder;
  // A tiny negative remainder rounds to exactly 360 when 360 is added; "+ 0" turns -0 into +0.
  return (wrapped >= 360 ? 0 : wrapped) + 0;
}

/**
 * Internal, not exported from index.ts. An Observer converted once for repeated evaluations: the geodetic
 * position in radians and km, the form satellite.js takes, and the Observer ECF position in km (C29, C30).
 */
export interface PreparedObserver {
  readonly geodetic: Readonly<GeodeticLocation>;
  readonly ecfKm: Vec3;
}

/**
 * Internal, not exported from index.ts. Converts an Observer that passed `assertObserver` once: degrees to
 * radians with satellite.js `degreesToRadians`, and the ECF position by `geodeticToEcf` (C29, C30).
 */
export function prepareObserver(observer: Observer): PreparedObserver {
  const geodetic: GeodeticLocation = {
    latitude: degreesToRadians(observer.latitudeDeg),
    longitude: degreesToRadians(observer.longitudeDeg),
    height: observer.altitudeKm,
  };
  return { geodetic, ecfKm: geodeticToEcf(geodetic) };
}

/**
 * Internal, not exported from index.ts; the Pass_Predictor uses it. Propagates `satrec` to the integer
 * instant `timeMs`, which the caller has already validated, and returns the Look_Angles and the Range_Rate
 * for a prepared Observer. A propagation failure is returned unchanged (Requirement 6, criterion 12).
 */
export function observeMs(satrec: Satrec, timeMs: number, observer: PreparedObserver): ObservationResult {
  const state = propagateMs(satrec, timeMs);
  if (!state.ok) return state;

  // C34 to C37 on the ECF position (Requirement 7, criteria 1 to 3). The Elevation clamp guards the range;
  // with D8 the Elevation never leaves [-90, 90] anyway.
  const { azimuth, elevation, rangeSat } = ecfToLookAngles(observer.geodetic, state.ecfPositionKm);
  const lookAngles: LookAngles = {
    azimuthDeg: normalizeAzimuthDeg(radToDeg(azimuth)),
    elevationDeg: Math.min(90, Math.max(-90, radToDeg(elevation))),
    slantRangeKm: rangeSat,
  };

  // Requirement 8, criterion 2: v_ecf = Rz(-theta) * v_teme - w x r_ecf, with w = (0, 0, Earth_Rotation_Rate).
  // Rz(-theta) is the C24 rotation applied to the velocity; w x r_ecf = (-w * r.y, w * r.x, 0). The
  // Earth-rotation term is required (criterion 3): rotating only the velocity misses the baselines.
  const { gmstRad, eciVelocityKmPerS: velocity, ecfPositionKm: position } = state;
  const cosTheta = Math.cos(gmstRad);
  const sinTheta = Math.sin(gmstRad);
  const rotatedX = velocity.x * cosTheta + velocity.y * sinTheta;
  const rotatedY = -velocity.x * sinTheta + velocity.y * cosTheta;
  const ecfVelocityX = rotatedX + EARTH_ROTATION_RATE_RAD_PER_S * position.y;
  const ecfVelocityY = rotatedY - EARTH_ROTATION_RATE_RAD_PER_S * position.x;
  const ecfVelocityZ = velocity.z;

  // Requirement 8, criteria 1 and 4: v_ecf dotted with (r_ecf - r_obs) / rho, negative while approaching.
  const lineOfSightX = position.x - observer.ecfKm.x;
  const lineOfSightY = position.y - observer.ecfKm.y;
  const lineOfSightZ = position.z - observer.ecfKm.z;
  const rangeRateKmPerS =
    (ecfVelocityX * lineOfSightX + ecfVelocityY * lineOfSightY + ecfVelocityZ * lineOfSightZ) / rangeSat;

  return { ...state, lookAngles, rangeRateKmPerS };
}

/**
 * Propagates `satrec` to `instant` and returns the Look_Angles and the Range_Rate for `observer`
 * (design.md, "Propagator"). The checks run in a fixed order (D18) before any propagation: the Satrec, the
 * instant, then the Observer, so an invalid Observer throws `invalid-input` also at an instant where SGP4
 * fails (Requirement 7, criterion 4). An SGP4 failure is returned as `{ ok: false }`, not thrown.
 */
export function observeAt(satrec: Satrec, instant: TimeInput, observer: Observer): ObservationResult {
  assertSatrec(satrec);
  const timeMs = toTimeMs(instant, 'instant');
  assertObserver(observer);
  return observeMs(satrec, timeMs, prepareObserver(observer));
}
