'use client';
// AR tab (S9, S11): standalone AR with its own pointing session, camera, TLE source and observer.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { listPlayableEntries } from '../../lib/catalog/index';
import type { PlayableEntry } from '../../lib/catalog/index';
import {
  AR_MAX_FPS,
  FOV_DEFAULT_DEG,
  FOV_MAX_DEG,
  FOV_MIN_DEG,
  FOV_STEP_DEG,
  RING_MORPH_MS,
  RING_REFRESH_MS,
  STAR_COUNT,
  STAR_SEED,
  VISIBILITY_SPAN_MS,
  arMarker,
  blendDirection,
  blendRings,
  buildOrbitRing,
  cardinalMarks,
  guideAngleRad,
  hourTicks,
  horizonLine,
  lockRing,
  projectStars,
  projectTrackArc,
  ringSegments,
  ringTicks,
  starField,
  visibilityWindows,
} from '../../lib/field/index';
import type { ArPiece, Direction, OrbitRing, VisibilityWindow } from '../../lib/field/index';
import { observeAt, predictPasses } from '../../lib/orbit/index';
import type { Observer, Satrec, TleRecord } from '../../lib/orbit/index';
import { cameraBasisFromDrag, evaluateLock } from '../../lib/pointing/index';
import type { PermissionState } from '../../lib/pointing/index';
import { formatUtc } from '../../lib/session/index';
import type { ObserverPosition } from '../../lib/session/index';
import { readFov, writeFov } from '../field/fov-store';
import { createTleSource } from '../field/tle-source';
import { createBrowserDeps } from '../pointing/browser-deps';
import { DEFAULT_OBSERVER, createPointingSession } from '../pointing/pointing-session';
import type { PointingSession } from '../pointing/pointing-session';
import { createPickerBrowserDeps } from '../session/browser-deps';
import { createObserverStore } from '../session/observer-store';
import { browserGeolocation, browserMediaDevices } from '../shell/browser-deps';
import { createCameraController } from '../shell/camera';
import { createLocator } from '../shell/geolocation';
import { ArScene } from './ar-scene';
import type { ArSceneModel } from './ar-scene';
import { ArSettings } from './ar-settings';
import { Ruler } from './ruler';
import { SatelliteWheel } from './satellite-wheel';
import { StoryCard } from './story-card';
import { VisibilityBar } from './visibility-bar';

const ENTRIES = listPlayableEntries();
const FRAME_INTERVAL_MS = 1000 / AR_MAX_FPS;
const NO_PIECES: readonly ArPiece[] = [];
/** Used only to draw the horizon and the cardinal marks when the phone has no orientation yet. */
const FALLBACK_BASIS = cameraBasisFromDrag({ headingDeg: 0, pitchDeg: 0 });

const PERMISSION_TEXT: Record<PermissionState, string> = {
  unknown: 'Motion sensors: not allowed yet',
  requesting: 'Motion sensors: waiting for the prompt',
  granted: 'Motion sensors: on',
  denied: 'Motion sensors: blocked by the browser',
  unavailable: 'Motion sensors: not on this device',
};

interface Loaded {
  readonly tle: TleRecord;
  readonly satrec: Satrec;
}
interface Live {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  readonly slantRangeKm: number;
  readonly rangeRateKmPerS: number;
}
interface Sim {
  shownId: number | null;
  ring: OrbitRing | null;
  ringAnchor: number;
  live: Live | null;
  morph: { from: OrbitRing | null; fromLive: Direction | null; startMs: number } | null;
  displayRing: OrbitRing | null;
  displayLive: Direction | null;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function clampPct(frac: number): number {
  return Math.min(1, Math.max(0, frac));
}

export function ArTab() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const depsRef = useRef<ReturnType<typeof createPickerBrowserDeps> | null>(null);
  const loadedRef = useRef(new Map<number, Loaded>());
  const observerRef = useRef<ObserverPosition>(DEFAULT_OBSERVER);
  const activeRef = useRef(false);
  const startCameraRef = useRef<() => void>(() => undefined);
  const simRef = useRef<Sim>({
    shownId: null,
    ring: null,
    ringAnchor: 0,
    live: null,
    morph: null,
    displayRing: null,
    displayLive: null,
  });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fovDeg, setFovDeg] = useState(FOV_DEFAULT_DEG);
  const [selectedId, setSelectedId] = useState<number>(ENTRIES[0].noradId);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cameraState, setCameraState] = useState<'idle' | 'on' | 'off'>('idle');
  const [pointing, setPointing] = useState<PointingSession | null>(null);
  const [, setFrame] = useState(0);
  const [cameraLevel, setCameraLevel] = useState(100);
  const [observerStamp, setObserverStamp] = useState(0);
  const [bar, setBar] = useState<{ nowMs: number; windows: readonly VisibilityWindow[] }>({ nowMs: 0, windows: [] });
  const [storyOpen, setStoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);
  const stars = useMemo(() => starField(STAR_COUNT, STAR_SEED), []);

  // Mount: shared deps, observer, pointing session and camera. The camera starts at once; the motion
  // sensors need one tap on iOS, so the Permission_Gate asks for them. Cleanup releases every resource.
  useEffect(() => {
    const picker = createPickerBrowserDeps();
    depsRef.current = picker;
    setFovDeg(readFov(picker.storage));
    const store = createObserverStore(picker.storage);
    observerRef.current = store.get();
    const session = createPointingSession(createBrowserDeps());
    session.setObserver(observerRef.current);
    setPointing(session);
    let active = true;
    activeRef.current = true;
    const locator = createLocator({ geolocation: browserGeolocation(), storage: picker.storage });
    void locator.autoLocate((position) => {
      if (!active) return false;
      const applied = store.set(position);
      if (applied) {
        observerRef.current = position;
        simRef.current.ringAnchor = 0;
        session.setObserver(position);
        setObserverStamp((n) => n + 1);
      }
      return applied;
    });
    const camera = createCameraController({ mediaDevices: browserMediaDevices() });
    startCameraRef.current = () => {
      if (!activeRef.current) return;
      void camera.start().then((outcome) => {
        if (!activeRef.current) return;
        setCameraState(outcome === 'on' ? 'on' : 'off');
        const video = videoRef.current;
        if (outcome === 'on' && video !== null) {
          video.srcObject = camera.getStream() as MediaStream | null;
          void video.play().catch(() => undefined);
        }
      });
    };
    startCameraRef.current();
    return () => {
      active = false;
      activeRef.current = false;
      camera.stop();
      session.dispose();
      setPointing(null);
      depsRef.current = null;
    };
  }, []);

  // TLE of the selected satellite through the shared fetcher (its cache applies).
  useEffect(() => {
    const picker = depsRef.current;
    if (picker === null) return;
    if (loadedRef.current.has(selectedId)) {
      setStatus('ready');
      return;
    }
    let active = true;
    setStatus('loading');
    createTleSource(picker.tleFetcher, selectedId)
      .load()
      .then((result) => {
        if (!active) return;
        loadedRef.current.set(selectedId, result);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  // The 24-hour windows of the selected satellite, recomputed on a change and every minute.
  useEffect(() => {
    const data = loadedRef.current.get(selectedId);
    if (status !== 'ready' || data === undefined) {
      setBar({ nowMs: Date.now(), windows: [] });
      return;
    }
    const compute = () => {
      const now = Date.now();
      try {
        const passes = predictPasses({
          observer: { ...observerRef.current, altitudeKm: 0 },
          tle: data.tle,
          start: now,
          durationHours: 24,
          minElevationDeg: 0,
        });
        setBar({ nowMs: now, windows: visibilityWindows(passes, now) });
      } catch {
        setBar({ nowMs: now, windows: [] });
      }
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [status, selectedId, observerStamp]);

  useEffect(() => {
    const el = rootRef.current;
    if (el === null) return;
    const apply = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    apply();
    const resizeObserver = new ResizeObserver(apply);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Frame loop: the live target every frame, the ring every RING_REFRESH_MS, the morph on a satellite change.
  useEffect(() => {
    let handle = 0;
    let last = 0;
    const step = (now: number) => {
      const sim = simRef.current;
      const data = loadedRef.current.get(selectedRef.current);
      if (data === undefined) {
        sim.live = null;
        return;
      }
      const observer: Observer = { ...observerRef.current, altitudeKm: 0 };
      const o = observeAt(data.satrec, now, observer);
      sim.live = o.ok
        ? {
            azimuthDeg: o.lookAngles.azimuthDeg,
            elevationDeg: o.lookAngles.elevationDeg,
            slantRangeKm: o.lookAngles.slantRangeKm,
            rangeRateKmPerS: o.rangeRateKmPerS,
          }
        : null;
      const changed = sim.shownId !== selectedRef.current;
      if (changed || sim.ring === null || now - sim.ringAnchor >= RING_REFRESH_MS) {
        const ring = buildOrbitRing(data.satrec, data.tle.MEAN_MOTION, now, observer);
        if (changed && sim.displayRing !== null && ring !== null && !reducedMotion()) {
          sim.morph = { from: sim.displayRing, fromLive: sim.displayLive, startMs: now };
        }
        sim.ring = ring;
        sim.ringAnchor = now;
        sim.shownId = selectedRef.current;
      }
      let ring = sim.ring;
      let live: Direction | null = sim.live;
      if (sim.morph !== null) {
        const raw = (now - sim.morph.startMs) / RING_MORPH_MS;
        if (raw >= 1) {
          sim.morph = null;
        } else {
          const w = raw * raw * (3 - 2 * raw);
          if (ring !== null && sim.morph.from !== null) ring = blendRings(sim.morph.from, ring, w);
          if (live !== null && sim.morph.fromLive !== null) live = blendDirection(sim.morph.fromLive, live, w);
        }
      }
      sim.displayRing = ring;
      sim.displayLive = live;
    };
    const loop = (frameTime: number) => {
      handle = window.requestAnimationFrame(loop);
      if (document.hidden || frameTime - last < FRAME_INTERVAL_MS) return;
      last = frameTime;
      step(Date.now());
      setFrame((n) => n + 1);
    };
    handle = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(handle);
  }, []);

  const snap = pointing === null ? null : pointing.getSnapshot();
  const oriented = snap !== null && snap.basis !== null;
  const basis = snap?.basis ?? FALLBACK_BASIS;
  const offsetDeg = snap?.calibrationOffsetDeg ?? 0;
  const permission: PermissionState = snap?.permission ?? 'unknown';
  const sim = simRef.current;
  const { width, height } = size;
  const aspect = height > 0 ? width / height : 1;
  const live = sim.live;
  const shown = sim.displayLive;
  const selectedIndex = Math.max(0, ENTRIES.findIndex((e) => e.noradId === selectedId));
  const selected: PlayableEntry = ENTRIES[selectedIndex];

  let model: ArSceneModel | null = null;
  let lockedNow = false;
  let markerPx: { x: number; y: number } | null = null;
  if (width > 0 && height > 0) {
    let marker: ArSceneModel['marker'] = null;
    let halo: readonly ArPiece[] = NO_PIECES;
    let guide: ArSceneModel['guide'] = null;
    if (shown !== null && oriented) {
      const m = arMarker(shown.azimuthDeg, shown.elevationDeg, offsetDeg, basis, aspect, fovDeg);
      if (m.inFront) {
        marker = { ndcX: m.ndcX, ndcY: m.ndcY, below: shown.elevationDeg < 0 };
        markerPx = { x: ((m.ndcX + 1) / 2) * width, y: ((1 - m.ndcY) / 2) * height };
      }
      const lock = evaluateLock(basis.forward, { azimuthDeg: shown.azimuthDeg, elevationDeg: shown.elevationDeg }, offsetDeg);
      lockedNow = lock.locked;
      if (lock.locked) {
        halo = lockRing(shown.azimuthDeg, shown.elevationDeg, offsetDeg, basis, aspect, fovDeg);
      } else {
        guide = { angleRad: guideAngleRad(shown.azimuthDeg, shown.elevationDeg, offsetDeg, basis), behind: lock.behind };
      }
    }
    const ringModel = sim.displayRing;
    const ticks: ArSceneModel['ticks'] =
      ringModel === null
        ? []
        : ringTicks(ringModel).flatMap((t) => {
            const m = arMarker(t.azimuthDeg, t.elevationDeg, offsetDeg, basis, aspect, fovDeg);
            return m.inFront && Math.abs(m.ndcX) <= 1.2 && Math.abs(m.ndcY) <= 1.2
              ? [{ label: t.label, ndcX: m.ndcX, ndcY: m.ndcY }]
              : [];
          });
    const nightness = cameraState === 'on' ? 1 - cameraLevel / 100 : 1;
    model = {
      width,
      height,
      ring: ringModel === null ? NO_PIECES : projectTrackArc(ringSegments(ringModel), offsetDeg, basis, aspect, fovDeg),
      ticks,
      horizon: horizonLine(offsetDeg, basis, aspect, fovDeg),
      cardinals: cardinalMarks(offsetDeg, basis, aspect, fovDeg),
      stars: nightness > 0.01 ? projectStars(stars, offsetDeg, basis, aspect, fovDeg) : [],
      nightness,
      marker,
      halo,
      guide,
    };
  }

  // The 24-hour bar: NOW moves with the clock; SAT sits on NOW while the satellite is in view, otherwise at its next AOS.
  const nowMsLive = Date.now();
  const barOrigin = bar.nowMs;
  const nowFrac = barOrigin === 0 ? 0 : clampPct((nowMsLive - barOrigin) / VISIBILITY_SPAN_MS);
  const hhmm = (ms: number) => formatUtc(ms).slice(11, 16) + 'Z';
  const inView = live !== null && live.elevationDeg >= 0;
  const losWindow = bar.windows.find((w) => w.riseMs <= nowMsLive && w.setMs > nowMsLive);
  const nextAos = bar.windows.find((w) => w.riseMs > nowMsLive);
  let sat: { frac: number; inView: boolean } | null = null;
  let satLabel = 'No pass in 24 h';
  if (inView) {
    sat = { frac: nowFrac, inView: true };
    satLabel = losWindow === undefined ? 'In view now' : 'In view, LOS ' + hhmm(losWindow.setMs);
  } else if (nextAos !== undefined) {
    sat = { frac: nextAos.startFrac, inView: false };
    satLabel = 'AOS ' + hhmm(nextAos.riseMs) + ', max ' + Math.round(nextAos.maxElevationDeg) + '°';
  }

  const statusText =
    status === 'loading'
      ? 'Loading orbit data…'
      : status === 'error'
        ? 'Orbit data unavailable'
        : !oriented && permission === 'granted'
          ? 'Waiting for sensor data…'
          : !oriented
          ? 'Tap Allow to turn the view with the phone'
          : live !== null && live.elevationDeg < 0
            ? 'Below horizon'
            : lockedNow
              ? 'Locked on the satellite'
              : 'Follow the arrow';

  const cameraBlocked = cameraState === 'off';
  const showGate = !gateDismissed && (permission === 'unknown' || permission === 'denied' || cameraBlocked);

  const changeFov = (value: number) => {
    const next = Math.min(FOV_MAX_DEG, Math.max(FOV_MIN_DEG, value));
    setFovDeg(next);
    if (depsRef.current !== null) writeFov(depsRef.current.storage, next);
  };

  const enableSensors = () => {
    // Called inside the tap: iOS only shows the motion prompt for a user gesture.
    pointing?.requestPermission();
    if (cameraState === 'off') startCameraRef.current();
  };

  const onWheelSelect = (index: number) => {
    if (index === selectedIndex) {
      setStoryOpen(true);
      return;
    }
    setStoryOpen(false);
    setSelectedId(ENTRIES[index].noradId);
  };

  const pointer = (e: PointerEvent<HTMLDivElement>) => ({ pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY });
  const dragLayer = snap?.dragActive === true;
  const gateTitle = cameraBlocked
    ? 'Camera is not available'
    : permission === 'denied'
      ? 'Motion sensors are blocked'
      : 'Allow camera and motion';
  const gateBody = cameraBlocked
    ? 'The camera shows the sky behind the satellites. You can still read the orbit without it.'
    : permission === 'denied'
      ? 'Allow motion for this site in the browser settings, then tap again.'
      : 'One tap asks for the camera and the motion sensors. The sky view then follows the phone.';

  return (
    <div
      ref={rootRef}
      className="ar-tab"
      style={{
        position: 'fixed',
        inset: 0,
        bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom))',
        zIndex: 10,
        background: '#05080d',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="ar-video"
        style={{ opacity: cameraLevel / 100 }}
      />
      {model !== null ? <ArScene model={model} /> : null}
      {dragLayer ? (
        <div
          style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointing?.pointerDown(pointer(e));
          }}
          onPointerMove={(e) => pointing?.pointerMove(pointer(e))}
          onPointerUp={(e) => {
            pointing?.pointerUp(pointer(e));
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => pointing?.pointerUp(pointer(e))}
        />
      ) : null}

      <header className="ar-head">
        <div className="ar-head-text">
          <strong>{selected.name}</strong>
          <span>{statusText}</span>
        </div>
        <button type="button" className="ar-gear" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </header>

      <SatelliteWheel
        items={ENTRIES.map((e) => ({ id: e.noradId, name: e.name, sub: e.orbitLabel ?? '' }))}
        selectedIndex={selectedIndex}
        onSelect={onWheelSelect}
      />

      <div className="ar-mid">
        <Ruler
          side="left"
          label="FOV"
          value={fovDeg}
          min={FOV_MIN_DEG}
          max={FOV_MAX_DEG}
          step={FOV_STEP_DEG}
          format={(v) => `${Math.round(v)}°`}
          onChange={changeFov}
        />
        <Ruler
          side="right"
          label="Sky"
          value={cameraLevel}
          min={0}
          max={100}
          step={1}
          format={(v) => (v >= 99 ? 'Cam' : v <= 1 ? 'Sky' : `${Math.round(v)}%`)}
          onChange={setCameraLevel}
        />
      </div>

      {markerPx !== null ? (
        <button
          type="button"
          className="ar-hit"
          style={{ left: markerPx.x - 22, top: markerPx.y - 22 }}
          aria-label={`Story of ${selected.name}`}
          onClick={() => setStoryOpen(true)}
        />
      ) : null}

      {storyOpen ? <StoryCard entry={selected} onClose={() => setStoryOpen(false)} /> : null}

      {showGate ? (
        <section className="ar-gate" role="dialog" aria-label="Permissions">
          <h2>{gateTitle}</h2>
          <p>{gateBody}</p>
          <div className="ar-gate-actions">
            <button type="button" className="primary" onClick={enableSensors}>
              {permission === 'unknown' ? 'Allow' : 'Try again'}
            </button>
            <button type="button" onClick={() => setGateDismissed(true)}>
              Continue without
            </button>
          </div>
        </section>
      ) : null}

      <div className="ar-bottom">
        <VisibilityBar
          nowFrac={nowFrac}
          nowLabel={'NOW ' + formatUtc(nowMsLive).slice(11, 19) + 'Z'}
          windows={bar.windows}
          ticks={barOrigin === 0 ? [] : hourTicks(barOrigin)}
          sat={sat}
          satLabel={satLabel}
        />
        <div className="ar-readouts">
          <div>
            <span>AZ</span>
            <b>{live === null ? '—' : live.azimuthDeg.toFixed(1) + '°'}</b>
          </div>
          <div>
            <span>EL</span>
            <b>{live === null ? '—' : live.elevationDeg.toFixed(1) + '°'}</b>
          </div>
          <div>
            <span>RNG</span>
            <b>{live === null ? '—' : Math.round(live.slantRangeKm) + ' km'}</b>
          </div>
          <div>
            <span>RATE</span>
            <b>{live === null ? '—' : live.rangeRateKmPerS.toFixed(2)}</b>
          </div>
        </div>
      </div>

      <ArSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onCalibrate={(delta) => pointing?.stepCalibration(delta)}
        sensorText={PERMISSION_TEXT[permission]}
        cameraText={cameraState === 'on' ? 'Camera: on' : cameraState === 'off' ? 'Camera: not available' : 'Camera: starting'}
        observerText={`${observerRef.current.latitudeDeg.toFixed(4)}°, ${observerRef.current.longitudeDeg.toFixed(4)}°`}
        onRetryCamera={() => startCameraRef.current()}
        onRetrySensors={enableSensors}
        canRetrySensors={permission === 'unknown' || permission === 'denied'}
      />
    </div>
  );
}
