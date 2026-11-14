import { EngineError } from './errors';

// Structural checks of the Public_Interface inputs (design.md, "Input validation"; Requirement 2,
// criterion 11). Every failure is EngineError('invalid-input'). Inside each validator the checks run
// in a fixed order, the object first and then the fields in the order of the design's table, so the
// first failing check fixes the category and the message (D18). A message names the field and the
// received number, or the received kind (`typeof`, with null told apart), and contains nothing that
// depends on the time zone or the locale.

/** The fields of a value that passed the object check, read by name. */
type Fields = Readonly<Record<string, unknown>>;

/** The TleRecord fields that must be strings, in the order of the design's table. */
const TLE_STRING_FIELDS = ['OBJECT_NAME', 'TLE_LINE1', 'TLE_LINE2', 'OBJECT_ID'] as const;

/** The TleRecord fields that must be of type number, in the order of the design's table. */
const TLE_NUMBER_FIELDS = [
  'NORAD_CAT_ID',
  'EPOCH',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'SEMIMAJOR_AXIS_KM',
  'ALTITUDE_KM',
] as const;

function kindOf(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

/** A received number is shown as the number itself (NaN, Infinity), anything else as its kind. */
function receivedOf(value: unknown): string {
  return typeof value === 'number' ? String(value) : kindOf(value);
}

function invalidInput(message: string): EngineError {
  return new EngineError('invalid-input', message);
}

/** First check of every validator: a non-null object, whose fields are then read by name. */
function requireObject(label: string, value: unknown): Fields {
  if (typeof value !== 'object' || value === null) {
    throw invalidInput(`${label} must be an object, received ${kindOf(value)}`);
  }
  return value as Fields;
}

function requireString(label: string, fields: Fields, key: string): void {
  const field = fields[key];
  if (typeof field !== 'string') {
    throw invalidInput(`${label}.${key} must be a string, received ${kindOf(field)}`);
  }
}

/** Type check only: NaN and the infinities have type number. */
function requireNumber(label: string, fields: Fields, key: string): void {
  const field = fields[key];
  if (typeof field !== 'number') {
    throw invalidInput(`${label}.${key} must be a number, received ${kindOf(field)}`);
  }
}

/** A finite number. NaN, the infinities, numeric strings, null and undefined are rejected. */
function requireFinite(label: string, fields: Fields, key: string): number {
  const field = fields[key];
  if (typeof field !== 'number' || !Number.isFinite(field)) {
    throw invalidInput(`${label}.${key} must be a finite number, received ${receivedOf(field)}`);
  }
  return field;
}

/** A finite number in the closed interval [min, max]. */
function requireFiniteInRange(label: string, fields: Fields, key: string, min: number, max: number): void {
  const field = requireFinite(label, fields, key);
  if (field < min || field > max) {
    throw invalidInput(`${label}.${key} must be from ${min} to ${max}, received ${field}`);
  }
}

/**
 * Internal. Accepts a non-null object with `latitudeDeg` a finite number in [-90, 90], `longitudeDeg`
 * a finite number in [-180, 180] and `altitudeKm` a finite number (Requirement 7, criterion 4).
 * Anything else throws `invalid-input`.
 */
export function assertObserver(value: unknown): void {
  const fields = requireObject('observer', value);
  requireFiniteInRange('observer', fields, 'latitudeDeg', -90, 90);
  requireFiniteInRange('observer', fields, 'longitudeDeg', -180, 180);
  requireFinite('observer', fields, 'altitudeKm');
}

/**
 * Internal. Accepts a non-null object whose OBJECT_NAME, TLE_LINE1, TLE_LINE2 and OBJECT_ID are strings
 * and whose NORAD_CAT_ID, EPOCH, MEAN_MOTION, ECCENTRICITY, INCLINATION, RA_OF_ASC_NODE,
 * ARG_OF_PERICENTER, MEAN_ANOMALY, SEMIMAJOR_AXIS_KM and ALTITUDE_KM have type number (Requirement 2,
 * criterion 11). The check is structural: it does not look at the content of the TLE lines, which
 * `createSatrec` hands to satellite.js. Anything else throws `invalid-input`.
 */
export function assertTleRecord(value: unknown): void {
  const fields = requireObject('tle', value);
  for (const key of TLE_STRING_FIELDS) {
    requireString('tle', fields, key);
  }
  for (const key of TLE_NUMBER_FIELDS) {
    requireNumber('tle', fields, key);
  }
}

/**
 * Internal. Accepts a non-null object with `error`, `no` and `jdsatepoch` of type number and `method`
 * equal to 'n' or 'd' (Requirement 2, criterion 11). The check looks at types only, not at values: a
 * Satrec from an earlier failed propagation keeps a non-zero `error`, and satellite.js 6.0.2 `sgp4`
 * clears that flag at the start of every call, so rejecting such a Satrec would break later
 * evaluations. Anything else throws `invalid-input`.
 */
export function assertSatrec(value: unknown): void {
  const fields = requireObject('satrec', value);
  requireNumber('satrec', fields, 'error');
  requireNumber('satrec', fields, 'no');
  requireNumber('satrec', fields, 'jdsatepoch');
  const method = fields.method;
  if (method !== 'n' && method !== 'd') {
    throw invalidInput(`satrec.method must be "n" or "d", received ${kindOf(method)}`);
  }
}
