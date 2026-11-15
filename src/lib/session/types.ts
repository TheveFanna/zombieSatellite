import type { NoradId } from '../catalog/index';

export type SessionPhase = 'selecting' | 'awaiting-pass' | 'in-pass' | 'completed';

export type SessionEvent =
  | 'pick'
  | 'join'
  | 'start-demo'
  | 'aos-reached'
  | 'los-reached'
  | 'abort'
  | 'new-session';

export interface TransitionRejection {
  readonly kind: 'transition-rejected';
  readonly state: SessionPhase;
  readonly event: SessionEvent;
}

export type TransitionOutcome =
  | { readonly ok: true; readonly next: SessionPhase }
  | { readonly ok: false; readonly rejection: TransitionRejection };

export type ClockMode = 'real' | 'demo';

export interface ObserverPosition {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
}

/** The hand-off to S5. Stored as JSON; see result.ts for the validator. */
export interface SessionResult {
  readonly noradId: NoradId;
  /** Target_Pass riseMs, integer ms UTC. */
  readonly aosMs: number;
  /** Target_Pass setMs, or the Session_Instant of the Abort, integer ms UTC. */
  readonly losMs: number;
  readonly maxElevationDeg: number;
  /** Locked time on the Session_Clock, in seconds (virtual seconds in a Demo_Session). */
  readonly lockedSeconds: number;
  /** Smallest Pointing_Error of any Lock_Sample in degrees, or null without Lock_Samples. */
  readonly bestPointingErrorDeg: number | null;
  /** lockedSeconds over the full Target_Pass duration. */
  readonly lockedRatio: number;
  /** False when the user aborted. */
  readonly completed: boolean;
  readonly mode: ClockMode;
  /** True when any Lock_Sample came from Auto_Point. */
  readonly autoPointUsed: boolean;
}
