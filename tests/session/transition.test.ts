// Feature: seance-session, Property 2: Full transition table
// **Validates: Requirements 2.2, 2.3, 2.4, 2.12**
import { describe, expect, it } from 'vitest';
import {
  SESSION_EVENTS,
  SESSION_PHASES,
  sessionTransition,
  type SessionEvent,
  type SessionPhase,
} from '../../src/lib/session/index';

const LEGAL: ReadonlyArray<[SessionPhase, SessionEvent, SessionPhase]> = [
  ['selecting', 'pick', 'awaiting-pass'],
  ['selecting', 'join', 'in-pass'],
  ['selecting', 'start-demo', 'in-pass'],
  ['awaiting-pass', 'aos-reached', 'in-pass'],
  ['awaiting-pass', 'start-demo', 'in-pass'],
  ['awaiting-pass', 'abort', 'selecting'],
  ['in-pass', 'los-reached', 'completed'],
  ['in-pass', 'abort', 'completed'],
  ['completed', 'new-session', 'selecting'],
];

describe('Property 2: Full transition table', () => {
  it('covers 4 states and 7 events', () => {
    expect(SESSION_PHASES).toHaveLength(4);
    expect(SESSION_EVENTS).toHaveLength(7);
  });

  it.each(SESSION_PHASES.flatMap((state) => SESSION_EVENTS.map((event) => [state, event] as const)))(
    '%s + %s',
    (state, event) => {
      const legal = LEGAL.find(([s, e]) => s === state && e === event);
      expect(sessionTransition(state, event)).toEqual(
        legal === undefined
          ? { ok: false, rejection: { kind: 'transition-rejected', state, event } }
          : { ok: true, next: legal[2] },
      );
    },
  );
});
