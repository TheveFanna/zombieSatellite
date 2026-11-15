// Session_Controller (design.md, "Controllers > Session_Controller"). Framework-free: every dependency is injected,
// all time comes from `deps.clock`, and every phase change goes through `sessionTransition`.
import { createSatrec, observeAt } from '../../lib/orbit/index';
import type { Pass, Satrec, TleFetcher, TleRecord } from '../../lib/orbit/index';
import type { PlayableEntry } from '../../lib/catalog/index';
import { cameraBasisFromDrag, evaluateLock, sceneDirection } from '../../lib/pointing/index';
import type { DragPose, LockResult, TargetDirection } from '../../lib/pointing/index';
import {
  EMPTY_LOCK_STATS,
  SESSION_TICK_MS,
  SILENT_BEACON_STATE,
  beaconState,
  buildSessionResult,
  closeLockStats,
  countdownMs,
  dopplerReadout,
  drawJitter,
  maxHoldMsFor,
  offsetDirection,
  realInstantMs,
  reduceLockStats,
  sessionTransition,
  virtualInstantMs,
} from '../../lib/session/index';
import type {
  BeaconState,
  ClockMode,
  DopplerReadout,
  LockStats,
  ObserverPosition,
  SessionEvent,
  SessionPhase,
  SessionResult,
  TransitionRejection,
  VirtualClockAnchor,
} from '../../lib/session/index';
import type { Clock, KeyValueStorage, PointerInput, TimerApi } from '../pointing/deps';
import { createDragCompass } from '../pointing/drag-compass';
import type { DragCompass } from '../pointing/drag-compass';
import type { AudioContextFactory, NoiseSource, SensorPointing } from './deps';
import { DEFAULT_VOLUME, createBeaconPlayer } from './beacon-player';
import type { AudioStatus } from './beacon-player';
import { createObserverStore } from './observer-store';
import { findTargetPass } from './pass-finder';
import { createResultStore } from './result-store';

export interface SessionControllerDeps {
  readonly clock: Clock;
  readonly timers: TimerApi;
  readonly storage: KeyValueStorage;
  readonly tleFetcher: TleFetcher;
  readonly noise: NoiseSource;
  readonly audioContextFactory: AudioContextFactory;
  readonly pointing: SensorPointing;
}

export type SessionActionResult =
  | { readonly ok: true; readonly phase: SessionPhase }
  | { readonly ok: false; readonly rejection: TransitionRejection }
  | { readonly ok: false; readonly failure: 'tle-unavailable' | 'no-pass-found' };

export type DemoPointing = 'auto' | 'manual';

export interface SessionSnapshot {
  readonly entry: PlayableEntry;
  readonly phase: SessionPhase;
  readonly clockMode: ClockMode | null;
  readonly observer: ObserverPosition;
  readonly tleStatus: 'loading' | 'ready' | 'failed';
  readonly previewPass: Pass | null;
  readonly failure: 'tle-unavailable' | 'no-pass-found' | null;
  readonly targetPass: Pass | null;
  readonly sessionInstantMs: number | null;
  readonly countdownMs: number | null;
  readonly target: TargetDirection | null;
  readonly orbitDataMissing: boolean;
  readonly doppler: DopplerReadout | null;
  readonly lock: LockResult | null;
  readonly pointingSource: 'sensor' | 'auto' | 'manual' | null;
  readonly audio: { readonly status: AudioStatus; readonly muted: boolean; readonly volume: number };
  readonly lastRejection: TransitionRejection | null;
  readonly result: SessionResult | null;
  readonly joined: boolean;
}

export interface SessionController {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SessionSnapshot;
  readCountdownMs(): number | null;
  setObserver(position: ObserverPosition): boolean;
  startRealTime(): Promise<SessionActionResult>;
  startDemo(): Promise<SessionActionResult>;
  abort(): SessionActionResult;
  newSession(): SessionActionResult;
  setDemoPointing(source: DemoPointing): boolean;
  pointerDown(p: PointerInput): void;
  pointerMove(p: PointerInput): void;
  pointerUp(p: PointerInput): void;
  enableAudio(): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  dispose(): void;
}

interface BeaconLevels {
  readonly pointingErrorDeg: number | null;
  readonly rangeRateKmPerS: number | null;
}

const NO_BEACON_LEVELS: BeaconLevels = Object.freeze({ pointingErrorDeg: null, rangeRateKmPerS: null });

export function createSessionController(deps: SessionControllerDeps, entry: PlayableEntry): SessionController {
  const observerStore = createObserverStore(deps.storage);
  const resultStore = createResultStore(deps.storage);
  const beaconPlayer = createBeaconPlayer({
    audioContextFactory: deps.audioContextFactory,
    timers: deps.timers,
    noise: deps.noise,
  });
  const compass: DragCompass = createDragCompass({ onPose: handlePose });

  const listeners = new Set<() => void>();
  let disposed = false;

  // Session context (D1): everything the transition table does not carry.
  let phase: SessionPhase = 'selecting';
  let clockMode: ClockMode | null = null;
  let anchor: VirtualClockAnchor | null = null;
  let observer: ObserverPosition = observerStore.get();
  let targetPass: Pass | null = null;
  let previewPass: Pass | null = null;
  let failure: 'tle-unavailable' | 'no-pass-found' | null = null;
  let lastRejection: TransitionRejection | null = null;
  let result: SessionResult | null = null;
  let pointingSource: 'sensor' | 'auto' | 'manual' | null = null;
  let joined = false;

  // TLE and Satrec.
  let tleStatus: 'loading' | 'ready' | 'failed' = 'loading';
  let tleRecord: TleRecord | null = null;
  let satrec: Satrec | null = null;
  let tlePending: Promise<TleRecord> | null = null;

  // Sample state, as of the last sample.
  let instantMs: number | null = null;
  let stats: LockStats = EMPTY_LOCK_STATS;
  let target: TargetDirection | null = null;
  let orbitDataMissing = false;
  let doppler: DopplerReadout | null = null;
  let lock: LockResult | null = null;
  let beaconLevels: BeaconLevels = NO_BEACON_LEVELS;
  let sampling = false;

  // Audio master settings.
  let muted = false;
  let volume = DEFAULT_VOLUME;

  let tickHandle: unknown = null;
  let tickArmed = false;
  let unsubscribePointing: () => void = () => undefined;
  let snapshot: SessionSnapshot;

  // ---- clocks -------------------------------------------------------------------------------------------------

  function sessionInstant(): number | null {
    const realMs = deps.clock.nowMs();
    if (clockMode === 'real') return realInstantMs(realMs);
    if (clockMode === 'demo' && anchor !== null) return virtualInstantMs(anchor, realMs);
    return null;
  }

  function readCountdownMs(): number | null {
    if (phase !== 'awaiting-pass' || targetPass === null) return null;
    const t = sessionInstant();
    return t === null ? null : countdownMs(targetPass.riseMs, t);
  }

  // ---- snapshot -----------------------------------------------------------------------------------------------

  function buildSnapshot(): SessionSnapshot {
    const awaiting = phase === 'awaiting-pass';
    return Object.freeze({
      entry,
      phase,
      clockMode,
      observer,
      tleStatus,
      previewPass,
      failure,
      targetPass,
      sessionInstantMs: awaiting ? sessionInstant() : phase === 'selecting' ? null : instantMs,
      countdownMs: readCountdownMs(),
      target,
      orbitDataMissing,
      doppler,
      lock,
      pointingSource,
      audio: Object.freeze({ status: beaconPlayer.status(), muted, volume }),
      lastRejection,
      result,
      joined,
    });
  }

  function publish(): void {
    if (disposed) return;
    snapshot = buildSnapshot();
    for (const listener of [...listeners]) listener();
  }

  // ---- transitions --------------------------------------------------------------------------------------------

  /** Applies an event through the transition table. A rejection is stored, published and returned. */
  function dispatch(event: SessionEvent): TransitionRejection | null {
    const outcome = sessionTransition(phase, event);
    if (!outcome.ok) {
      lastRejection = outcome.rejection;
      publish();
      return outcome.rejection;
    }
    phase = outcome.next;
    lastRejection = null;
    return null;
  }

  // ---- TLE ----------------------------------------------------------------------------------------------------

  function afterTleSettled(): void {
    if (disposed) return;
    if (tleStatus === 'ready' && phase === 'selecting') computePreview();
    publish();
  }

  /** Resolves with the TLE; refetches after a failure (OQ-1). One fetch at a time. */
  function requestTle(): Promise<TleRecord> {
    if (tleRecord !== null) return Promise.resolve(tleRecord);
    if (tlePending !== null) return tlePending;
    tleStatus = 'loading';
    const pending: Promise<TleRecord> = new Promise<TleRecord>((resolve) => {
      resolve(deps.tleFetcher.fetchTle(entry.noradId));
    })
      .then((tle) => {
        const created = createSatrec(tle);
        tleRecord = tle;
        satrec = created;
        return tle;
      })
      .then(
        (tle) => {
          tlePending = null;
          tleStatus = 'ready';
          afterTleSettled();
          return tle;
        },
        (error: unknown) => {
          tlePending = null;
          tleStatus = 'failed';
          afterTleSettled();
          throw error;
        },
      );
    tlePending = pending;
    return pending;
  }

  function engineObserver(): { latitudeDeg: number; longitudeDeg: number; altitudeKm: number } {
    return { latitudeDeg: observer.latitudeDeg, longitudeDeg: observer.longitudeDeg, altitudeKm: 0 };
  }

  function computePreview(): void {
    if (tleRecord === null) {
      previewPass = null;
      return;
    }
    try {
      const outcome = findTargetPass(tleRecord, engineObserver(), deps.clock.nowMs(), 'real');
      previewPass = outcome.kind === 'found' ? outcome.pass : null;
    } catch {
      previewPass = null;
    }
  }

  // ---- beacon -------------------------------------------------------------------------------------------------

  function stateAt(phaseS: number): BeaconState {
    if (phase !== 'in-pass') return SILENT_BEACON_STATE;
    return beaconState({
      pointingErrorDeg: beaconLevels.pointingErrorDeg,
      rangeRateKmPerS: beaconLevels.rangeRateKmPerS,
      beacon: entry.beacon,
      phaseS,
    });
  }

  function refreshPointingError(pointingErrorDeg: number | null): void {
    beaconLevels = { pointingErrorDeg, rangeRateKmPerS: beaconLevels.rangeRateKmPerS };
  }

  /** S3 snapshot changed (Sensor_Pointing): refresh the beacon's Pointing_Error without a Lock_Sample. */
  function handlePointingChange(): void {
    if (disposed || sampling) return;
    if (phase !== 'in-pass' || pointingSource !== 'sensor' || orbitDataMissing || target === null) return;
    refreshPointingError(deps.pointing.getSnapshot().lock?.pointingErrorDeg ?? null);
  }

  /** Drag pose changed (Manual_Pointing): refresh the Pointing_Error without a Lock_Sample, and republish. */
  function handlePose(pose: DragPose): void {
    if (disposed || phase !== 'in-pass' || pointingSource !== 'manual' || !compass.isActive() || target === null) {
      return;
    }
    lock = evaluateLock(cameraBasisFromDrag(pose).forward, target, 0);
    refreshPointingError(lock.pointingErrorDeg);
    publish();
  }

  // ---- sampling -----------------------------------------------------------------------------------------------

  function sampleAt(t: number): void {
    const mode = clockMode ?? 'real';
    instantMs = t;

    let observation: ReturnType<typeof observeAt> | null = null;
    if (satrec !== null) {
      try {
        observation = observeAt(satrec, t, engineObserver());
      } catch {
        observation = null;
      }
    }

    if (observation === null || !observation.ok) {
      target = null;
      orbitDataMissing = true;
      lock = null;
      doppler = null;
      stats = reduceLockStats(stats, { instantMs: t, lock: null }, maxHoldMsFor(mode));
      beaconLevels = NO_BEACON_LEVELS;
      return;
    }

    const direction: TargetDirection = {
      azimuthDeg: observation.lookAngles.azimuthDeg,
      elevationDeg: observation.lookAngles.elevationDeg,
    };
    target = direction;
    orbitDataMissing = false;

    let evaluated: LockResult | null = null;
    if (pointingSource === 'sensor') {
      sampling = true;
      try {
        deps.pointing.setTarget(direction);
        evaluated = deps.pointing.getSnapshot().lock;
      } finally {
        sampling = false;
      }
    } else if (pointingSource === 'auto') {
      const u1 = deps.noise.next();
      const u2 = deps.noise.next();
      const u3 = deps.noise.next();
      const aimed = offsetDirection(direction, drawJitter(u1, u2, u3));
      evaluated = evaluateLock(sceneDirection(aimed.azimuthDeg, aimed.elevationDeg), direction, 0);
    } else if (pointingSource === 'manual' && compass.isActive()) {
      evaluated = evaluateLock(cameraBasisFromDrag(compass.getPose()).forward, direction, 0);
    }

    lock = evaluated;
    stats = reduceLockStats(
      stats,
      {
        instantMs: t,
        lock:
          evaluated === null
            ? null
            : { pointingErrorDeg: evaluated.pointingErrorDeg, locked: evaluated.locked, autoPoint: pointingSource === 'auto' },
      },
      maxHoldMsFor(mode),
    );
    beaconLevels = {
      pointingErrorDeg: evaluated === null ? null : evaluated.pointingErrorDeg,
      rangeRateKmPerS: observation.rangeRateKmPerS,
    };
    doppler = dopplerReadout(entry.beacon.downlinkMhz, observation.rangeRateKmPerS);
  }

  function resetSampleState(): void {
    instantMs = null;
    stats = EMPTY_LOCK_STATS;
    target = null;
    orbitDataMissing = false;
    doppler = null;
    lock = null;
    beaconLevels = NO_BEACON_LEVELS;
  }

  // ---- tick ---------------------------------------------------------------------------------------------------

  function clearTick(): void {
    if (tickArmed) {
      deps.timers.clearTimeout(tickHandle);
      tickArmed = false;
      tickHandle = null;
    }
  }

  function armTick(): void {
    clearTick();
    tickHandle = deps.timers.setTimeout(tick, SESSION_TICK_MS);
    tickArmed = true;
  }

  /** Statistics restart, one sample at `t` (unless `sample` is false), the tick runs and the beacon starts. */
  function beginInPass(t: number, sample: boolean): void {
    resetSampleState();
    instantMs = t;
    if (sample) sampleAt(t);
    armTick();
    beaconPlayer.start(stateAt);
  }

  function complete(completed: boolean): TransitionRejection | null {
    const pass = targetPass;
    const mode = clockMode;
    if (pass === null || mode === null) return dispatch(completed ? 'los-reached' : 'abort');
    const endMs = completed ? pass.setMs : (sessionInstant() ?? pass.setMs);
    const closed = closeLockStats(stats, endMs, maxHoldMsFor(mode));
    const built = buildSessionResult({ noradId: entry.noradId, pass, endMs, completed, mode }, closed);
    const rejection = dispatch(completed ? 'los-reached' : 'abort');
    if (rejection !== null) return rejection;
    resultStore.append(built);
    beaconPlayer.stop();
    clearTick();
    compass.deactivate();
    result = built;
    instantMs = endMs;
    target = null;
    orbitDataMissing = false;
    doppler = null;
    lock = null;
    beaconLevels = NO_BEACON_LEVELS;
    publish();
    return null;
  }

  /** Dispatches every event that the clock implies, in order: AOS_Reached before LOS_Reached. */
  function runChecks(): void {
    const t = sessionInstant();
    if (t === null || targetPass === null) return;
    if (phase === 'awaiting-pass' && t >= targetPass.riseMs) {
      if (dispatch('aos-reached') !== null) return;
      beginInPass(t, t < targetPass.setMs);
    }
    if (phase === 'in-pass' && t >= targetPass.setMs) {
      complete(true);
    }
  }

  function tick(): void {
    tickArmed = false;
    tickHandle = null;
    if (disposed) return;
    const phaseBefore = phase;
    runChecks();
    if (phase === 'awaiting-pass') {
      armTick();
    } else if (phase === 'in-pass') {
      if (phaseBefore === 'in-pass') {
        const t = sessionInstant();
        if (t !== null) sampleAt(t);
      }
      armTick();
    }
    publish();
  }

  // ---- actions ------------------------------------------------------------------------------------------------

  function rejected(event: SessionEvent): SessionActionResult {
    return { ok: false, rejection: { kind: 'transition-rejected', state: phase, event } };
  }

  async function start(mode: ClockMode): Promise<SessionActionResult> {
    // 'pick' stands in for the real start check; a rejected start fetches nothing.
    const checkEvent: SessionEvent = mode === 'real' ? 'pick' : 'start-demo';
    const first = sessionTransition(phase, checkEvent);
    if (!first.ok) {
      lastRejection = first.rejection;
      publish();
      return { ok: false, rejection: first.rejection };
    }

    let tle: TleRecord;
    const wasFailed = tleStatus === 'failed';
    try {
      const pending = requestTle();
      if (wasFailed) publish();
      tle = await pending;
    } catch {
      failure = 'tle-unavailable';
      publish();
      return { ok: false, failure };
    }
    if (disposed) return rejected(checkEvent);

    const now = deps.clock.nowMs();
    let found: Pass | null;
    try {
      const outcome = findTargetPass(tle, engineObserver(), now, mode);
      found = outcome.kind === 'found' ? outcome.pass : null;
    } catch {
      failure = 'tle-unavailable';
      publish();
      return { ok: false, failure };
    }
    if (found === null) {
      failure = 'no-pass-found';
      publish();
      return { ok: false, failure };
    }
    const pass = found;

    // The phase may have changed during the await.
    if (mode === 'demo') {
      const rejection = dispatch('start-demo');
      if (rejection !== null) return { ok: false, rejection };
      failure = null;
      anchor = { anchorRealMs: now, anchorSessionMs: pass.riseMs };
      clockMode = 'demo';
      pointingSource = 'auto';
      targetPass = pass;
      result = null;
      beginInPass(pass.riseMs, true);
      publish();
      return { ok: true, phase };
    }

    const event: SessionEvent = pass.riseMs > now ? 'pick' : 'join';
    const rejection = dispatch(event);
    if (rejection !== null) return { ok: false, rejection };
    failure = null;
    anchor = null;
    clockMode = 'real';
    pointingSource = 'sensor';
    joined = event === 'join';
    targetPass = pass;
    result = null;
    deps.pointing.setObserver(observer);
    if (event === 'pick') {
      resetSampleState();
      armTick();
    } else {
      beginInPass(realInstantMs(now), true);
    }
    publish();
    return { ok: true, phase };
  }

  function abort(): SessionActionResult {
    if (disposed) return rejected('abort');
    runChecks();
    if (phase === 'awaiting-pass') {
      const rejection = dispatch('abort');
      if (rejection !== null) return { ok: false, rejection };
      clearTick();
      targetPass = null;
      clockMode = null;
      anchor = null;
      pointingSource = null;
      joined = false;
      publish();
      return { ok: true, phase };
    }
    if (phase === 'in-pass') {
      const rejection = complete(false);
      if (rejection !== null) return { ok: false, rejection };
      return { ok: true, phase };
    }
    const outcome = sessionTransition(phase, 'abort');
    if (!outcome.ok) {
      lastRejection = outcome.rejection;
      publish();
      return { ok: false, rejection: outcome.rejection };
    }
    return { ok: true, phase };
  }

  function newSession(): SessionActionResult {
    if (disposed) return rejected('new-session');
    const rejection = dispatch('new-session');
    if (rejection !== null) return { ok: false, rejection };
    targetPass = null;
    result = null;
    clockMode = null;
    anchor = null;
    pointingSource = null;
    joined = false;
    failure = null;
    resetSampleState();
    computePreview();
    publish();
    return { ok: true, phase };
  }

  function setObserver(position: ObserverPosition): boolean {
    if (disposed || phase !== 'selecting') return false;
    if (!observerStore.set(position)) return false;
    observer = { latitudeDeg: position.latitudeDeg, longitudeDeg: position.longitudeDeg };
    computePreview();
    publish();
    return true;
  }

  function setDemoPointing(source: DemoPointing): boolean {
    if (disposed || phase !== 'in-pass' || clockMode !== 'demo') return false;
    if (source === 'manual') {
      pointingSource = 'manual';
      compass.activate();
    } else {
      pointingSource = 'auto';
      compass.deactivate();
    }
    publish();
    return true;
  }

  function enableAudio(): void {
    if (disposed) return;
    beaconPlayer.enableFromGesture();
    beaconPlayer.setMaster(muted, volume);
    if (phase === 'in-pass') beaconPlayer.start(stateAt);
    publish();
  }

  function dispose(): void {
    if (disposed) return;
    if (phase === 'in-pass') {
      try {
        // An unmount counts as Abort; the tick checks run first, as in abort().
        runChecks();
        if (phase === 'in-pass') complete(false);
      } catch {
        // best effort
      }
    }
    disposed = true;
    joined = false;
    clearTick();
    beaconPlayer.dispose();
    compass.deactivate();
    unsubscribePointing();
    listeners.clear();
  }

  // ---- creation -----------------------------------------------------------------------------------------------

  snapshot = buildSnapshot();
  unsubscribePointing = deps.pointing.subscribe(handlePointingChange);
  requestTle().catch(() => undefined);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    readCountdownMs,
    setObserver,
    startRealTime: () => start('real'),
    startDemo: () => start('demo'),
    abort,
    newSession,
    setDemoPointing,
    pointerDown(p) {
      if (clockMode === 'real') deps.pointing.pointerDown(p);
      else if (clockMode === 'demo' && compass.isActive()) compass.pointerDown(p);
    },
    pointerMove(p) {
      if (clockMode === 'real') deps.pointing.pointerMove(p);
      else if (clockMode === 'demo' && compass.isActive()) compass.pointerMove(p);
    },
    pointerUp(p) {
      if (clockMode === 'real') deps.pointing.pointerUp(p);
      else if (clockMode === 'demo' && compass.isActive()) compass.pointerUp(p);
    },
    enableAudio,
    setMuted(next) {
      muted = next;
      beaconPlayer.setMaster(muted, volume);
      publish();
    },
    setVolume(next) {
      if (!Number.isFinite(next)) return;
      volume = Math.min(1, Math.max(0, next));
      beaconPlayer.setMaster(muted, volume);
      publish();
    },
    dispose,
  };
}
