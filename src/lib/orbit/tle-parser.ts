import { propagate, twoline2satrec } from 'satellite.js';
import { MU_KM3_PER_S2, WGS84_A_KM } from './constants';
import { EngineError } from './errors';

/**
 * One TLE accepted by `parseTle` (Data Models). The record is frozen; every field is a primitive, so
 * the freeze is deep. BSTAR, MEAN_MOTION_DOT, MEAN_MOTION_DDOT, ELEMENT_SET_NO, REV_AT_EPOCH,
 * EPHEMERIS_TYPE and CLASSIFICATION_TYPE are omitted (D17); SGP4 always uses the raw lines.
 */
export interface TleRecord {
  readonly OBJECT_NAME: string; // "ISS (ZARYA)"
  readonly TLE_LINE1: string; // 69 characters, no terminator
  readonly TLE_LINE2: string; // 69 characters, no terminator
  readonly NORAD_CAT_ID: number; // 25544
  readonly OBJECT_ID: string; // "98067A" (raw TLE form)
  readonly EPOCH: number; // ms since 1970-01-01T00:00:00Z, formula 2.9.1, may be fractional (D2)
  readonly MEAN_MOTION: number; // rev/day
  readonly ECCENTRICITY: number; // dimensionless
  readonly INCLINATION: number; // deg
  readonly RA_OF_ASC_NODE: number; // deg
  readonly ARG_OF_PERICENTER: number; // deg
  readonly MEAN_ANOMALY: number; // deg
  readonly SEMIMAJOR_AXIS_KM: number; // km, formula 2.9.7
  readonly ALTITUDE_KM: number; // km, semi-major-axis altitude (C19)
}

/** Length of a TLE line without terminator (C18). */
const LINE_LENGTH = 69;
const MS_PER_DAY = 86_400_000;
const SECONDS_PER_DAY = 86_400;

function invalidTle(message: string): EngineError {
  return new EngineError('invalid-tle', message);
}

/** Runs `run`; an exception it throws becomes an `invalid-tle` error that carries the exception as cause. */
function attempt<T>(run: () => T, message: string): T {
  try {
    return run();
  } catch (cause) {
    throw new EngineError('invalid-tle', message, { cause });
  }
}

/** Removes leading and trailing U+0020 characters only, not tabs or other whitespace. */
function trimSpaces(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && text[start] === ' ') start += 1;
  while (end > start && text[end - 1] === ' ') end -= 1;
  return text.slice(start, end);
}

/** Check 5 (criterion 14): the field consists of the decimal digits 0 to 9 only. */
function requireDigits(label: string, text: string): void {
  if (!/^[0-9]+$/.test(text)) {
    throw invalidTle(`TLE ${label} must consist of the digits 0 to 9 only`);
  }
}

/** Check 7 (criterion 21): one or more digits with at most one decimal point, no sign, exponent or letter. */
function requireDecimal(label: string, text: string): void {
  if (!/^[0-9]*\.?[0-9]*$/.test(text) || !/[0-9]/.test(text)) {
    throw invalidTle(`TLE ${label} must be digits with at most one decimal point`);
  }
}

/**
 * Check 9 (criteria 16 and 23): satellite.js 6.0.2 must accept the two lines and propagate them at
 * EPOCH to a finite state. The Satrec is discarded.
 */
function assertSatelliteJsAccepts(line1: string, line2: string, epochMs: number): void {
  const satrec = attempt(() => twoline2satrec(line1, line2), 'twoline2satrec threw an exception');
  if (satrec.error !== 0) {
    throw invalidTle(`twoline2satrec returned error code ${satrec.error}`);
  }
  if (!Number.isFinite(satrec.no)) {
    throw invalidTle('twoline2satrec returned a mean motion that is not finite');
  }
  const state = attempt(() => propagate(satrec, new Date(epochMs)), 'propagate threw an exception at EPOCH');
  if (state === null) {
    throw invalidTle('propagate returned no state at EPOCH');
  }
  const { position, velocity } = state;
  if (![position.x, position.y, position.z, velocity.x, velocity.y, velocity.z].every(Number.isFinite)) {
    throw invalidTle('propagate returned a position or velocity component that is not finite at EPOCH');
  }
}

/**
 * Parses the three-line body of a CelesTrak `FORMAT=tle` response (object name, line 1, line 2) into a
 * frozen TleRecord. A non-string argument throws `invalid-input`; every other rejection throws
 * `invalid-tle`. The modulo-10 checksum is not verified (D1).
 */
export function parseTle(text: string): TleRecord {
  if (typeof text !== 'string') {
    throw new EngineError('invalid-input', `text must be a string, received ${text === null ? 'null' : typeof text}`);
  }

  // Check 1 (criteria 2 and 20): split on LF, remove trailing whitespace (space, tab, CR), keep the non-empty lines.
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  // Check 2 (criteria 11 and 17): exactly the name line, line 1 and line 2.
  if (lines.length !== 3) {
    throw invalidTle(`TLE text must have exactly 3 non-empty lines (name, line 1, line 2), received ${lines.length}`);
  }
  const [nameLine, line1, line2] = lines;

  // Check 3 (criterion 12): line prefixes.
  if (!line1.startsWith('1 ')) {
    throw invalidTle('TLE line 1 must begin with "1 "');
  }
  if (!line2.startsWith('2 ')) {
    throw invalidTle('TLE line 2 must begin with "2 "');
  }

  // Check 4 (criterion 13): line length.
  if (line1.length !== LINE_LENGTH) {
    throw invalidTle(`TLE line 1 must be ${LINE_LENGTH} characters long, received ${line1.length}`);
  }
  if (line2.length !== LINE_LENGTH) {
    throw invalidTle(`TLE line 2 must be ${LINE_LENGTH} characters long, received ${line2.length}`);
  }

  // Check 5 (criterion 14): digit-only fields, at the C18 columns (0-based, end-exclusive).
  const noradText = line1.slice(2, 7);
  const noradText2 = line2.slice(2, 7);
  const epochYearText = line1.slice(18, 20);
  const eccentricityText = line2.slice(26, 33);
  requireDigits('line 1 NORAD number', noradText);
  requireDigits('line 2 NORAD number', noradText2);
  requireDigits('epoch year', epochYearText);
  requireDigits('eccentricity', eccentricityText);

  // Check 6 (criterion 15): the NORAD numbers of both lines agree.
  const noradId = Number(noradText);
  const noradId2 = Number(noradText2);
  if (noradId !== noradId2) {
    throw invalidTle(`TLE line 1 and line 2 carry different NORAD numbers (${noradId} and ${noradId2})`);
  }

  // Check 7 (criterion 21): decimal fields, after removing leading and trailing U+0020 characters.
  const epochDayText = trimSpaces(line1.slice(20, 32));
  const inclinationText = trimSpaces(line2.slice(8, 16));
  const ascendingNodeText = trimSpaces(line2.slice(17, 25));
  const perigeeText = trimSpaces(line2.slice(34, 42));
  const anomalyText = trimSpaces(line2.slice(43, 51));
  const meanMotionText = trimSpaces(line2.slice(52, 63));
  requireDecimal('epoch day', epochDayText);
  requireDecimal('inclination', inclinationText);
  requireDecimal('right ascension of the ascending node', ascendingNodeText);
  requireDecimal('argument of perigee', perigeeText);
  requireDecimal('mean anomaly', anomalyText);
  requireDecimal('mean motion', meanMotionText);

  // Check 8 (criterion 22): a zero mean motion has no finite semi-major axis.
  const meanMotion = Number(meanMotionText);
  if (meanMotion === 0) {
    throw invalidTle('TLE mean motion must not be 0');
  }

  // EPOCH by C02 and formula 2.9.1, not rounded (D2).
  const epochYear = Number(epochYearText);
  const year = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
  const epoch = Date.UTC(year, 0, 0) + Number(epochDayText) * MS_PER_DAY;

  // Check 9 (criteria 16 and 23).
  assertSatelliteJsAccepts(line1, line2, epoch);

  // Semi-major axis by formula 2.9.7 from the raw mean motion (C12); altitude by C19.
  const meanMotionRadPerS = (meanMotion * 2 * Math.PI) / SECONDS_PER_DAY;
  const semiMajorAxisKm = Math.cbrt(MU_KM3_PER_S2 / (meanMotionRadPerS * meanMotionRadPerS));

  const record: TleRecord = {
    OBJECT_NAME: nameLine.trim(),
    TLE_LINE1: line1,
    TLE_LINE2: line2,
    NORAD_CAT_ID: noradId,
    OBJECT_ID: trimSpaces(line1.slice(9, 17)),
    EPOCH: epoch,
    MEAN_MOTION: meanMotion,
    ECCENTRICITY: Number(`0.${eccentricityText}`),
    INCLINATION: Number(inclinationText),
    RA_OF_ASC_NODE: Number(ascendingNodeText),
    ARG_OF_PERICENTER: Number(perigeeText),
    MEAN_ANOMALY: Number(anomalyText),
    SEMIMAJOR_AXIS_KM: semiMajorAxisKm,
    ALTITUDE_KM: semiMajorAxisKm - WGS84_A_KM,
  };
  return Object.freeze(record);
}
