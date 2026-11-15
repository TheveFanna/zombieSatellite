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
