'use client';
// Passes page (S10, S11 round 2): the observer as a grouped list and one compact row per satellite.
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { DEFAULT_OBSERVER } from '../../components/pointing/pointing-session';
import { createPickerBrowserDeps } from '../../components/session/browser-deps';
import { SESSION_COPY } from '../../components/session/copy';
import { createPickerController } from '../../components/session/picker-controller';
import { browserGeolocation } from '../../components/shell/browser-deps';
import { SHELL_COPY } from '../../components/shell/copy';
import { createLocator } from '../../components/shell/geolocation';
import type { LocateOutcome } from '../../components/shell/geolocation';
import type { PickerController, PickerRow, PickerSnapshot } from '../../components/session/picker-controller';
import { listPlayableEntries } from '../../lib/catalog/index';
import { FIELD_COPY } from '../../lib/field/index';
import { formatDurationMin, formatUtc, parseCoordinateInput } from '../../lib/session/index';

// Neutral view used on the server and until the controller exists in the browser.
const INITIAL_SNAPSHOT: PickerSnapshot = Object.freeze({
  observer: DEFAULT_OBSERVER,
  rows: Object.freeze(
    listPlayableEntries().map(
      (entry): PickerRow => Object.freeze({ entry, status: 'loading', pass: null, inProgress: false }),
    ),
  ),
});

const getServerSnapshot = (): PickerSnapshot => INITIAL_SNAPSHOT;
const noopSubscribe = (): (() => void) => () => {};

type FieldName = 'lat' | 'lon';
type Locator = ReturnType<typeof createLocator>;
type LocateStatus = 'idle' | 'locating' | 'failed';

/** "MM-DD HH:MMZ" from a UTC instant. */
function shortUtc(ms: number): string {
  return `${formatUtc(ms).slice(5, 16)}Z`;
}

function PassFacts({ row, onRetry }: { row: PickerRow; onRetry: () => void }) {
  if (row.status === 'ready' && row.pass !== null) {
    const { pass } = row;
    return (
      <div className="pass-facts">
        <div>
          <span>Rise</span>
          <b>{shortUtc(pass.riseMs)}</b>
        </div>
        <div>
          <span>Max</span>
          <b>{pass.maxElevationDeg.toFixed(0)}°</b>
        </div>
        <div>
          <span>Length</span>
          <b>{formatDurationMin(pass.durationMin)}</b>
        </div>
      </div>
    );
  }
  if (row.status === 'tle-unavailable') {
    return (
      <p className="pass-note">
        Orbit data unavailable.{' '}
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </p>
    );
  }
  if (row.status === 'no-pass-found') return <p className="pass-note">No pass in the next 7 days.</p>;
  return <p className="pass-note">Loading orbit data…</p>;
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

  function field(name: FieldName, label: string, current: number) {
    const id = `observer-${name}`;
    return (
      <div className="ios-row">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          className="ios-input"
          type="number"
          step="any"
          inputMode="decimal"
          value={raw[name] ?? String(current)}
          aria-invalid={invalid[name]}
          onChange={(e) => onField(name, e.target.value)}
        />
      </div>
    );
  }

  return (
    <main data-tab="session" className="pass-page">
      <title>Passes · zombieSatellite</title>
      <header>
        <h1>Passes</h1>
        <p className="pass-note">{SESSION_COPY.utcNote}</p>
      </header>

      <p className="ios-caption">Observer</p>
      <div className="ios-group">
        {field('lat', 'Latitude °', snapshot.observer.latitudeDeg)}
        {field('lon', 'Longitude °', snapshot.observer.longitudeDeg)}
        <button
          type="button"
          className="ios-row ios-action"
          onClick={locateNow}
          disabled={locator === null || locateStatus === 'locating'}
        >
          {locateStatus === 'locating' ? SHELL_COPY.locating : SHELL_COPY.useMyLocation}
        </button>
      </div>
      {invalid.lat || invalid.lon ? <p className="pass-error">Enter a latitude from −90 to 90 and a longitude from −180 to 180.</p> : null}
      {locateStatus === 'failed' ? <p className="pass-note">{SHELL_COPY.locationFailed}</p> : null}

      <ul className="pass-list">
        {snapshot.rows.map((row) => (
          <li key={row.entry.noradId} className="pass-row">
            <div className="pass-head">
              <div>
                <h3>{row.entry.name}</h3>
                <p className="pass-meta">
                  {row.entry.difficulty} · {SESSION_COPY.statusLabels[row.entry.status]}
                  {row.entry.beacon.sunlitOnly ? ' · Sunlit only' : ''}
                </p>
              </div>
              {row.inProgress ? <span className="pass-live">In view now</span> : null}
            </div>
            <PassFacts row={row} onRetry={() => controller?.retry()} />
            <div className="pass-actions">
              <Link className="button primary" href={`/session/${row.entry.noradId}`}>
                {SHELL_COPY.openSession}
              </Link>
              <Link className="button" href={`/planner/${row.entry.noradId}`}>
                {FIELD_COPY.plannerLink}
              </Link>
              <Link className="button" href={`/catalog#${row.entry.slug}`}>
                {SHELL_COPY.storyLink}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
