'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { PointerEvent } from 'react';
import type { PlayableEntry } from '../../../lib/catalog/index';
import { FIELD_COPY, tuningFileName } from '../../../lib/field/index';
import { createFieldBrowserDeps } from '../../../components/field/browser-deps';
import type { FieldBrowserDeps } from '../../../components/field/browser-deps';
import { createFieldDownloader } from '../../../components/field/field-downloader';
import { createPassFieldController } from '../../../components/field/pass-field-controller';
import type { PassFieldController, PassFieldSnapshot } from '../../../components/field/pass-field-controller';
import { ArView } from '../../../components/field/ar-view';
import { FieldSessionPanel } from '../../../components/field/session-panel';
import { createTleSource } from '../../../components/field/tle-source';
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
import { browserGeolocation, browserMediaDevices } from '../../../components/shell/browser-deps';
import { createCameraController } from '../../../components/shell/camera';
import { SHELL_COPY } from '../../../components/shell/copy';
import { createLocator } from '../../../components/shell/geolocation';
import type { LocateOutcome } from '../../../components/shell/geolocation';
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
import { markerPlacement } from '../../../lib/shell/index';
import { PassDome } from '../../../components/shell/visuals/sky-dome';
import { DopplerDial } from '../../../components/shell/visuals/doppler-dial';

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

const INITIAL_FIELD_SNAPSHOT: PassFieldSnapshot = Object.freeze({
  status: 'loading',
  satrec: null,
  tle: null,
  pass: null,
  track: null,
  profile: null,
  tuning: null,
});
const getServerFieldSnapshot = (): PassFieldSnapshot => INITIAL_FIELD_SNAPSHOT;

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
    shadowSilent: false,
    demoBasis: null,
  });
}

type FieldName = 'lat' | 'lon';
type Locator = ReturnType<typeof createLocator>;
type LocateStatus = 'idle' | 'locating' | 'failed';
type CameraController = ReturnType<typeof createCameraController>;

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
  const [locator, setLocator] = useState<Locator | null>(null);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle');
  const [camera, setCamera] = useState<CameraController | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [fieldController, setFieldController] = useState<PassFieldController | null>(null);
  const [fieldDeps, setFieldDeps] = useState<FieldBrowserDeps | null>(null);
  const [arOpen, setArOpen] = useState(false);

  const serverSnapshot = useMemo(() => initialSnapshot(entry), [entry]);
  const getServerSnapshot = (): SessionSnapshot => serverSnapshot;

  useEffect(() => {
    const createdPointing = createPointingSession(createBrowserDeps());
    const sessionDeps = createSessionBrowserDeps(createdPointing);
    const createdController = createSessionController(sessionDeps, entry);
    const createdLocator = createLocator({ geolocation: browserGeolocation(), storage: sessionDeps.storage });
    const createdCamera = createCameraController({ mediaDevices: browserMediaDevices() });
    const createdFieldDeps = createFieldBrowserDeps();
    const createdField = createPassFieldController(
      { tleSource: createTleSource(sessionDeps.tleFetcher, entry.noradId) },
      entry,
    );
    let active = true;
    setFieldDeps(createdFieldDeps);
    setFieldController(createdField);
    setPointing(createdPointing);
    setController(createdController);
    setLocator(createdLocator);
    setCamera(createdCamera);
    void createdLocator.autoLocate((position) => {
      if (!active) return false;
      const applied = createdController.setObserver(position);
      if (applied) resetFields();
      return applied;
    });
    return () => {
      active = false;
      createdCamera.stop();
      createdController.dispose();
      createdField.dispose();
      createdPointing.dispose();
      setFieldController(null);
      setFieldDeps(null);
      setController(null);
      setPointing(null);
      setLocator(null);
      setCamera(null);
      setCameraOn(false);
    };
  }, [entry]);

  function resetFields() {
    setRaw({ lat: null, lon: null });
    setInvalid({ lat: false, lon: false });
  }

  function locateNow() {
    if (locator === null || controller === null) return;
    setLocateStatus('locating');
    void locator
      .locateNow((position) => {
        const applied = controller.setObserver(position);
        if (applied) resetFields();
        return applied;
      })
      .then((outcome: LocateOutcome) => setLocateStatus(outcome === 'applied' || outcome === 'skipped' ? 'idle' : 'failed'));
  }

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

  const fieldSnapshot = useSyncExternalStore(
    fieldController ? fieldController.subscribe : noopSubscribe,
    fieldController ? fieldController.getSnapshot : getServerFieldSnapshot,
    getServerFieldSnapshot,
  );
  const fieldPass = snapshot.targetPass ?? snapshot.previewPass;
  const observerLat = snapshot.observer.latitudeDeg;
  const observerLon = snapshot.observer.longitudeDeg;

  // Observer first, then pass: the controller recomputes on each call.
  useEffect(() => {
    fieldController?.setObserver({ latitudeDeg: observerLat, longitudeDeg: observerLon });
  }, [fieldController, observerLat, observerLon]);
  useEffect(() => {
    fieldController?.setPass(fieldPass);
  }, [fieldController, fieldPass]);

  function copyTable(text: string): Promise<boolean> {
    const clipboard = fieldDeps?.clipboard ?? null;
    if (clipboard === null) return Promise.resolve(false);
    return clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }

  function downloadCsv(csv: string, aosMs: number) {
    if (fieldDeps === null) return;
    createFieldDownloader(fieldDeps.download).downloadText(
      csv,
      'text/csv;charset=utf-8',
      tuningFileName(entry.slug, aosMs),
    );
  }

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
      <div className="drag-area"
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
  const skyViewActive = phase === 'in-pass' && snapshot.clockMode === 'real';

  // The camera stops whenever the page leaves the real-time in-pass phase (DD-2).
  // cameraOn is a dependency too, so a start that resolves after the phase ended is stopped as well.
  useEffect(() => {
    if (skyViewActive) return;
    camera?.stop();
    setCameraOn(false);
  }, [skyViewActive, camera, cameraOn]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOn || video === null || camera === null) return;
    video.srcObject = camera.getStream() as MediaStream | null;
  }, [cameraOn, camera]);

  const arPhase = phase === 'awaiting-pass' || phase === 'in-pass';
  useEffect(() => {
    if (!arPhase) setArOpen(false);
  }, [arPhase]);

  // S6 DD-2 extended: the AR_View owns its own camera, so the Sky_View stream stops first.
  function openAr() {
    camera?.stop();
    setCameraOn(false);
    setArOpen(true);
  }

  function toggleCamera() {
    if (camera === null) return;
    if (cameraOn) {
      camera.stop();
      setCameraOn(false);
      return;
    }
    // Any outcome other than 'on' leaves the plain background, silently.
    void camera.start().then((outcome) => setCameraOn(outcome === 'on'));
  }

  const placement = markerPlacement(
    snapshot.orbitDataMissing || snapshot.target === null ? null : pointingSnapshot.target,
    pointingSnapshot.calibrationOffsetDeg,
    pointingSnapshot.basis,
  );

  return (
    <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>{`${entry.name} · zombieSatellite`}</title>

      <header>
        <h1>{entry.name}</h1>
        <p>
          Difficulty: {entry.difficulty} · {SESSION_COPY.statusLabels[entry.status]}
        </p>
        <p>Downlink frequency: {beacon.displayFrequency ?? SESSION_COPY.noFrequency}</p>
        {beacon.sunlitOnly ? <p>{SESSION_COPY.sunlitNote}</p> : null}
        {snapshot.shadowSilent ? <p>{FIELD_COPY.shadowSilenceNote}</p> : null}
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

      <FieldSessionPanel
        entry={entry}
        snapshot={snapshot}
        field={fieldSnapshot}
        onCopy={copyTable}
        onDownloadCsv={downloadCsv}
      />

      {phase === 'selecting' ? (
        <section style={sectionStyle}>
          <h2>Select a pass</h2>
          {field('lat', 'Observer latitude (°)', 'a number from −90 to 90', snapshot.observer.latitudeDeg)}
          {field('lon', 'Observer longitude (°)', 'a number from −180 to 180', snapshot.observer.longitudeDeg)}
          <p>
            <button type="button" onClick={locateNow} disabled={locator === null || locateStatus === 'locating'}>
              {locateStatus === 'locating' ? SHELL_COPY.locating : SHELL_COPY.useMyLocation}
            </button>
          </p>
          {locateStatus === 'failed' ? <p>{SHELL_COPY.locationFailed}</p> : null}
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
            <button type="button" className="primary" onClick={startRealTime} disabled={controller === null}>
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
            </button>{' '}
            <button type="button" onClick={openAr}>
              {FIELD_COPY.arOpen}
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
          <DopplerDial readout={snapshot.doppler} caption={SHELL_COPY.dialCaption} />
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
              <h3>{SHELL_COPY.domeHeading}</h3>
              <PassDome
                target={snapshot.orbitDataMissing ? null : snapshot.target}
                aim={null}
                locked={lock?.locked ?? false}
                offsetDeg={0}
              />
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
              <h3>{SHELL_COPY.skyViewHeading}</h3>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={cameraOn} onChange={toggleCamera} disabled={camera === null} />{' '}
                {SHELL_COPY.cameraToggle}
              </label>
              <div className="sky-view"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3 / 4',
                  overflow: 'hidden',
                  border: '1px solid currentColor',
                }}
              >
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : null}
                {placement.kind === 'on-screen' ? (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${placement.leftPct}%`,
                      top: `${placement.topPct}%`,
                      width: '1.5rem',
                      height: '1.5rem',
                      marginLeft: '-0.75rem',
                      marginTop: '-0.75rem',
                      borderRadius: '50%',
                      border: `3px solid ${lock?.locked ? '#2ea043' : '#f0f6fc'}`,
                      boxShadow: '0 0 0 1px #0d1117',
                    }}
                  />
                ) : (
                  <p style={{ position: 'absolute', left: 0, right: 0, bottom: 0, margin: 0, padding: '0.5rem' }}>
                    {placement.kind === 'out-of-view' ? SHELL_COPY.markerOutOfView : SHELL_COPY.noPointingYet}
                  </p>
                )}
              </div>
              <h3>{SHELL_COPY.domeHeading}</h3>
              <PassDome
                target={snapshot.orbitDataMissing ? null : snapshot.target}
                aim={pointingSnapshot.lock?.deviceHeadingDeg == null ? null : { headingDeg: pointingSnapshot.lock.deviceHeadingDeg, pitchDeg: pointingSnapshot.lock.devicePitchDeg }}
                locked={lock?.locked ?? false}
                offsetDeg={pointingSnapshot.calibrationOffsetDeg}
              />
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
            <button type="button" onClick={openAr}>
              {FIELD_COPY.arOpen}
            </button>{' '}
            <button type="button" onClick={() => controller?.abort()} disabled={controller === null}>
              Abort
            </button>
          </p>
        </section>
      ) : null}

      {arOpen && arPhase ? (
        <ArView
          snapshot={snapshot}
          field={fieldSnapshot}
          pointing={pointing}
          pointingSnapshot={pointingSnapshot}
          controller={controller}
          camera={!isDemo}
          onClose={() => setArOpen(false)}
        />
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
      <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
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
