// Example tests of the Pass_Predictor (design.md, Testing Strategy, pass-predictor.test.ts): Requirement 9,
// criteria 1 to 3 and 11, and Requirement 11, criteria 5, 7, 8 and 9. Requirement 9, criterion 15 is tested in
// propagator.test.ts, next to the Satrec factory case that it shares.
import { describe, expect, it } from 'vitest';
import { parseTle, predictPasses } from '../../src/lib/orbit/index';
import type { Pass, PassSearch, TleRecord } from '../../src/lib/orbit/index';
import { ISS_BASELINE, ISS_PASS_2_1S_REFERENCE, REFERENCE_OBSERVER, ZHTW_BASELINE } from '../helpers/baseline';

const ISS_TLE = parseTle(ISS_BASELINE.text);
const ZHTW_TLE = parseTle(ZHTW_BASELINE.text);

// The window start of the section 4.6 runs.
const SECTION_4_6_START_MS = Date.parse('2026-11-09T00:00:00Z');

// Requirement 11, criteria 7 and 8: a rise or set that bisection locates is compared within ±10 s.
const CROSSING_TOLERANCE_MS = 10_000;

// Requirement 9, criterion 11 and Requirement 6, criterion 13: the ISS at EPOCH + 3650 days, where satellite.js 6.0.2
// `propagate` returns null and sets the Satrec error code 6.
const ISS_EPOCH_PLUS_3650_DAYS_MS = Date.parse('2036-11-05T04:12:35.430Z');

/** Fails unless `actualMs` is within ±`toleranceMs` of `expectedMs`. */
function expectWithinMs(actualMs: number, expectedMs: number, toleranceMs: number, quantity: string): void {
  expect(
    Math.abs(actualMs - expectedMs),
    `${quantity}: ${actualMs} ms against ${expectedMs} ms ± ${toleranceMs} ms`,
  ).toBeLessThanOrEqual(toleranceMs);
}

/** The Passes of `tle` over the Reference_Observer in a window of 1 hour from `startMs`, with Min_Elevation 0°. */
function passesInOneHourFrom(tle: TleRecord, startMs: number): Pass[] {
  return predictPasses({ observer: REFERENCE_OBSERVER, tle, start: startMs, durationHours: 1, minElevationDeg: 0 });
}

// The inputs that Requirement 9, criteria 2 and 3 leave open: the ISS, the Reference_Observer and the section 4.6
// window start. Each case adds the optional parameters, or leaves them out.
const DEFAULT_SEARCH = { observer: REFERENCE_OBSERVER, tle: ISS_TLE, start: SECTION_4_6_START_MS };

const DEFAULT_CASES: ReadonlyArray<{
  readonly name: string;
  readonly criteria: string;
  readonly optional: Partial<PassSearch>;
}> = [
  { name: 'both optional parameters omitted', criteria: '2 and 3', optional: {} },
  {
    name: 'both optional parameters undefined',
    criteria: '2 and 3',
    optional: { durationHours: undefined, minElevationDeg: undefined },
  },
  { name: 'durationHours omitted', criteria: '2', optional: { minElevationDeg: 0 } },
  { name: 'durationHours undefined', criteria: '2', optional: { durationHours: undefined, minElevationDeg: 0 } },
  { name: 'minElevationDeg omitted', criteria: '3', optional: { durationHours: 24 } },
  { name: 'minElevationDeg undefined', criteria: '3', optional: { durationHours: 24, minElevationDeg: undefined } },
];

describe('Pass_Predictor defaults (Requirement 9, criteria 1 to 3)', () => {
  it.each(DEFAULT_CASES)(
    'with $name, gives the Passes of an explicit 24 h window and Min_Elevation 0° (criteria $criteria)',
    ({ optional }) => {
      const explicit = predictPasses({ ...DEFAULT_SEARCH, durationHours: 24, minElevationDeg: 0 });
      // Two empty lists would be equal whatever the defaults are.
      expect(explicit.length).toBeGreaterThan(0);

      expect(predictPasses({ ...DEFAULT_SEARCH, ...optional })).toStrictEqual(explicit);
    },
  );
});

describe('Pass_Predictor with a propagation failure at every instant (Requirement 9, criterion 11)', () => {
  it('returns an empty list for the ISS in a window that starts at EPOCH + 3650 days', () => {
    const passes = predictPasses({ observer: REFERENCE_OBSERVER, tle: ISS_TLE, start: ISS_EPOCH_PLUS_3650_DAYS_MS });

    expect(passes).toStrictEqual([]);
  });
});

describe('Passes cut by the window edges (Requirement 11, criteria 5, 7, 8 and 9)', () => {
  it('11.7: a window that starts after the peak of ISS pass 2 reports one Pass with its peak at the window start', () => {
    const windowStartMs = Date.parse('2026-11-09T11:25:00Z');

    const passes = passesInOneHourFrom(ISS_TLE, windowStartMs);

    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({
      riseMs: windowStartMs,
      peakMs: windowStartMs,
      startTruncated: true,
      endTruncated: false,
    });
    expectWithinMs(passes[0].setMs, ISS_PASS_2_1S_REFERENCE.setMs, CROSSING_TOLERANCE_MS, 'Set_Instant');
  });

  it('11.8: a window that ends before the peak of ISS pass 2 reports one Pass with its peak at the window end', () => {
    const windowStartMs = Date.parse('2026-11-09T10:21:00Z');
    const windowEndMs = Date.parse('2026-11-09T11:21:00Z');

    const passes = passesInOneHourFrom(ISS_TLE, windowStartMs);

    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({
      peakMs: windowEndMs,
      setMs: windowEndMs,
      startTruncated: false,
      endTruncated: true,
    });
    expectWithinMs(passes[0].riseMs, ISS_PASS_2_1S_REFERENCE.riseMs, CROSSING_TOLERANCE_MS, 'Rise_Instant');
  });

  it('11.9: a window inside the ZHIHUI TIANWANG-1 01A pass reports one Pass from the window start to the window end', () => {
    const windowStartMs = Date.parse('2026-11-09T11:00:00Z');
    const windowEndMs = Date.parse('2026-11-09T12:00:00Z');

    const passes = passesInOneHourFrom(ZHTW_TLE, windowStartMs);

    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({
      riseMs: windowStartMs,
      setMs: windowEndMs,
      startTruncated: true,
      endTruncated: true,
    });
  });
});
