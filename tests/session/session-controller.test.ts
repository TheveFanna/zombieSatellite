// Feature: seance-session, Property 3: Countdown derived from the clock
// Feature: seance-session, Property 5: Demo jump to AOS
// Feature: seance-session, Property 7: Auto_Point locks come from evaluateLock
// Feature: seance-session, Property 10: Audio context only from the gesture entry
// Feature: seance-session, Property 13: Results persisted at LOS and on Abort
// **Validates: Requirements 2.7, 2.13, 3.4, 3.12, 4.3, 4.9, 6.4, 6.11, 8.6, 8.7, 8.8, 8.11**
import { describe, expect, it } from 'vitest';
import { createSessionController } from '../../src/components/session/session-controller';
import { readSessionResults } from '../../src/components/session/result-store';
import { getCatalogEntry } from '../../src/lib/catalog/index';
import type { PlayableEntry } from '../../src/lib/catalog/index';
import { evaluateLock, sceneDirection } from '../../src/lib/pointing/index';
import { drawJitter, offsetDirection } from '../../src/lib/session/index';
import { createMockStorage } from '../helpers/pointing-mocks';
import {
  createCountingAudioContextFactory,
  createManualClock,
  createManualTimers,
  createMockAudioContext,
  createMockTleFetcher,
  createScriptedNoise,
  createStubSensorPointing,
} from '../helpers/session-mocks';

const AO7 = getCatalogEntry(7530) as PlayableEntry;
const START_MS = Date.UTC(2026, 10, 9, 11, 0, 0);

function setup(startMs: number, noiseValues: number[] = [0.2, 0.5, 0.75]) {
  const clock = createManualClock(startMs);
  const timers = createManualTimers();
  const storage = createMockStorage();
  const audio = createCountingAudioContextFactory(createMockAudioContext());
  const controller = createSessionController(
    {
      clock,
      timers,
      storage,
      tleFetcher: createMockTleFetcher(),
      noise: createScriptedNoise(noiseValues),
      audioContextFactory: audio.factory,
      pointing: createStubSensorPointing(),
    },
    AO7,
  );
  return { clock, timers, storage, audio, controller };
}

/** Steps the start time forward in 5-minute increments until a real-time start lands in awaiting-pass. */
async function setupAwaitingPass() {
  for (let stepMin = 0; stepMin < 24 * 60; stepMin += 5) {
    const ctx = setup(START_MS + stepMin * 60_000);
    const started = await ctx.controller.startRealTime();
    if (started.ok && started.phase === 'awaiting-pass') return ctx;
    ctx.controller.dispose();
  }
  throw new Error('no clock start time yields awaiting-pass');
}

describe('Property 3: Countdown derived from the clock', () => {
  it('readCountdownMs follows the clock without any timer firing', async () => {
    const { clock, controller } = await setupAwaitingPass();
    const before = controller.readCountdownMs();
    expect(before).not.toBeNull();
    clock.advance(5000);
    expect(controller.readCountdownMs()).toBe((before as number) - 5000);
  });
});

describe('Property 5: Demo jump to AOS', () => {
  it('startDemo lands in-pass at the target pass AOS', async () => {
    const { controller } = setup(START_MS);
    const started = await controller.startDemo();
    expect(started).toEqual({ ok: true, phase: 'in-pass' });
    const snapshot = controller.getSnapshot();
    expect(snapshot.targetPass).not.toBeNull();
    expect(snapshot.sessionInstantMs).toBe(snapshot.targetPass?.riseMs);
    expect(snapshot.targetPass?.startTruncated).toBe(false);
  });
});

describe('Property 7: Auto_Point locks come from evaluateLock', () => {
  it('the first sample uses u1, u2, u3 in order and the S3 evaluateLock', async () => {
    const { controller } = setup(START_MS, [0.2, 0.5, 0.75]);
    await controller.startDemo();
    const snapshot = controller.getSnapshot();
    expect(snapshot.target).not.toBeNull();
    const target = snapshot.target as NonNullable<typeof snapshot.target>;
    const dir = offsetDirection(target, drawJitter(0.2, 0.5, 0.75));
    expect(snapshot.lock).toEqual(evaluateLock(sceneDirection(dir.azimuthDeg, dir.elevationDeg), target, 0));
  });
});

describe('Property 10: Audio context only from the gesture entry', () => {
  it('the factory is called by enableAudio only', async () => {
    const { timers, audio, controller } = setup(START_MS);
    await controller.startDemo();
    timers.fireAll();
    controller.abort();
    controller.newSession();
    expect(audio.calls()).toBe(0);
    controller.enableAudio();
    expect(audio.calls()).toBe(1);
  });
});

describe('Property 13: Results persisted at LOS and on Abort', () => {
  it('stores one record at LOS and a second on Abort, newest last', async () => {
    const { clock, timers, storage, controller } = setup(START_MS);
    await controller.startDemo();
    const pass = controller.getSnapshot().targetPass;
    expect(pass).not.toBeNull();
    const { riseMs, setMs } = pass as NonNullable<typeof pass>;

    clock.advance(Math.ceil((setMs - riseMs) / 60) + 1000);
    for (let i = 0; i < 3; i += 1) timers.fireAll();

    const afterLos = readSessionResults(storage);
    expect(afterLos).toHaveLength(1);
    expect(afterLos[0]).toMatchObject({ completed: true, losMs: setMs, mode: 'demo', noradId: 7530 });
    expect(controller.getSnapshot().phase).toBe('completed');

    expect(controller.newSession().ok).toBe(true);
    expect((await controller.startDemo()).ok).toBe(true);
    const abortInstant = controller.getSnapshot().sessionInstantMs;
    expect(controller.abort().ok).toBe(true);

    const all = readSessionResults(storage);
    expect(all).toHaveLength(2);
    expect(all[0]).toEqual(afterLos[0]);
    expect(all[1]).toMatchObject({ completed: false, losMs: abortInstant, mode: 'demo', noradId: 7530 });
  });
});

// Feature: seance-session, approved addition (joined flag, post-review)
describe('joined flag (approved addition)', () => {
  /** Scans start times in 1-minute steps for the first real-time start that lands in the wanted phase. */
  async function startWhere(wanted: 'in-pass' | 'awaiting-pass') {
    for (let stepMin = 0; stepMin < 24 * 60; stepMin += 1) {
      const ctx = setup(START_MS + stepMin * 60_000);
      const started = await ctx.controller.startRealTime();
      if (started.ok && started.phase === wanted) return ctx;
      ctx.controller.dispose();
    }
    throw new Error(`no clock start time yields ${wanted}`);
  }

  it('is true only after a join, and false after abort or new session', async () => {
    const joinedCtx = await startWhere('in-pass');
    const joinedSnapshot = joinedCtx.controller.getSnapshot();
    expect(joinedSnapshot.clockMode).toBe('real');
    expect(joinedSnapshot.joined).toBe(true);
    expect(joinedCtx.controller.abort().ok).toBe(true);
    expect(joinedCtx.controller.getSnapshot().phase).toBe('completed');
    expect(joinedCtx.controller.newSession().ok).toBe(true);
    expect(joinedCtx.controller.getSnapshot().joined).toBe(false);

    const waitingCtx = await startWhere('awaiting-pass');
    expect(waitingCtx.controller.getSnapshot().joined).toBe(false);
    expect(waitingCtx.controller.abort().ok).toBe(true);
    expect(waitingCtx.controller.getSnapshot().phase).toBe('selecting');
    expect(waitingCtx.controller.getSnapshot().joined).toBe(false);
  });
});
