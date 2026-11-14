// Property 1 of design.md (Correctness Properties): TLE text normalisation invariance.
//
// For any accepted TLE (the two Baseline_TLE_Snapshots and generated TLEs) and for any rendering of it
// that pads the name line with leading and trailing spaces or tabs, appends any mix of spaces, tabs and
// `\r` to each line, uses LF or CRLF per line, inserts empty or whitespace-only lines before, between or
// after the three lines, and optionally ends with a line terminator, `parseTle(rendering)` deep-equals
// `parseTle(name + '\n' + line1 + '\n' + line2)`, its OBJECT_NAME equals the trimmed name, and its
// TLE_LINE1/TLE_LINE2 are the 69-character lines without trailing whitespace.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isEngineError, parseTle, type TleRecord } from '../../src/lib/orbit/index';
import { formatTle, renderingArb, tleFieldsArb, type TleLines } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

/** Length of a TLE line without terminator (C18). */
const LINE_LENGTH = 69;

/** The TLEs of the property: the two Baseline_TLE_Snapshots and generated TLEs. */
const tleArb: fc.Arbitrary<TleLines> = fc.oneof(
  fc.constantFrom<TleLines>(ISS_BASELINE, ZHTW_BASELINE),
  tleFieldsArb.map(formatTle),
);

/**
 * The record that `parseTle` returns for the canonical text of a TLE, or `undefined` when it rejects the
 * text with `invalid-tle`. The generators leave it to the test whether satellite.js accepts a generated
 * TLE. A rejected TLE is not an accepted TLE, so Property 1 does not apply to it.
 */
function acceptedRecord(canonicalText: string): TleRecord | undefined {
  try {
    return parseTle(canonicalText);
  } catch (error) {
    if (isEngineError(error) && error.category === 'invalid-tle') {
      return undefined;
    }
    throw error;
  }
}

describe('TLE_Parser text normalisation', () => {
  it('parses every rendering of an accepted TLE to the record of its canonical text', () => {
    // Feature: orbit-engine, Property 1: TLE text normalisation invariance
    // **Validates: Requirements 4.1, 4.2, 4.3, 4.20**
    fc.assert(
      fc.property(
        tleArb.chain((tle) => renderingArb(tle).map((rendering) => ({ tle, rendering }))),
        ({ tle, rendering }) => {
          const canonical = acceptedRecord(`${tle.name}\n${tle.line1}\n${tle.line2}`);
          fc.pre(canonical !== undefined);

          const record = parseTle(rendering);

          expect(record).toStrictEqual(canonical);
          expect(record.OBJECT_NAME).toBe(tle.name.trim());
          expect(record.TLE_LINE1).toBe(tle.line1);
          expect(record.TLE_LINE2).toBe(tle.line2);
          expect(record.TLE_LINE1).toHaveLength(LINE_LENGTH);
          expect(record.TLE_LINE2).toHaveLength(LINE_LENGTH);
        },
      ),
      { numRuns: 200 },
    );
  });
});
