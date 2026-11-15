export const SPEED_OF_LIGHT_KM_PER_S = 299_792.458;

export type DopplerReadout =
  | { readonly kind: 'shift'; readonly shiftKhz: number }
  | { readonly kind: 'no-frequency' };

/** Physical_Doppler_Shift in kHz: Δf = −f0 × rangeRate / c. Positive while the satellite approaches. */
export function physicalDopplerShiftKhz(downlinkMhz: number, rangeRateKmPerS: number): number {
  return (-downlinkMhz * 1000 * rangeRateKmPerS) / SPEED_OF_LIGHT_KM_PER_S;
}

/** Never invents a frequency: a null downlink gives the no-frequency marker and computes nothing. */
export function dopplerReadout(downlinkMhz: number | null, rangeRateKmPerS: number): DopplerReadout {
  if (downlinkMhz === null) return { kind: 'no-frequency' };
  return { kind: 'shift', shiftKhz: physicalDopplerShiftKhz(downlinkMhz, rangeRateKmPerS) };
}

/** D16: 2 decimals, explicit sign (U+2212 for minus), then " kHz". */
export function formatDopplerReadout(readout: DopplerReadout): string {
  if (readout.kind === 'no-frequency') return 'No documented downlink frequency';
  const rounded = Math.round(readout.shiftKhz * 100) / 100;
  const sign = rounded >= 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(rounded).toFixed(2)} kHz`;
}
