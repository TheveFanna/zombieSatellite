import type { SessionEvent, SessionPhase, TransitionOutcome } from './types';

export const SESSION_PHASES: readonly SessionPhase[] = Object.freeze([
  'selecting',
  'awaiting-pass',
  'in-pass',
  'completed',
]);

export const SESSION_EVENTS: readonly SessionEvent[] = Object.freeze([
  'pick',
  'join',
  'start-demo',
  'aos-reached',
  'los-reached',
  'abort',
  'new-session',
]);

/** The 9 legal pairs of the Transition_Table. Every pair not listed is rejected. */
const TABLE: Readonly<Record<SessionPhase, Readonly<Partial<Record<SessionEvent, SessionPhase>>>>> = Object.freeze({
  selecting: Object.freeze({ pick: 'awaiting-pass', join: 'in-pass', 'start-demo': 'in-pass' }),
  'awaiting-pass': Object.freeze({ 'aos-reached': 'in-pass', 'start-demo': 'in-pass', abort: 'selecting' }),
  'in-pass': Object.freeze({ 'los-reached': 'completed', abort: 'completed' }),
  completed: Object.freeze({ 'new-session': 'selecting' }),
});

/**
 * Pure, total session state machine. A pair that the table does not list gives a typed rejection.
 * Never throws, also for values outside the declared types at run time.
 */
export function sessionTransition(state: SessionPhase, event: SessionEvent): TransitionOutcome {
  const row = Object.hasOwn(TABLE, state) ? TABLE[state] : undefined;
  const next = row !== undefined && Object.hasOwn(row, event) ? row[event] : undefined;
  if (next !== undefined) return { ok: true, next };
  return { ok: false, rejection: { kind: 'transition-rejected', state, event } };
}
