'use client';
// AR tab (S9): standalone AR with its own pointing session, camera, TLE source and observer.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { listPlayableEntries } from '../../lib/catalog/index';
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
  arMarker,
  blendDirection,
  blendRings,
  buildOrbitRing,
  cardinalMarks,
  guideAngleRad,
  horizonLine,
  hourTicks,
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
import { CALIBRATION_STEP_DEG, evaluateLock } from '../../lib/pointing/index';
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
import { VisibilityBar } from './visibility-bar';
import type { ArSceneModel } from './ar-scene';

const ENTRIES = listPlayableEntries();
const FRAME_INTERVAL_MS = 1000 / AR_MAX_FPS;
const NO_PIECES: readonly ArPiece[] = [];

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

export function ArTab() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const depsRef = useRef<ReturnType<typeof createPickerBrowserDeps> | null>(null);
  const loadedRef = useRef(new Map<number, Loaded>());
  const observerRef = useRef<ObserverPosition>(DEFAULT_OBSERVER);
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
  const stars = useMemo(() => starField(STAR_COUNT, STAR_SEED), []);

  // Mount: shared deps, observer, pointing session, camera. Cleanup releases every resource.
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
    void camera.start().then((outcome) => {
      if (!active) return;
      setCameraState(outcome === 'on' ? 'on' : 'off');
      const video = videoRef.current;
      if (outcome === 'on' && video !== null) video.srcObject = camera.getStream() as MediaStream | null;
    });
    return () => {
      active = false;
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
    const loop = (frameTime: number) => {
      handle = window.requestAnimationFrame(loop);
      if (document.hidden || frameTime - last < FRAME_INTERVAL_MS) return;
      last = frameTime;
      step(Date.now());
      setFrame((n) => n + 1);
    };
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
    handle = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(handle);
  }, []);

  const snap = pointing === null ? null : pointing.getSnapshot();
  const basis = snap?.basis ?? null;
  const offsetDeg = snap?.calibrationOffsetDeg ?? 0;
  const sim = simRef.current;
  const { width, height } = size;
  const aspect = height > 0 ? width / height : 1;
  const live = sim.live;
  const shown = sim.displayLive;

  let model: ArSceneModel | null = null;
  let lockedNow = false;
  if (basis !== null && width > 0 && height > 0) {
    let marker: ArSceneModel['marker'] = null;
    let halo: readonly ArPiece[] = NO_PIECES;
    let guide: ArSceneModel['guide'] = null;
    if (shown !== null) {
      const m = arMarker(shown.azimuthDeg, shown.elevationDeg, offsetDeg, basis, aspect, fovDeg);
      if (m.inFront) marker = { ndcX: m.ndcX, ndcY: m.ndcY, below: shown.elevationDeg < 0 };
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
    model = {
      width,
      height,
      ring: ringModel === null ? NO_PIECES : projectTrackArc(ringSegments(ringModel), offsetDeg, basis, aspect, fovDeg),
      ticks,
      horizon: horizonLine(offsetDeg, basis, aspect, fovDeg),
      cardinals: cardinalMarks(offsetDeg, basis, aspect, fovDeg),
      stars: [],
      nightness: 0,
      marker,
      halo,
      guide,
    };
  }

  const nightness = cameraState === 'on' ? 1 - cameraLevel / 100 : 1;
  if (model !== null && basis !== null && nightness > 0.01) {
    model = { ...model, nightness, stars: projectStars(stars, offsetDeg, basis, aspect, fovDeg) };
  }
  const nextWindow = bar.windows[0];
  const summary =
    nextWindow === undefined
      ? 'No pass in 24 h'
      : nextWindow.running
        ? 'In view now, max ' + Math.round(nextWindow.maxElevationDeg) + '°'
        : 'Next ' + formatUtc(nextWindow.riseMs).slice(11, 16) + 'Z, max ' + Math.round(nextWindow.maxElevationDeg) + '°';
  const dragLayer = snap?.dragActive === true;
  const needsSensors = snap !== null && (snap.permission === 'unknown' || snap.permission === 'denied');
  const pointer = (e: PointerEvent<HTMLDivElement>) => ({ pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY });
  const changeFov = (delta: number) => {
    const next = Math.min(FOV_MAX_DEG, Math.max(FOV_MIN_DEG, fovDeg + delta));
    setFovDeg(next);
    if (depsRef.current !== null) writeFov(depsRef.current.storage, next);
  };
  const selected = ENTRIES.find((e) => e.noradId === selectedId) ?? ENTRIES[0];

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
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: cameraState === 'on' ? 'block' : 'none',
          opacity: cameraLevel / 100,
        }}
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

      <div className="ar-tab-strip" role="tablist" aria-label="Satellite">
        {ENTRIES.map((entry) => (
          <button
            key={entry.noradId}
            type="button"
            role="tab"
            aria-selected={entry.noradId === selectedId}
            className="ar-tab-card"
            onClick={() => setSelectedId(entry.noradId)}
          >
            <strong>{entry.name}</strong>
            <span>{entry.orbitLabel}</span>
          </button>
        ))}
      </div>

      <div className="ar-hud ar-hud-left">
        <p>{selected.name}</p>
        {status === 'loading' ? <p>Loading orbit data…</p> : null}
        {status === 'error' ? <p>Orbit data unavailable</p> : null}
        <p>
          AZ {live === null ? '—' : live.azimuthDeg.toFixed(1)}° EL {live === null ? '—' : live.elevationDeg.toFixed(1)}°
        </p>
        <p>{live !== null && live.elevationDeg < 0 ? 'Below horizon' : ' '}</p>
      </div>
      <div className="ar-hud ar-hud-right">
        <p>RNG {live === null ? '—' : Math.round(live.slantRangeKm)} km</p>
        <p>RATE {live === null ? '—' : live.rangeRateKmPerS.toFixed(2)} km/s</p>
        <p>{lockedNow ? 'Locked' : 'Aim'}</p>
        <p>{pointing === null ? ' ' : `${formatUtc(Date.now()).slice(11, 19)}Z`}</p>
      </div>

      <label className="ar-sky">
        <span>Cam</span>
        <input
          type="range"
          min={0}
          max={100}
          value={cameraLevel}
          onChange={(e) => setCameraLevel(Number(e.target.value))}
          aria-label="Camera picture to night sky"
        />
        <span>Sky</span>
      </label>

      <div className="ar-tab-bottom">
      <VisibilityBar windows={bar.windows} ticks={bar.nowMs === 0 ? [] : hourTicks(bar.nowMs)} summary={summary} />
      <div className="ar-tab-controls">
        {needsSensors ? (
          <button type="button" onClick={() => pointing?.requestPermission()} disabled={pointing === null}>
            Enable motion sensors
          </button>
        ) : null}
        <button type="button" onClick={() => pointing?.stepCalibration(-CALIBRATION_STEP_DEG)} aria-label="Calibrate counter-clockwise">
          ↺ {CALIBRATION_STEP_DEG}°
        </button>
        <button type="button" onClick={() => pointing?.stepCalibration(CALIBRATION_STEP_DEG)} aria-label="Calibrate clockwise">
          ↻ {CALIBRATION_STEP_DEG}°
        </button>
        <button type="button" onClick={() => changeFov(-FOV_STEP_DEG)} aria-label="Narrower field of view">
          FOV −
        </button>
        <button type="button" onClick={() => changeFov(FOV_STEP_DEG)} aria-label="Wider field of view">
          FOV +
        </button>
        <span>{Math.round(fovDeg)}°</span>
        {cameraState === 'off' ? <span>No camera</span> : null}
      </div>
      </div>
    </div>
  );
}
