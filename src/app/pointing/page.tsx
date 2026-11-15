'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { PointerEvent } from 'react';
import { CALIBRATION_STEP_DEG } from '../../lib/pointing/index';
import { createBrowserDeps } from '../../components/pointing/browser-deps';
import {
  createPointingSession,
  DEFAULT_OBSERVER,
  DEFAULT_TARGET,
} from '../../components/pointing/pointing-session';
import type { PointingSession, PointingSnapshot } from '../../components/pointing/pointing-session';

// Neutral view used on the server and until the session exists in the browser.
const INITIAL_SNAPSHOT: PointingSnapshot = Object.freeze({
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

const getServerSnapshot = (): PointingSnapshot => INITIAL_SNAPSHOT;
const noopSubscribe = (): (() => void) => () => {};

type FieldName = 'lat' | 'lon' | 'az' | 'el';

function parseInRange(raw: string, min: number, max: number): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(1);
}

const sectionStyle = { marginTop: '1.25rem' } as const;

export default function PointingPage() {
  const [session, setSession] = useState<PointingSession | null>(null);
  const [raw, setRaw] = useState<Record<FieldName, string>>({
    lat: String(DEFAULT_OBSERVER.latitudeDeg),
    lon: String(DEFAULT_OBSERVER.longitudeDeg),
    az: String(DEFAULT_TARGET.azimuthDeg),
    el: String(DEFAULT_TARGET.elevationDeg),
  });
  const [invalid, setInvalid] = useState<Record<FieldName, boolean>>({
    lat: false,
    lon: false,
    az: false,
    el: false,
  });

  useEffect(() => {
    const created = createPointingSession(createBrowserDeps());
    setSession(created);
    return () => {
      created.dispose();
      setSession(null);
    };
  }, []);

  const snapshot = useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getSnapshot : getServerSnapshot,
    getServerSnapshot,
  );

  function onField(name: FieldName, text: string) {
    setRaw((prev) => ({ ...prev, [name]: text }));
    let value: number | null;
    if (name === 'lat') value = parseInRange(text, -90, 90);
    else if (name === 'lon') value = parseInRange(text, -180, 180);
    else if (name === 'el') value = parseInRange(text, -90, 90);
    else value = parseInRange(text, -Infinity, Infinity);
    setInvalid((prev) => ({ ...prev, [name]: value === null }));
    if (value === null || session === null) return;
    if (name === 'lat') session.setObserver({ latitudeDeg: value, longitudeDeg: snapshot.observer.longitudeDeg });
    else if (name === 'lon') session.setObserver({ latitudeDeg: snapshot.observer.latitudeDeg, longitudeDeg: value });
    else if (name === 'az') session.setTarget({ azimuthDeg: value, elevationDeg: snapshot.target.elevationDeg });
    else session.setTarget({ azimuthDeg: snapshot.target.azimuthDeg, elevationDeg: value });
  }

  function pointer(e: PointerEvent<HTMLDivElement>) {
    return { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };
  }

  function field(name: FieldName, label: string, hint: string) {
    return (
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        {label}{' '}
        <input
          type="number"
          step="any"
          value={raw[name]}
          aria-invalid={invalid[name]}
          onChange={(e) => onField(name, e.target.value)}
        />
        {invalid[name] ? <span role="alert"> Invalid value, expected {hint}. Previous value kept.</span> : null}
      </label>
    );
  }

  const { permission, lock } = snapshot;

  return (
    <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>Pointing demo · zombieSatellite</title>
      <h1>Pointing demo</h1>

      <section style={sectionStyle}>
        <h2>Motion sensors</h2>
        {permission === 'unknown' ? (
          <button type="button" onClick={() => session?.requestPermission()} disabled={session === null}>
            Enable motion sensors
          </button>
        ) : null}
        {permission === 'requesting' ? <p>Waiting for the browser permission prompt…</p> : null}
        {permission === 'denied' ? (
          <div>
            <p role="alert">Motion sensor access was denied.</p>
            <button type="button" onClick={() => session?.requestPermission()}>
              Try again
            </button>
          </div>
        ) : null}
        {permission === 'unavailable' ? (
          <p>No orientation data arrived. The drag compass is active.</p>
        ) : null}
        {permission === 'granted' ? <p>Motion sensors enabled. Heading source: {snapshot.source ?? '—'}</p> : null}
      </section>

      <section style={sectionStyle}>
        <h2>Drag compass</h2>
        <label>
          <input
            type="checkbox"
            checked={snapshot.dragActive}
            onChange={() => session?.setDragEnabled(!snapshot.dragActive)}
          />{' '}
          Drag compass
        </label>
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
            session?.pointerDown(pointer(e));
          }}
          onPointerMove={(e) => session?.pointerMove(pointer(e))}
          onPointerUp={(e) => {
            session?.pointerUp(pointer(e));
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => session?.pointerUp(pointer(e))}
        >
          Drag here to turn the compass
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Calibration</h2>
        <button type="button" onClick={() => session?.stepCalibration(-CALIBRATION_STEP_DEG)}>
          −{CALIBRATION_STEP_DEG}°
        </button>{' '}
        <button type="button" onClick={() => session?.stepCalibration(CALIBRATION_STEP_DEG)}>
          +{CALIBRATION_STEP_DEG}°
        </button>{' '}
        Offset: {fmt(snapshot.calibrationOffsetDeg)}°
      </section>

      <section style={sectionStyle}>
        <h2>Observer and target</h2>
        {field('lat', 'Observer latitude (°)', 'a number from −90 to 90')}
        {field('lon', 'Observer longitude (°)', 'a number from −180 to 180')}
        {field('az', 'Target azimuth (°)', 'a finite number')}
        {field('el', 'Target elevation (°)', 'a number from −90 to 90')}
      </section>

      <section style={sectionStyle}>
        <h2>Readout</h2>
        <dl>
          <dt>Heading source</dt>
          <dd>{snapshot.source ?? (snapshot.mode === 'drag' ? 'drag compass' : '—')}</dd>
          <dt>Heading</dt>
          <dd>{fmt(lock?.deviceHeadingDeg)}</dd>
          <dt>Pitch</dt>
          <dd>{fmt(lock?.devicePitchDeg)}</dd>
          <dt>Declination applied</dt>
          <dd>{fmt(snapshot.declinationAppliedDeg)}</dd>
          <dt>Effective azimuth</dt>
          <dd>{fmt(lock?.effectiveAzimuthDeg)}</dd>
          <dt>Pointing error</dt>
          <dd>{fmt(lock?.pointingErrorDeg)}</dd>
          <dt>Azimuth difference</dt>
          <dd>{fmt(lock?.azimuthDifferenceDeg)}</dd>
          <dt>Elevation difference</dt>
          <dd>{fmt(lock?.elevationDifferenceDeg)}</dd>
          <dt>Locked</dt>
          <dd>{lock === null ? '—' : String(lock.locked)}</dd>
          <dt>Behind</dt>
          <dd>{lock === null ? '—' : String(lock.behind)}</dd>
        </dl>
      </section>
    </main>
  );
}
