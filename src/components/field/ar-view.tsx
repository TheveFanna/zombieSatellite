'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import {
  AR_MAX_FPS,
  FIELD_COPY,
  FOV_MAX_DEG,
  FOV_MIN_DEG,
  FOV_STEP_DEG,
  arMarker,
  cardinalMarks,
  edgeArrow,
  horizonLine,
  lockRing,
  projectTicks,
  projectTrackArc,
  tickLabel,
  trackSegments,
} from '../../lib/field/index';
import type { ArPiece } from '../../lib/field/index';
import { formatCountdown, formatDopplerReadout } from '../../lib/session/index';
import type { PointingSession, PointingSnapshot } from '../pointing/pointing-session';
import type { SessionController, SessionSnapshot } from '../session/session-controller';
import { browserMediaDevices } from '../shell/browser-deps';
import { createCameraController } from '../shell/camera';
import { createFieldBrowserDeps } from './browser-deps';
import { readFov, writeFov } from './fov-store';
import type { PassFieldSnapshot } from './pass-field-controller';
import { ArOverlay } from './visuals/ar-overlay';
import type { ArOverlayModel } from './visuals/ar-overlay';
import { IlluminationBadge } from './visuals/field-bits';
import { FOV_DEFAULT_DEG } from '../../lib/field/index';

export interface ArViewProps {
  readonly snapshot: SessionSnapshot;
  readonly field: PassFieldSnapshot;
  readonly pointing: PointingSession | null;
  readonly pointingSnapshot: PointingSnapshot;
  readonly controller: SessionController | null;
  /** false for the demo AR view: no camera, dark background, demo mark. */
  readonly camera: boolean;
  readonly onClose: () => void;
}

type CameraState = 'idle' | 'on' | 'off';

const FRAME_INTERVAL_MS = 1000 / AR_MAX_FPS;
const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
const NO_PIECES: readonly ArPiece[] = [];

export function ArView({ snapshot, field, pointing, pointingSnapshot, controller, camera, onClose }: ArViewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fovDeg, setFovDeg] = useState(FOV_DEFAULT_DEG);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [detailOpen, setDetailOpen] = useState(false);
  const [, setFrame] = useState(0);
  const cameraRef = useRef<ReturnType<typeof createCameraController> | null>(null);
  const storageRef = useRef<ReturnType<typeof createFieldBrowserDeps>['storage'] | null>(null);

  // Own camera instance: started on mount, stopped on cleanup. It only feeds the video element.
  useEffect(() => {
    storageRef.current = createFieldBrowserDeps().storage;
    setFovDeg(readFov(storageRef.current));
    if (!camera) return;
    const own = createCameraController({ mediaDevices: browserMediaDevices() });
    cameraRef.current = own;
    let active = true;
    void own.start().then((outcome) => {
      if (!active) return;
      setCameraState(outcome === 'on' ? 'on' : 'off');
      const video = videoRef.current;
      if (outcome === 'on' && video !== null) video.srcObject = own.getStream() as MediaStream | null;
    });
    return () => {
      active = false;
      own.stop();
      cameraRef.current = null;
    };
  }, [camera]);

  // The video element exists only once the camera is on, so attach the stream after that render.
  useEffect(() => {
    const video = videoRef.current;
    const own = cameraRef.current;
    if (cameraState === 'on' && video !== null && own !== null) video.srcObject = own.getStream() as MediaStream | null;
  }, [cameraState]);

  useEffect(() => {
    const el = rootRef.current;
    if (el === null) return;
    const apply = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 30 fps frame loop, paused while the document is hidden.
  useEffect(() => {
    let handle = 0;
    let last = 0;
    const loop = (now: number) => {
      handle = window.requestAnimationFrame(loop);
      if (document.hidden || now - last < FRAME_INTERVAL_MS) return;
      last = now;
      setFrame((n) => n + 1);
    };
    handle = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(handle);
  }, []);

  const isDemo = snapshot.clockMode === 'demo';
  const basis = isDemo ? snapshot.demoBasis : pointingSnapshot.basis;
  const offsetDeg = isDemo ? 0 : pointingSnapshot.calibrationOffsetDeg;
  const target = snapshot.orbitDataMissing ? null : snapshot.target;
  const lock = snapshot.lock;
  const { width, height } = size;
  const aspect = height > 0 ? width / height : 1;

  let model: ArOverlayModel | null = null;
  if (basis !== null && width > 0 && height > 0) {
    let marker: ArOverlayModel['marker'] = null;
    let ring: readonly ArPiece[] = NO_PIECES;
    let edge: ArOverlayModel['edge'] = null;
    if (target !== null) {
      const m = arMarker(target.azimuthDeg, target.elevationDeg, offsetDeg, basis, aspect, fovDeg);
      if (m.inFront) marker = { ndcX: m.ndcX, ndcY: m.ndcY };
      ring = lockRing(target.azimuthDeg, target.elevationDeg, offsetDeg, basis, aspect, fovDeg);
      edge = edgeArrow(target.azimuthDeg, target.elevationDeg, offsetDeg, basis, aspect, fovDeg);
    }
    let arc: readonly ArPiece[] = NO_PIECES;
    let ticks: ArOverlayModel['ticks'] = [];
    if (field.track !== null && field.profile !== null) {
      arc = projectTrackArc(trackSegments(field.track, field.profile), offsetDeg, basis, aspect, fovDeg);
      ticks = projectTicks(field.track, offsetDeg, basis, aspect, fovDeg).map((t) => ({
        label: tickLabel(t.tMs),
        ndcX: t.ndcX,
        ndcY: t.ndcY,
      }));
    }
    model = {
      width,
      height,
      marker,
      locked: lock?.locked ?? false,
      ring,
      arc,
      ticks,
      horizon: horizonLine(offsetDeg, basis, aspect, fovDeg),
      cardinals: cardinalMarks(offsetDeg, basis, aspect, fovDeg),
      edge,
    };
  }

  function pointer(e: PointerEvent<HTMLDivElement>) {
    return { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };
  }

  const dragLayer = isDemo ? snapshot.pointingSource === 'manual' : pointingSnapshot.dragActive;
  const needsSensors =
    !isDemo && (pointingSnapshot.permission === 'unknown' || pointingSnapshot.permission === 'denied');
  const dopplerText = snapshot.doppler === null ? '—' : formatDopplerReadout(snapshot.doppler);
  const lockText = lock === null ? '—' : lock.locked ? 'Locked' : 'Not locked';

  return (
    <div
      ref={rootRef}
      className="ar-view"
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#05080d', overflow: 'hidden' }}
    >
      {camera && cameraState === 'on' ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {dragLayer ? (
        <div
          style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
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
        />
      ) : null}

      {model !== null ? <ArOverlay model={model} /> : null}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button type="button" onPointerDown={stop} onClick={onClose}>
          {FIELD_COPY.arClose}
        </button>
        {needsSensors ? (
          <button type="button" onPointerDown={stop} onClick={() => pointing?.requestPermission()} disabled={pointing === null}>
            {FIELD_COPY.arEnableSensors}
          </button>
        ) : null}
      </div>

      <div style={{ position: 'absolute', top: '3rem', left: 0, right: 0, padding: '0 0.5rem', pointerEvents: 'none' }}>
        {!camera ? <p className="ar-demo-mark">{FIELD_COPY.arDemoMark}</p> : null}
        {camera && cameraState === 'off' ? <p>{FIELD_COPY.arNoCamera}</p> : null}
      </div>

      <div
        className="ar-strip"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0.5rem', background: 'rgba(5,8,13,0.8)' }}
        onPointerDown={stop}
      >
        <div role="button" tabIndex={0} onClick={() => setDetailOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailOpen((v) => !v); }}>
          <span>{lockText}</span> · <span>{dopplerText}</span>
          {snapshot.phase === 'awaiting-pass' && snapshot.countdownMs !== null ? (
            <span> · {formatCountdown(snapshot.countdownMs)}</span>
          ) : null}
        </div>
        {detailOpen ? (
          <div className="instrument">
            <dl>
              <dt>Azimuth</dt>
              <dd>{target === null ? '—' : `${target.azimuthDeg.toFixed(1)}°`}</dd>
              <dt>Elevation</dt>
              <dd>{target === null ? '—' : `${target.elevationDeg.toFixed(1)}°`}</dd>
              <dt>Doppler shift</dt>
              <dd>{dopplerText}</dd>
            </dl>
            <IlluminationBadge profile={field.profile} sunlitOnly={snapshot.entry.beacon.sunlitOnly === true} />
            <label>
              {FIELD_COPY.arFovLabel}: {fovDeg}°{' '}
              <input
                type="range"
                min={FOV_MIN_DEG}
                max={FOV_MAX_DEG}
                step={FOV_STEP_DEG}
                value={fovDeg}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setFovDeg(next);
                  if (storageRef.current !== null) writeFov(storageRef.current, next);
                }}
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
