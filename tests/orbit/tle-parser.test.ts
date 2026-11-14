// Example tests of the TLE_Parser (design.md, Testing Strategy, tle-parser.test.ts):
// Requirement 4, criteria 10, 16, 17, 18, 19, 22, 23 and 25, and Requirement 5, criterion 11.
import { propagate, twoline2satrec } from 'satellite.js';
import { describe, expect, it } from 'vitest';
import { EngineError, parseTle } from '../../src/lib/orbit/index';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

/** A TLE as name line, line 1 and line 2. */
type TleLines = readonly [name: string, line1: string, line2: string];

const BASELINES = [ISS_BASELINE, ZHTW_BASELINE];

// Tolerances of Requirement 4, criteria 18 and 19.
const SEMIMAJOR_AXIS_TOLERANCE_KM = 0.01;
const ALTITUDE_TOLERANCE_KM = 0.1;

// The optional fields of Requirement 4, criterion 10; the TleRecord omits them (D17).
const OPTIONAL_FIELDS = [
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
  'ELEMENT_SET_NO',
  'REV_AT_EPOCH',
  'EPHEMERIS_TYPE',
  'CLASSIFICATION_TYPE',
];

// Fixture for Requirement 4, criterion 16: the ISS TLE with the mean motion 99.99999999 in line 2
// columns [52:63]. Both lines pass parser checks 1 to 8. satellite.js 6.0.2 `twoline2satrec` returns
// a Satrec with error code 6 (decayed) for it.
const NONZERO_ERROR_TLE: TleLines = [
  ISS_BASELINE.name,
  ISS_BASELINE.line1,
  '2 25544  51.6320 307.5621 0007219   1.6306 358.4705 99.99999999594075',
];
const NONZERO_ERROR_CODE = 6;

// Fixture for Requirement 4, criterion 23: the ISS TLE with the non-numeric BSTAR field ' ABCDE-3' in
// line 1 columns [53:61], a field that the parser does not check. Both lines pass parser checks 1 to 8,
// and the EPOCH is the ISS EPOCH. satellite.js 6.0.2 `twoline2satrec` returns error code 0 for it, and
// `propagate` at EPOCH returns NaN for all six position and velocity components.
const NAN_STATE_TLE: TleLines = [
  ISS_BASELINE.name,
  '1 25544U 98067A   26312.17541007  .00012511  00000+0  ABCDE-3 0  9990',
  ISS_BASELINE.line2,
];

// Requirement 4, criterion 22: the ISS TLE with the mean motion 00.00000000 in line 2 columns [52:63].
const ZERO_MEAN_MOTION_TLE: TleLines = [
  ISS_BASELINE.name,
  ISS_BASELINE.line1,
  '2 25544  51.6320 307.5621 0007219   1.6306 358.4705 00.00000000594075',
];

/** Calls `parseTle` on a text that it must reject and returns the Engine_Error that it reports. */
function rejection(text: string): EngineError {
  try {
    parseTle(text);
  } catch (error) {
    if (error instanceof EngineError) {
      return error;
    }
    throw error;
  }
  throw new Error('parseTle accepted a text that it must reject');
}

describe('Baseline_TLE_Snapshots', () => {
  it.each(BASELINES)(
    'parses $name into the section 4.2 fields (Requirement 4, criteria 18, 19 and 25)',
    ({ name, line1, line2, text, expected }) => {
      const { EPOCH, SEMIMAJOR_AXIS_KM, ALTITUDE_KM, ...exact } = parseTle(text);

      expect(exact).toStrictEqual({
        OBJECT_NAME: name,
        TLE_LINE1: line1,
        TLE_LINE2: line2,
        NORAD_CAT_ID: expected.NORAD_CAT_ID,
        OBJECT_ID: expected.OBJECT_ID,
        MEAN_MOTION: expected.MEAN_MOTION,
        ECCENTRICITY: expected.ECCENTRICITY,
        INCLINATION: expected.INCLINATION,
        RA_OF_ASC_NODE: expected.RA_OF_ASC_NODE,
        ARG_OF_PERICENTER: expected.ARG_OF_PERICENTER,
        MEAN_ANOMALY: expected.MEAN_ANOMALY,
      });
      expect(new Date(EPOCH).toISOString()).toBe(expected.EPOCH_ISO);
      expect(Math.abs(SEMIMAJOR_AXIS_KM - expected.SEMIMAJOR_AXIS_KM)).toBeLessThanOrEqual(
        SEMIMAJOR_AXIS_TOLERANCE_KM,
      );
      expect(Math.abs(ALTITUDE_KM - expected.ALTITUDE_KM)).toBeLessThanOrEqual(ALTITUDE_TOLERANCE_KM);
    },
  );

  it.each(BASELINES)(
    'returns a record without the optional field keys for $name (Requirement 4, criterion 10)',
    ({ text }) => {
      const keys = Object.keys(parseTle(text));

      for (const field of OPTIONAL_FIELDS) {
        expect(keys).not.toContain(field);
      }
    },
  );

  it.each(BASELINES)('returns a frozen record for $name (Requirement 5, criterion 11)', ({ text }) => {
    expect(Object.isFrozen(parseTle(text))).toBe(true);
  });
});

describe('rejected TLE texts', () => {
  it.each([
    ['with no terminator', 'No GP data found'],
    ['with a final LF', 'No GP data found\n'],
    ['with a final CRLF', 'No GP data found\r\n'],
  ])('rejects the body No GP data found %s (Requirement 4, criterion 17)', (_label, body) => {
    expect(rejection(body).category).toBe('invalid-tle');
  });

  it('rejects the mean motion 00.00000000 (Requirement 4, criterion 22)', () => {
    expect(rejection(ZERO_MEAN_MOTION_TLE.join('\n')).category).toBe('invalid-tle');
  });

  it('rejects a TLE for which twoline2satrec returns a non-zero error code (Requirement 4, criterion 16)', () => {
    const [, line1, line2] = NONZERO_ERROR_TLE;
    expect(twoline2satrec(line1, line2).error).toBe(NONZERO_ERROR_CODE);

    const error = rejection(NONZERO_ERROR_TLE.join('\n'));
    expect(error.category).toBe('invalid-tle');
    expect(error.message).toMatch(/twoline2satrec/);
  });

  it('rejects a TLE that satellite.js propagates to NaN at EPOCH (Requirement 4, criterion 23)', () => {
    const [, line1, line2] = NAN_STATE_TLE;
    const satrec = twoline2satrec(line1, line2);
    expect(satrec.error).toBe(0);
    const state = propagate(satrec, new Date(ISS_BASELINE.expected.EPOCH_ISO));
    if (state === null) {
      throw new Error('satellite.js propagate returned null at EPOCH, expected NaN components');
    }
    const { position, velocity } = state;
    expect([position.x, position.y, position.z, velocity.x, velocity.y, velocity.z].every(Number.isNaN)).toBe(true);

    const error = rejection(NAN_STATE_TLE.join('\n'));
    expect(error.category).toBe('invalid-tle');
    expect(error.message).toMatch(/propagate/);
  });
});
