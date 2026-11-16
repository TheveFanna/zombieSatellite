'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { listPlayableEntries } from '../../lib/catalog/index';
import { DEFAULT_OBSERVER } from '../../components/pointing/pointing-session';
import { createPickerBrowserDeps } from '../../components/session/browser-deps';
import { SESSION_COPY } from '../../components/session/copy';
import { createPickerController } from '../../components/session/picker-controller';
import { browserGeolocation } from '../../components/shell/browser-deps';
import { SHELL_COPY } from '../../components/shell/copy';
import { createLocator } from '../../components/shell/geolocation';
import type { LocateOutcome } from '../../components/shell/geolocation';
import type { PickerController, PickerRow, PickerSnapshot } from '../../components/session/picker-controller';
import { FIELD_COPY } from '../../lib/field/index';
import { formatDurationMin, formatUtc, parseCoordinateInput } from '../../lib/session/index';
import { formatLocalTimeNote } from '../../lib/shell/index';
import { PassProfile } from '../../components/shell/visuals/pass-profile';

// Neutral view used on the server and until the controller exists in the browser.
const INITIAL_SNAPSHOT: PickerSnapshot = Object.freeze({
  observer: DEFAULT_OBSERVER,
  rows: Object.freeze(
    listPlayableEntries().map(
      (entry): PickerRow =>
        Object.freeze({ entry, status: 'loading', pass: null, inProgress: false }),
    ),
  ),
});

const getServerSnapshot = (): PickerSnapshot => INITIAL_SNAPSHOT;
const noopSubscribe = (): (() => void) => () => {};

type FieldName = 'lat' | 'lon';
type Locator = ReturnType<typeof createLocator>;
type LocateStatus = 'idle' | 'locating' | 'failed';

const sectionStyle = { marginTop: '1.25rem' } as const;

function PassInfo({ row, onRetry }: { row: PickerRow; onRetry: () => void }) {
  if (row.status === 'ready' && row.pass !== null) {
    const { pass } = row;
    return (
      <div className="pass-info">
      <PassProfile pass={pass} />
      <p>
        Next pass: {formatUtc(pass.riseMs)} to {formatUtc(pass.setMs)}, max elevation{' '}
        {pass.maxElevationDeg.toFixed(1)}°, {formatDurationMin(pass.durationMin)}
        {row.inProgress ? ' (in progress)' : ''}
        <br />
        {SHELL_COPY.localTimeLabel} {formatLocalTimeNote(pass.riseMs, -new Date(pass.riseMs).getTimezoneOffset())}
      </p>
      </div>
    );
  }
  if (row.status === 'tle-unavailable') {
    return (
      <p>
        Orbit data unavailable.{' '}
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </p>
    );
  }
  if (row.status === 'no-pass-found') return <p>No pass found in the next 7 days.</p>;
  return <p>Loading orbit data…</p>;
}

export default function SessionPickerPage() {
  const [controller, setController] = useState<PickerController | null>(null);
  // null means "show the value from the snapshot"; text is what the user typed.
  const [raw, setRaw] = useState<Record<FieldName, string | null>>({ lat: null, lon: null });
  const [invalid, setInvalid] = useState<Record<FieldName, boolean>>({ lat: false, lon: false });
  const [locator, setLocator] = useState<Locator | null>(null);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle');

  useEffect(() => {
    const deps = createPickerBrowserDeps();
    const created = createPickerController(deps);
    const createdLocator = createLocator({ geolocation: browserGeolocation(), storage: deps.storage });
    let active = true;
    setController(created);
    setLocator(createdLocator);
    void createdLocator.autoLocate((position) => {
      if (!active) return false;
      const applied = created.setObserver(position);
      if (applied) resetFields();
      return applied;
    });
    return () => {
      active = false;
      created.dispose();
      setController(null);
      setLocator(null);
    };
  }, []);

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

  return (
    <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>Satellite picker · zombieSatellite</title>
      <h1>Pick a satellite</h1>
      <p>{SESSION_COPY.utcNote}</p>

      <section style={sectionStyle}>
        <h2>Observer</h2>
        {field('lat', 'Observer latitude (°)', 'a number from −90 to 90', snapshot.observer.latitudeDeg)}
        {field('lon', 'Observer longitude (°)', 'a number from −180 to 180', snapshot.observer.longitudeDeg)}
        <p>
          <button type="button" onClick={locateNow} disabled={locator === null || locateStatus === 'locating'}>
            {locateStatus === 'locating' ? SHELL_COPY.locating : SHELL_COPY.useMyLocation}
          </button>
        </p>
        {locateStatus === 'failed' ? <p>{SHELL_COPY.locationFailed}</p> : null}
      </section>

      <section className="plain">
        <h2>Satellites</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {snapshot.rows.map((row) => (
            <li key={row.entry.noradId} className="card">
              <h3>{row.entry.name}</h3>
              <p>
                Difficulty: {row.entry.difficulty} · {SESSION_COPY.statusLabels[row.entry.status]}
                {row.entry.beacon.sunlitOnly ? ' · Sunlit only' : ''}
              </p>
              <PassInfo row={row} onRetry={() => controller?.retry()} />
              <Link className="button primary" href={`/session/${row.entry.noradId}`}>Open session</Link>{' '}
              <Link className="button" href={`/planner/${row.entry.noradId}`}>{FIELD_COPY.plannerLink}</Link>{' '}
              <Link className="button" href={`/guide/${row.entry.noradId}`}>{FIELD_COPY.guideLink}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
