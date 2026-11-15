import { DEMO_RATE, MAX_HOLD_TICKS, SESSION_TICK_MS } from './constants';
import type { ClockMode } from './types';

/**
 * One tick of an in-pass session. `lock: null` means no Lock_Result was available: it is not a Lock_Sample,
 * and the time from here on counts as not locked.
 */
export interface LockObservation {
  readonly instantMs: number;
  readonly lock: {
    readonly pointingErrorDeg: number;
    readonly locked: boolean;
    readonly autoPoint: boolean;
  } | null;
}

export interface LockStats {
  readonly lastInstantMs: number | null;
  readonly lastLocked: boolean;
  readonly lockedMs: number;
  readonly bestPointingErrorDeg: number | null;
  readonly autoPointUsed: boolean;
}

export const EMPTY_LOCK_STATS: LockStats = Object.freeze({
  lastInstantMs: null,
  lastLocked: false,
  lockedMs: 0,
  bestPointingErrorDeg: null,
  autoPointUsed: false,
});

/** The held interval since the last observation, counted only while it was locked, clamped to [0, maxHoldMs]. */
function heldLockedMs(stats: LockStats, instantMs: number, maxHoldMs: number): number {
  if (!stats.lastLocked || stats.lastInstantMs === null) return 0;
  return Math.min(Math.max(instantMs - stats.lastInstantMs, 0), maxHoldMs);
}

/** Sample-and-hold: the lock state of the previous observation holds until this one. */
export function reduceLockStats(stats: LockStats, observation: LockObservation, maxHoldMs: number): LockStats {
  const lockedMs = stats.lockedMs + heldLockedMs(stats, observation.instantMs, maxHoldMs);
  const { lock } = observation;
  if (lock === null) {
    return { ...stats, lastInstantMs: observation.instantMs, lastLocked: false, lockedMs };
  }
  return {
    lastInstantMs: observation.instantMs,
    lastLocked: lock.locked,
    lockedMs,
    bestPointingErrorDeg:
      stats.bestPointingErrorDeg === null
        ? lock.pointingErrorDeg
        : Math.min(stats.bestPointingErrorDeg, lock.pointingErrorDeg),
    autoPointUsed: stats.autoPointUsed || lock.autoPoint,
  };
}

/** Adds the final held interval up to `endMs`. */
export function closeLockStats(stats: LockStats, endMs: number, maxHoldMs: number): LockStats {
  return {
    ...stats,
    lastInstantMs: endMs,
    lastLocked: false,
    lockedMs: stats.lockedMs + heldLockedMs(stats, endMs, maxHoldMs),
  };
}

/** Two session ticks of Session_Clock time: 500 ms in real time, 30 000 ms in a Demo_Session. */
export function maxHoldMsFor(mode: ClockMode): number {
  return MAX_HOLD_TICKS * SESSION_TICK_MS * (mode === 'demo' ? DEMO_RATE : 1);
}
