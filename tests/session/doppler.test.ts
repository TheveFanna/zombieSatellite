// Feature: seance-session, Property 11: Physical Doppler vectors
// **Validates: Requirements 7.2, 7.4, 7.7**
import { describe, expect, it } from 'vitest';
import { dopplerReadout } from '../../src/lib/session/index';
import { expectClose } from '../helpers/pointing-assert';

describe('Property 11: Physical Doppler vectors', () => {
  it('approaching at 2.1094 km/s gives about +1.03 kHz at 145.9775 MHz', () => {
    const readout = dopplerReadout(145.9775, -2.1094);
    expect(readout.kind).toBe('shift');
    if (readout.kind === 'shift') expectClose(readout.shiftKhz, 1.03, 0.01);
  });

  it('receding at 2.6384 km/s gives about -1.28 kHz at 145.9775 MHz', () => {
    const readout = dopplerReadout(145.9775, 2.6384);
    expect(readout.kind).toBe('shift');
    if (readout.kind === 'shift') expectClose(readout.shiftKhz, -1.28, 0.01);
  });

  it('a null downlink gives the no-frequency marker', () => {
    expect(dopplerReadout(null, 1)).toEqual({ kind: 'no-frequency' });
  });
});
