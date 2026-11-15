// Feature: seance-session, Property 8: Beacon state shape
// **Validates: Requirements 5.2, 5.4, 5.5, 5.7, 5.8, 5.9, 5.13, 5.14**
import { describe, expect, it } from 'vitest';
import {
  AUDIBLE_BASE_FREQUENCY_HZ,
  TUMBLE_FLOOR,
  beaconState,
  signalQuality,
  tumbleEnvelope,
} from '../../src/lib/session/index';
import { getCatalogEntry } from '../../src/lib/catalog/index';
import type { BeaconBlock } from '../../src/lib/catalog/index';
import { expectClose } from '../helpers/pointing-assert';

function beaconOf(noradId: number): BeaconBlock {
  const entry = getCatalogEntry(noradId);
  if (entry === undefined) throw new Error(`catalog entry ${noradId} missing`);
  return entry.beacon;
}

const AO7 = beaconOf(7530);
const TRANSIT = beaconOf(965);
const PROSPERO = beaconOf(5580);
const LES1 = beaconOf(1002);
const IMAGE = beaconOf(26113);

describe('Property 8: Beacon state shape', () => {
  it('signal quality curve', () => {
    expect(signalQuality(0)).toBe(1);
    expect(signalQuality(45)).toBe(0);
    expect(signalQuality(60)).toBe(0);
    expect(signalQuality(null)).toBe(0);
    for (let deg = 5; deg <= 45; deg += 5) {
      expect(signalQuality(deg)).toBeLessThanOrEqual(signalQuality(deg - 5));
    }
  });

  it('carrier frequency is 700 Hz at range rate 0 and glides with range rate', () => {
    expect(AUDIBLE_BASE_FREQUENCY_HZ).toBe(700);
    for (const beacon of [AO7, TRANSIT, PROSPERO, LES1, IMAGE]) {
      const at = (rangeRateKmPerS: number) =>
        beaconState({ pointingErrorDeg: 0, rangeRateKmPerS, beacon, phaseS: 0 }).carrierFrequencyHz;
      expect(at(0)).toBe(700);
      expect(at(-3)).toBeGreaterThan(700);
      expect(at(3)).toBeLessThan(700);
    }
  });

  it('LES-1 tumble envelope is periodic with period 4 s, within [0.1, 1]', () => {
    expect(LES1.tumblePeriodS).toBe(4);
    expect(TUMBLE_FLOOR).toBe(0.1);
    for (const t of [0.3, 1.1, 2.7]) {
      expectClose(tumbleEnvelope(t, 4), tumbleEnvelope(t + 4, 4), 1e-12);
    }
    for (let t = 0; t <= 8; t += 0.25) {
      const value = tumbleEnvelope(t, 4);
      expect(value).toBeGreaterThanOrEqual(0.1 - 1e-12);
      expect(value).toBeLessThanOrEqual(1);
    }
    expectClose(tumbleEnvelope(0, 4), 1, 1e-12);
    expectClose(tumbleEnvelope(2, 4), 0.1, 1e-12);
    for (const t of [0.3, 1.1, 2.7]) {
      const a = beaconState({ pointingErrorDeg: 0, rangeRateKmPerS: 0, beacon: LES1, phaseS: t });
      const b = beaconState({ pointingErrorDeg: 0, rangeRateKmPerS: 0, beacon: LES1, phaseS: t + 4 });
      expectClose(a.carrierGain, b.carrierGain, 1e-12);
    }
  });

  it('IMAGE is always ticks mode with no carrier', () => {
    for (const pointingErrorDeg of [0, 10, 30, 60, null]) {
      for (const rangeRateKmPerS of [-3, 0, 3, null]) {
        for (const phaseS of [0, 0.02, 0.5, 3.3]) {
          const state = beaconState({ pointingErrorDeg, rangeRateKmPerS, beacon: IMAGE, phaseS });
          expect(state.mode).toBe('ticks');
          expect(state.carrierGain).toBe(0);
        }
      }
    }
  });

  it('one example per beacon shape', () => {
    const at = (beacon: BeaconBlock, phaseS: number) =>
      beaconState({ pointingErrorDeg: 0, rangeRateKmPerS: 0, beacon, phaseS });

    expect(at(AO7, 0.04).mode).toBe('cw');
    expectClose(at(AO7, 0.04).carrierGain, 0.5, 1e-12);
    expectClose(at(AO7, 0.04).noiseGain, 0.04, 1e-12);
    expectClose(at(AO7, 0.12).carrierGain, 0, 1e-12);
    expectClose(at(AO7, 0.12).noiseGain, 0.04, 1e-12);

    expect(at(TRANSIT, 0.05).mode).toBe('telemetry');
    expectClose(at(TRANSIT, 0.05).carrierGain, 0.5, 1e-12);
    expectClose(at(TRANSIT, 0.05).noiseGain, 0.04, 1e-12);
    expectClose(at(TRANSIT, 0.15).carrierGain, 0.25, 1e-12);
    expectClose(at(TRANSIT, 0.15).noiseGain, 0.04, 1e-12);

    expect(PROSPERO.tumblePeriodS).toBeNull();
    for (const phaseS of [0.3, 1.7]) {
      const state = at(PROSPERO, phaseS);
      expect(state.mode).toBe('carrier');
      expectClose(state.carrierGain, 0.5, 1e-12);
      expectClose(state.noiseGain, 0.04, 1e-12);
    }

    expect(at(IMAGE, 0.02).mode).toBe('ticks');
    expectClose(at(IMAGE, 0.02).tickGain, 0.8, 1e-12);
    expectClose(at(IMAGE, 0.02).noiseGain, 0.04, 1e-12);
    expectClose(at(IMAGE, 0.5).tickGain, 0, 1e-12);
    expectClose(at(IMAGE, 0.5).noiseGain, 0.04, 1e-12);
  });
});
