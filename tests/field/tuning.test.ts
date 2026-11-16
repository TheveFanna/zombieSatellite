// Tuning_Table fixture pass (design "Tuning table"): ISS TLE of section 4.2, Reference_Observer, AOS 11:18:05Z,
// TCA 11:23:00Z (section 4.3 instant), LOS 11:28:47Z (section 4.7 1 s reference), downlink 145.9775 MHz.
import { expect, it } from 'vitest';
import { createSatrec, parseTle } from '../../src/lib/orbit/index';
import { tuningTable } from '../../src/lib/field/index';
import { ISS_AT_1123Z, ISS_BASELINE, ISS_PASS_2_1S_REFERENCE, REFERENCE_OBSERVER } from '../helpers/baseline';

it('tuning table of the ISS fixture pass: TCA from the baseline range rate, AOS and LOS from the oracle', () => {
  const satrec = createSatrec(parseTle(ISS_BASELINE.text));
  const result = tuningTable({
    satrec,
    observer: REFERENCE_OBSERVER,
    downlinkMhz: 145.9775,
    pass: {
      riseMs: ISS_PASS_2_1S_REFERENCE.riseMs,
      peakMs: ISS_AT_1123Z.timeMs,
      setMs: ISS_PASS_2_1S_REFERENCE.setMs,
      maxElevationDeg: 48.6098,
      durationMin: (ISS_PASS_2_1S_REFERENCE.setMs - ISS_PASS_2_1S_REFERENCE.riseMs) / 60_000,
      startTruncated: false,
      endTruncated: false,
    },
  });
  if (result.kind !== 'table') throw new Error(`expected a table, received ${result.kind}`);
  const [aos, tca, los] = result.points;

  // TCA: shift = -145.9775 * 1000 * (-2.1094) / 299792.458 = +1.0271 kHz, rounds to 145.9785 MHz.
  expect(tca.frequencyMhz).toBe(145.9785);

  // AOS and LOS literals computed once with `rangeRateOracle` (tests/helpers/oracles.ts) and
  // Δf = −f0 · ṙ / c, f0 = 145.9775 MHz, rounded to 4 decimals of MHz.
  // Oracle range rates: AOS −6.8431 km/s, LOS +6.8424 km/s.
  expect(aos.frequencyMhz).toBe(145.9808);
  expect(los.frequencyMhz).toBe(145.9742);
});
