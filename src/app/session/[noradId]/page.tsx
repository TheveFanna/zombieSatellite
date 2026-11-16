'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { PlayableEntry } from '../../../lib/catalog/index';
import { tuningFileName } from '../../../lib/field/index';
import { createFieldBrowserDeps } from '../../../components/field/browser-deps';
import type { FieldBrowserDeps } from '../../../components/field/browser-deps';
import { createFieldDownloader } from '../../../components/field/field-downloader';
import { createPassFieldController } from '../../../components/field/pass-field-controller';
import type { PassFieldController, PassFieldSnapshot } from '../../../components/field/pass-field-controller';
import { ArView } from '../../../components/field/ar-view';
import { createTleSource } from '../../../components/field/tle-source';
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
  formatDurationMin,
  formatUtc,
  parseCoordinateInput,
  resolvePlayableEntry,
} from '../../../lib/session/index';
import { markerPlacement } from '../../../lib/shell/index';
import { SessionConsole } from '../../../components/console/session-console';
import { throttleSubscribe } from '../../../components/console/frame-throttle';

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
  const pointingSubscribe = useMemo(() => {
    if (pointing === null) return noopSubscribe;
    if (fieldDeps === null) return pointing.subscribe;
    return throttleSubscribe(pointing.subscribe, { frames: fieldDeps.frames, clock: fieldDeps.clock }, 33);
  }, [pointing, fieldDeps]);
  const pointingSnapshot = useSyncExternalStore(
    pointingSubscribe,
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

  const { phase } = snapshot;
  const isDemo = snapshot.clockMode === 'demo';
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

  const observerControls = (
    <>
      {field('lat', 'Observer latitude (°)', 'a number from −90 to 90', snapshot.observer.latitudeDeg)}
      {field('lon', 'Observer longitude (°)', 'a number from −180 to 180', snapshot.observer.longitudeDeg)}
      <p>
        <button type="button" onClick={locateNow} disabled={locator === null || locateStatus === 'locating'}>
          {locateStatus === 'locating' ? SHELL_COPY.locating : SHELL_COPY.useMyLocation}
        </button>
      </p>
      {locateStatus === 'failed' ? <p>{SHELL_COPY.locationFailed}</p> : null}
    </>
  );

  return (
    <main data-tab="session" data-ar-open={arOpen && arPhase ? '' : undefined} style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>{`${entry.name} · zombieSatellite`}</title>

      <SessionConsole
        entry={entry}
        snapshot={snapshot}
        pointingSnapshot={pointingSnapshot}
        field={fieldSnapshot}
        pointing={pointing}
        controller={controller}
        onOpenAr={openAr}
        onStartDemo={startDemo}
        onCopy={copyTable}
        onDownloadCsv={downloadCsv}
        observerControls={observerControls}
        placement={placement}
        cameraOn={cameraOn}
        cameraDisabled={camera === null}
        onToggleCamera={toggleCamera}
        videoRef={videoRef}
      />
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
