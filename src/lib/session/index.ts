// Public interface of the Session_Core and its only entry file.
export type {
  SessionPhase,
  SessionEvent,
  TransitionRejection,
  TransitionOutcome,
  ClockMode,
  ObserverPosition,
  SessionResult,
} from './types';
export {
  DEMO_RATE,
  SESSION_TICK_MS,
  MAX_HOLD_TICKS,
  PASS_SEARCH_HOURS,
  PASS_SEARCH_FALLBACK_HOURS,
  IN_PROGRESS_LOOKBACK_HOURS,
  PASS_MIN_ELEVATION_DEG,
} from './constants';
export { SESSION_PHASES, SESSION_EVENTS, sessionTransition } from './transition';
export { realInstantMs, virtualInstantMs, countdownMs } from './clock';
export type { VirtualClockAnchor } from './clock';
export {
  SPEED_OF_LIGHT_KM_PER_S,
  physicalDopplerShiftKhz,
  dopplerReadout,
  formatDopplerReadout,
} from './doppler';
export type { DopplerReadout } from './doppler';
export { EMPTY_LOCK_STATS, reduceLockStats, closeLockStats, maxHoldMsFor } from './stats';
export type { LockObservation, LockStats } from './stats';
export {
  MAX_STORED_RESULTS,
  buildSessionResult,
  isSessionResult,
  parseSessionResults,
  appendSessionResult,
} from './result';
export type { SessionResultInput } from './result';
export {
  formatUtc,
  formatCountdown,
  formatDurationMin,
  parseCoordinateInput,
  parseStoredObserver,
  serializeObserver,
} from './format';
export { resolvePlayableEntry } from './entry';
export {
  AUTO_POINT_EXCURSION_PROBABILITY,
  AUTO_POINT_WOBBLE_MIN_DEG,
  AUTO_POINT_WOBBLE_MAX_DEG,
  AUTO_POINT_EXCURSION_MIN_DEG,
  AUTO_POINT_EXCURSION_MAX_DEG,
  drawJitter,
  offsetDirection,
} from './auto-point';
export type { Jitter } from './auto-point';
export {
  QUALITY_ZERO_ERROR_DEG,
  AUDIBLE_BASE_FREQUENCY_HZ,
  GLIDE_HZ_PER_KM_PER_S,
  GLIDE_LIMIT_HZ,
  CARRIER_PEAK_GAIN,
  NOISE_FLOOR_GAIN,
  NOISE_SPAN_GAIN,
  TUMBLE_FLOOR,
  CW_UNIT_S,
  CW_KEYING_PATTERN,
  TELEMETRY_BIT_S,
  TELEMETRY_PATTERN,
  TELEMETRY_LOW_LEVEL,
  TICK_PERIOD_S,
  TICK_LENGTH_S,
  TICK_PEAK_GAIN,
  signalQuality,
  dopplerGlideHz,
  tumbleEnvelope,
  beaconState,
  SILENT_BEACON_STATE,
} from './beacon';
export type { BeaconSoundMode, BeaconInputs, BeaconState } from './beacon';
