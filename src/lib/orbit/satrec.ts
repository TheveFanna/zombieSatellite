import { twoline2satrec } from 'satellite.js';
import type { SatRec as Satrec } from 'satellite.js';
import { EngineError } from './errors';
import type { TleRecord } from './tle-parser';
import { assertTleRecord } from './validate';

// The Satrec type is the SatRec type of satellite.js 6.0.2 (glossary: Satrec).
export type { Satrec };

/**
 * Creates the Satrec of a TleRecord (design.md, "Satrec factory"). `twoline2satrec` receives the raw
 * TLE_LINE1 and TLE_LINE2 exactly as stored in the record, never lines rebuilt from parsed fields
 * (Requirement 6, criterion 1). Every call returns a new Satrec.
 *
 * The checks run in the order of D18: a value that is not a TleRecord throws `invalid-input` before
 * satellite.js is called (Requirement 2, criterion 11). An exception from `twoline2satrec`, or a
 * non-zero `error` code in the Satrec it returns, throws `invalid-tle` (Requirement 6, criterion 10).
 * No other content check runs: a Satrec with error code 0 whose elements are NaN is returned, and
 * its propagations fail.
 */
export function createSatrec(tle: TleRecord): Satrec {
  assertTleRecord(tle);

  let satrec: Satrec;
  try {
    satrec = twoline2satrec(tle.TLE_LINE1, tle.TLE_LINE2);
  } catch (cause) {
    throw new EngineError(
      'invalid-tle',
      `twoline2satrec threw an exception for NORAD catalog number ${tle.NORAD_CAT_ID}`,
      { cause },
    );
  }
  if (satrec.error !== 0) {
    throw new EngineError(
      'invalid-tle',
      `twoline2satrec returned error code ${satrec.error} for NORAD catalog number ${tle.NORAD_CAT_ID}`,
    );
  }
  return satrec;
}
