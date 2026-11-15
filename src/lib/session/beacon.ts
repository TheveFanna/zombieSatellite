import type { BeaconBlock } from '../catalog/index';

export const QUALITY_ZERO_ERROR_DEG = 45;
export const AUDIBLE_BASE_FREQUENCY_HZ = 700;
export const GLIDE_HZ_PER_KM_PER_S = 30;
export const GLIDE_LIMIT_HZ = 240;
export const CARRIER_PEAK_GAIN = 0.5;
export const NOISE_FLOOR_GAIN = 0.04;
export const NOISE_SPAN_GAIN = 0.26;
export const TUMBLE_FLOOR = 0.1;
export const CW_UNIT_S = 0.08;
/** Simulation pattern, not real telemetry: "V V V" with a word gap, 40 units (3.2 s). */
export const CW_KEYING_PATTERN = '101010111000'.repeat(3) + '0000';
export const TELEMETRY_BIT_S = 0.1;
/** Simulation pattern, not real telemetry content: 16 bits (1.6 s). */
export const TELEMETRY_PATTERN = '1011001110001011';
export const TELEMETRY_LOW_LEVEL = 0.5;
export const TICK_PERIOD_S = 1.0;
export const TICK_LENGTH_S = 0.04;
export const TICK_PEAK_GAIN = 0.8;

export type BeaconSoundMode = 'carrier' | 'cw' | 'telemetry' | 'ticks' | 'silent';

export interface BeaconInputs {
  readonly pointingErrorDeg: number | null;
  readonly rangeRateKmPerS: number | null;
  readonly beacon: BeaconBlock;
  /** Beacon_Phase_Input, seconds of audio time. */
  readonly phaseS: number;
}

export interface BeaconState {
  readonly mode: BeaconSoundMode;
  readonly carrierFrequencyHz: number;
  readonly carrierGain: number;
  readonly noiseGain: number;
  readonly tickGain: number;
}

/** Non-negative remainder, so negative phases work. */
function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** D6: 1 at 0 deg, 0 from 45 deg (and for null or NaN), raised cosine in between. */
export function signalQuality(pointingErrorDeg: number | null): number {
  if (pointingErrorDeg === null || Number.isNaN(pointingErrorDeg)) return 0;
  if (pointingErrorDeg >= QUALITY_ZERO_ERROR_DEG) return 0;
  if (pointingErrorDeg <= 0) return 1;
  return 0.5 * (1 + Math.cos((Math.PI * pointingErrorDeg) / QUALITY_ZERO_ERROR_DEG));
}

/** D7: audible offset in Hz, positive while approaching (negative range rate). Never returns -0. */
export function dopplerGlideHz(rangeRateKmPerS: number | null): number {
  if (rangeRateKmPerS === null || Number.isNaN(rangeRateKmPerS)) return 0;
  const raw = -rangeRateKmPerS * GLIDE_HZ_PER_KM_PER_S;
  const clamped = Math.min(GLIDE_LIMIT_HZ, Math.max(-GLIDE_LIMIT_HZ, raw));
  return clamped + 0;
}

/** D8: period exactly periodS, maximum 1 at t = 0, minimum TUMBLE_FLOOR at t = periodS / 2. */
export function tumbleEnvelope(phaseS: number, periodS: number): number {
  return TUMBLE_FLOOR + (1 - TUMBLE_FLOOR) * 0.5 * (1 + Math.cos((2 * Math.PI * phaseS) / periodS));
}

function soundMode(beacon: BeaconBlock): BeaconSoundMode {
  if (beacon.downlinkMhz === null) return 'ticks';
  if (beacon.beaconMode === 'cw-beacon') return 'cw';
  if (beacon.beaconMode === 'telemetry') return 'telemetry';
  return 'carrier';
}

function keyLevel(mode: BeaconSoundMode, phaseS: number): number {
  if (mode === 'cw') {
    const unit = mod(Math.floor(phaseS / CW_UNIT_S), CW_KEYING_PATTERN.length);
    return CW_KEYING_PATTERN[unit] === '1' ? 1 : 0;
  }
  if (mode === 'telemetry') {
    const bit = mod(Math.floor(phaseS / TELEMETRY_BIT_S), TELEMETRY_PATTERN.length);
    return TELEMETRY_PATTERN[bit] === '1' ? 1 : TELEMETRY_LOW_LEVEL;
  }
  return 1;
}

export function beaconState(inputs: BeaconInputs): BeaconState {
  const { beacon, phaseS } = inputs;
  const mode = soundMode(beacon);
  const q = signalQuality(inputs.pointingErrorDeg);
  const noiseGain = NOISE_FLOOR_GAIN + NOISE_SPAN_GAIN * (1 - q);
  const carrierFrequencyHz = AUDIBLE_BASE_FREQUENCY_HZ + dopplerGlideHz(inputs.rangeRateKmPerS);

  if (mode === 'ticks') {
    const gate = mod(phaseS, TICK_PERIOD_S) < TICK_LENGTH_S ? 1 : 0;
    return { mode, carrierFrequencyHz, carrierGain: 0, noiseGain, tickGain: TICK_PEAK_GAIN * q * gate };
  }

  const tumble = beacon.tumblePeriodS === null ? 1 : tumbleEnvelope(phaseS, beacon.tumblePeriodS);
  const carrierGain = CARRIER_PEAK_GAIN * q * tumble * keyLevel(mode, phaseS);
  return { mode, carrierFrequencyHz, carrierGain, noiseGain, tickGain: 0 };
}

export const SILENT_BEACON_STATE: BeaconState = Object.freeze({
  mode: 'silent',
  carrierFrequencyHz: AUDIBLE_BASE_FREQUENCY_HZ,
  carrierGain: 0,
  noiseGain: 0,
  tickGain: 0,
});
