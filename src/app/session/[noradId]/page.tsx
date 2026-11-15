'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { PointerEvent } from 'react';
import type { PlayableEntry } from '../../../lib/catalog/index';
import { CALIBRATION_STEP_DEG } from '../../../lib/pointing/index';
import { createBrowserDeps } from '../../../components/pointing/browser-deps';
import {
  createPointingSession,
  DEFAULT_OBSERVER,
  DEFAULT_TARGET,
} from '../../../components/pointing/pointing-session';
import type { PointingSession, PointingSnapshot } from '../../../components/pointing/pointing-session';
import { DEFAULT_VOLUME } from '../../../components/session/beacon-player';
import { createSessionBrowserDeps } from '../../../components/session/browser-deps';
import { SESSION_COPY } from '../../../components/session/copy';
import { createSessionController } from '../../../components/session/session-controller';
import type { SessionController, SessionSnapshot } from '../../../components/session/session-controller';
import {
  formatCountdown,
  formatDopplerReadout,
  formatDurationMin,
  formatUtc,
  parseCoordinateInput,
  resolvePlayableEntry,
} from '../../../lib/session/index';
import type { SessionResult } from '../../../lib/session/index';

// Neutral pointing view used on the server and until the session exists in the browser.
const INITIAL_POINTING_SNAPSHOT: PointingSnapshot = Object.freeze({
  permission: 'unknown',
  mode: 'sensor',
  source: null,
  basis: null,
  lock: null,
  calibrationOffsetDeg: 0,
  declinationAppliedDeg: null,
  observer: DEFAULT_OBSERVER,
  target: DEFAULT_TARGET,
  dragActive: false,
});

const getServerPointingSnapshot = (): PointingSnapshot => INITIAL_POINTING_SNAPSHOT;
const noopSubscribe = (): (() => void) => () => {};

function initialSnapshot(entry: PlayableEntry): SessionSnapshot {
  return Object.freeze({
    entry,
    phase: 'selecting',
    clockMode: null,
    observer: DEFAULT_OBSERVER,
    tleStatus: 'loading',
    previewPass: null,
    failure: null,
    targetPass: null,
    sessionInstantMs: null,
    countdownMs: null,
    target: null,
    orbitDataMissing: false,
    doppler: null,
    lock: null,
    pointingSource: null,
    audio: Object.freeze({ status: 'off', muted: false, volume: DEFAULT_VOLUME }),
    lastRejection: null,
    result: null,
    joined: false,
  });
}

type FieldName = 'lat' | 'lon';

const sectionStyle = { marginTop: '1.25rem' } as const;

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(1);
}

function ResultView({ result }: { result: SessionResult }) {
  return (
    <dl>
      <dt>Locked time</dt>
      <dd>{Math.round(result.lockedSeconds)} s</dd>
      <dt>Locked ratio</dt>
      <dd>{(result.lockedRatio * 100).toFixed(1)} %</dd>
      <dt>Best pointing error</dt>
      <dd>{result.bestPointingErrorDeg === null ? '—' : `${result.bestPointingErrorDeg.toFixed(1)}°`}</dd>
      <dt>Outcome</dt>
      <dd>{result.completed ? 'Completed' : 'Aborted'}</dd>
      <dt>Mode</dt>
      <dd>{result.mode === 'demo' ? 'Demo (60×)' : 'Real time'}</dd>
    </dl>
  );
}

function SessionView({ entry }: { entry: PlayableEntry }) {
  const [controller, setController] = useState<SessionController | null>(null);
  const [pointing, setPointing] = useState<PointingSession | null>(null);
  // null means "show the value from the snapshot"; text is what the user typed.
  const [raw, setRaw] = useState<Record<FieldName, string | null>>({ lat: null, lon: null });
  const [invalid, setInvalid] = useState<Record<FieldName, boolean>>({ lat: false, lon: false });

  const serverSnapshot = useMemo(() => initialSnapshot(entry), [entry]);
  const getServerSnapshot = (): SessionSnapshot => serverSnapshot;

  useEffect(() => {
    const createdPointing = createPointingSession(createBrowserDeps());
    const createdController = createSessionController(createSessionBrowserDeps(createdPointing), entry);
    setPointing(createdPointing);
    setController(createdController);
    return () => {
      createdController.dispose();
      createdPointing.dispose();
      setController(null);
      setPointing(null);
    };
  }, [entry]);

  const snapshot = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    controller ? controller.getSnapshot : getServerSnapshot,
    getServerSnapshot,
  );
  const pointingSnapshot = useSyncExternalStore(
    pointing ? pointing.subscribe : noopSubscribe,
    pointing ? pointing.getSnapshot : getServerPointingSnapshot,
    getServerPointingSnapshot,
  );

  function onField(name: FieldName, text: string) {
    setRaw((prev) => ({ ...prev, [name]: text }));
    const value = name === 'lat' ? parseCoordinateInput(text, -90, 90) : parseCoordinateInput(text, -180, 180);
    setInvalid((prev) => ({ ...prev, [name]: value === null }));
    if (value === null || controller === null) return;
    if (name === 'lat') {
      controller.setObserver({ latitudeDeg: value, longitudeDeg: snapshot.observer.longitudeDeg });
    } else {
      controller.setObserver({ latitudeDeg: snapshot.observer.latitudeDeg, longitudeDeg: value });
    }
  }

  function field(name: FieldName, label: string, hint: string, current: number) {
    return (
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        {label}{' '}
        <input
          type="number"
          step="any"
          value={raw[name] ?? String(current)}
          aria-invalid={invalid[name]}
          onChange={(e) => onField(name, e.target.value)}
        />
        {invalid[name] ? <span role="alert"> Invalid value, expected {hint}. Previous value kept.</span> : null}
      </label>
    );
  }

  function pointer(e: PointerEvent<HTMLDivElement>) {
    return { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };
  }

  // The enableAudio call stays first and synchronous: it is the user-gesture entry for audio.
  function startRealTime() {
    if (controller === null) return;
    controller.enableAudio();
    void controller.startRealTime();
  }

  function startDemo() {
    if (controller === null) return;
    controller.enableAudio();
    void controller.startDemo();
  }

  function dragArea(label: string) {
    return (
      <div
        style={{
          touchAction: 'none',
          marginTop: '0.5rem',
          height: '10rem',
          border: '1px dashed currentColor',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          controller?.pointerDown(pointer(e));
        }}
        onPointerMove={(e) => controller?.pointerMove(pointer(e))}
        onPointerUp={(e) => {
          controller?.pointerUp(pointer(e));
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => controller?.pointerUp(pointer(e))}
      >
        {label}
      </div>
    );
  }

  const { phase, lock, targetPass } = snapshot;
  const { beacon } = entry;
  const isDemo = snapshot.clockMode === 'demo';
  const audioStatus = snapshot.audio.status;
  const previewFailure = snapshot.failure ?? (snapshot.tleStatus === 'failed' ? 'tle-unavailable' : null);

  return (
    <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>{`${entry.name} · zombieSatellite`}</title>

      <header>
        <h1>{entry.name}</h1>
        <p>
          Difficulty: {entry.difficulty} · {SESSION_COPY.statusLabels[entry.status]}
        </p>
        <p>Downlink frequency: {beacon.displayFrequency ?? SESSION_COPY.noFrequency}</p>
        {beacon.sunlitOnly ? <p>{SESSION_COPY.sunlitNote}</p> : null}
        {beacon.downlinkMhz === null ? <p>{SESSION_COPY.imageNote}</p> : null}
        <p>{SESSION_COPY.utcNote}</p>
        <p>
          <Link href="/session">All satellites</Link>
        </p>
      </header>

      {snapshot.lastRejection !== null ? (
        <p role="alert">
          That action is not available now (action {snapshot.lastRejection.event}, state{' '}
          {snapshot.lastRejection.state}).
        </p>
      ) : null}

      {phase === 'selecting' ? (
        <section style={sectionStyle}>
          <h2>Select a pass</h2>
          {field('lat', 'Observer latitude (°)', 'a number from −90 to 90', snapshot.observer.latitudeDeg)}
          {field('lon', 'Observer longitude (°)', 'a number from −180 to 180', snapshot.observer.longitudeDeg)}
          {previewFailure === 'tle-unavailable' ? <p>Orbit data unavailable.</p> : null}
          {previewFailure === 'no-pass-found' ? <p>No pass found in the next 7 days.</p> : null}
          {previewFailure === null && snapshot.tleStatus === 'loading' ? <p>Loading orbit data…</p> : null}
          {previewFailure === null && snapshot.tleStatus === 'ready' && snapshot.previewPass === null ? (
            <p>No pass found in the next 7 days.</p>
          ) : null}
          {previewFailure === null && snapshot.previewPass !== null ? (
            <p>
              Next pass: {formatUtc(snapshot.previewPass.riseMs)} to {formatUtc(snapshot.previewPass.setMs)}, max
              elevation {snapshot.previewPass.maxElevationDeg.toFixed(1)}°,{' '}
              {formatDurationMin(snapshot.previewPass.durationMin)}
            </p>
          ) : null}
          <p>
            <button type="button" onClick={startRealTime} disabled={controller === null}>
              Start in real time
            </button>{' '}
            <button type="button" onClick={startDemo} disabled={controller === null}>
              Start demo (60×)
            </button>
          </p>
          <p>{SESSION_COPY.demoNote}</p>
        </section>
      ) : null}

      {phase === 'awaiting-pass' ? (
        <section style={sectionStyle}>
          <h2>Waiting for the pass</h2>
          {targetPass !== null ? (
            <p>
              Target pass: {formatUtc(targetPass.riseMs)} to {formatUtc(targetPass.setMs)}
            </p>
          ) : null}
          <p>{snapshot.countdownMs === null ? '—' : formatCountdown(snapshot.countdownMs)}</p>
          <p>
            <button type="button" onClick={startDemo} disabled={controller === null}>
              Start demo instead
            </button>{' '}
            <button type="button" onClick={() => controller?.abort()} disabled={controller === null}>
              Abort
            </button>
          </p>
        </section>
      ) : null}

      {phase === 'in-pass' ? (
        <section style={sectionStyle}>
          <h2>Pass in progress</h2>
          {snapshot.joined ? <p>{SESSION_COPY.joinNote}</p> : null}
          {targetPass !== null ? (
            <p>
              Target pass: {formatUtc(targetPass.riseMs)} to {formatUtc(targetPass.setMs)}
            </p>
          ) : null}
          <dl>
            <dt>Session time</dt>
            <dd>{snapshot.sessionInstantMs === null ? '—' : formatUtc(snapshot.sessionInstantMs)}</dd>
            <dt>Azimuth</dt>
            <dd>{snapshot.orbitDataMissing || snapshot.target === null ? SESSION_COPY.noOrbitData : `${snapshot.target.azimuthDeg.toFixed(1)}°`}</dd>
            <dt>Elevation</dt>
            <dd>{snapshot.orbitDataMissing || snapshot.target === null ? SESSION_COPY.noOrbitData : `${snapshot.target.elevationDeg.toFixed(1)}°`}</dd>
            <dt>Doppler shift</dt>
            <dd>{snapshot.doppler === null ? '—' : formatDopplerReadout(snapshot.doppler)}</dd>
            <dt>Pointing error</dt>
            <dd>{lock === null ? '—' : `${fmt(lock.pointingErrorDeg)}°`}</dd>
            <dt>Locked</dt>
            <dd>{lock === null ? '—' : lock.locked ? 'yes' : 'no'}</dd>
          </dl>
          <p>{SESSION_COPY.glideNote}</p>

          {isDemo ? (
            <div>
              <h3>Pointing</h3>
              <p>
                <button
                  type="button"
                  aria-pressed={snapshot.pointingSource === 'auto'}
                  onClick={() => controller?.setDemoPointing('auto')}
                >
                  Auto-point
                </button>{' '}
                <button
                  type="button"
                  aria-pressed={snapshot.pointingSource === 'manual'}
                  onClick={() => controller?.setDemoPointing('manual')}
                >
                  Manual
                </button>
              </p>
              <p>{SESSION_COPY.autoPointNote}</p>
              {snapshot.pointingSource === 'manual' ? dragArea('Drag here to turn the view') : null}
            </div>
          ) : (
            <div>
              <h3>Motion sensors</h3>
              {pointingSnapshot.permission === 'unknown' || pointingSnapshot.permission === 'denied' ? (
                <div>
                  {pointingSnapshot.permission === 'denied' ? <p role="alert">Motion sensor access was denied.</p> : null}
                  <button type="button" onClick={() => pointing?.requestPermission()} disabled={pointing === null}>
                    {pointingSnapshot.permission === 'denied' ? 'Try again' : 'Enable motion sensors'}
                  </button>
                </div>
              ) : null}
              {pointingSnapshot.permission === 'requesting' ? <p>Waiting for the browser permission prompt…</p> : null}
              {pointingSnapshot.permission === 'unavailable' ? (
                <p>No orientation data arrived. The drag compass is active.</p>
              ) : null}
              {pointingSnapshot.permission === 'granted' ? (
                <p>Motion sensors enabled. Heading source: {pointingSnapshot.source ?? '—'}</p>
              ) : null}
              <label>
                <input
                  type="checkbox"
                  checked={pointingSnapshot.dragActive}
                  onChange={() => pointing?.setDragEnabled(!pointingSnapshot.dragActive)}
                />{' '}
                Drag compass
              </label>
              {dragArea('Drag here to turn the compass')}
              <p>
                <button type="button" onClick={() => pointing?.stepCalibration(-CALIBRATION_STEP_DEG)}>
                  −{CALIBRATION_STEP_DEG}°
                </button>{' '}
                <button type="button" onClick={() => pointing?.stepCalibration(CALIBRATION_STEP_DEG)}>
                  +{CALIBRATION_STEP_DEG}°
                </button>{' '}
                Offset: {fmt(pointingSnapshot.calibrationOffsetDeg)}°
              </p>
            </div>
          )}

          <p>
            <button type="button" onClick={() => controller?.abort()} disabled={controller === null}>
              Abort
            </button>
          </p>
        </section>
      ) : null}

      {phase === 'completed' ? (
        <section style={sectionStyle}>
          <h2>Session result</h2>
          {snapshot.result !== null ? <ResultView result={snapshot.result} /> : null}
          <button type="button" onClick={() => controller?.newSession()} disabled={controller === null}>
            New session
          </button>
          <p>
            <Link href="/cards">View your QSL cards</Link>
          </p>
        </section>
      ) : null}

      <section style={sectionStyle}>
        <h2>Sound</h2>
        {audioStatus === 'off' || audioStatus === 'suspended' ? (
          <p>
            <button type="button" onClick={() => controller?.enableAudio()} disabled={controller === null}>
              {SESSION_COPY.enableSound}
            </button>
          </p>
        ) : null}
        {audioStatus === 'unavailable' ? <p>{SESSION_COPY.audioUnavailable}</p> : null}
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            checked={snapshot.audio.muted}
            onChange={(e) => controller?.setMuted(e.target.checked)}
          />{' '}
          Mute
        </label>
        <label style={{ display: 'block' }}>
          Volume{' '}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snapshot.audio.volume}
            onChange={(e) => controller?.setVolume(Number(e.target.value))}
          />
        </label>
      </section>

      <footer style={sectionStyle}>
        <p>{SESSION_COPY.simulationNotice}</p>
      </footer>
    </main>
  );
}

export default function SessionPage() {
  const params = useParams<{ noradId: string }>();
  const entry = resolvePlayableEntry(params?.noradId);

  if (entry === null) {
    return (
      <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
        <title>Satellite not found · zombieSatellite</title>
        <h1>Satellite not found</h1>
        <p>This satellite is not in the playable catalog.</p>
        <p>
          <Link href="/session">Back to the satellite picker</Link>
        </p>
      </main>
    );
  }

  return <SessionView entry={entry} />;
}
