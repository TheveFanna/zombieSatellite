'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { PlayableEntry } from '../../../lib/catalog/index';
import {
  DEFAULT_PLANNER_MIN_ELEVATION_DEG,
  FIELD_COPY,
  PLANNER_MIN_ELEVATIONS,
  buildCalendarEvent,
  buildSkyTrack,
  calendarFileName,
  filterPassesByElevation,
  minuteTable,
  tuningCsv,
  tuningFileName,
  tuningTable,
} from '../../../lib/field/index';
import type { IlluminationProfile, TuningPoint } from '../../../lib/field/index';
import { observeAt } from '../../../lib/orbit/index';
import type { Pass } from '../../../lib/orbit/index';
import { formatUtc, resolvePlayableEntry } from '../../../lib/session/index';
import { formatLocalTimeNote } from '../../../lib/shell/index';
import { createFieldBrowserDeps } from '../../../components/field/browser-deps';
import type { FieldBrowserDeps } from '../../../components/field/browser-deps';
import { createFieldDownloader } from '../../../components/field/field-downloader';
import { createPlannerController } from '../../../components/field/planner-controller';
import type { PlannerController, PlannerRow, PlannerSnapshot } from '../../../components/field/planner-controller';
import { createTleSource } from '../../../components/field/tle-source';
import { GroundTrackMap } from '../../../components/field/ground-track-map';
import { IlluminationBadge, InstrumentDetail } from '../../../components/field/visuals/field-bits';
import { SkyTrackView } from '../../../components/field/visuals/sky-track';
import { DEFAULT_OBSERVER } from '../../../components/pointing/pointing-session';
import { createPickerBrowserDeps } from '../../../components/session/browser-deps';
import { SHELL_COPY } from '../../../components/shell/copy';

const noopSubscribe = (): (() => void) => () => {};

function initialSnapshot(entry: PlayableEntry): PlannerSnapshot {
  return Object.freeze({
    entry,
    observer: DEFAULT_OBSERVER,
    nowMs: 0,
    status: 'loading',
    rows: Object.freeze([] as PlannerRow[]),
    satrec: null,
  });
}

function signedKhz(value: number): string {
  return `${value < 0 ? '\u2212' : '+'}${Math.abs(value).toFixed(2)} kHz`;
}

function rowLabel(point: TuningPoint): string {
  if (point.kind === 'aos') return point.truncated ? FIELD_COPY.tuningNowLabel : FIELD_COPY.tuningAosLabel;
  if (point.kind === 'los') return point.truncated ? FIELD_COPY.tuningWindowEndLabel : FIELD_COPY.tuningLosLabel;
  return FIELD_COPY.tuningTcaLabel;
}

function shadowLines(profile: IlluminationProfile | null): string[] {
  if (profile === null || profile.kind !== 'partly') return [];
  return profile.transitions.map(
    (t) => `${t.kind === 'entry' ? FIELD_COPY.shadowEntryLabel : FIELD_COPY.shadowExitLabel}: ${formatUtc(t.atMs)}`,
  );
}

function azimuthText(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(0)}°`;
}

function PassDetail({
  entry,
  snapshot,
  row,
  nowMs,
  fieldDeps,
}: {
  entry: PlayableEntry;
  snapshot: PlannerSnapshot;
  row: PlannerRow;
  nowMs: number;
  fieldDeps: FieldBrowserDeps | null;
}) {
  const { pass, profile } = row;
  const satrec = snapshot.satrec;
  const observer = useMemo(
    () => ({ latitudeDeg: snapshot.observer.latitudeDeg, longitudeDeg: snapshot.observer.longitudeDeg, altitudeKm: 0 }),
    [snapshot.observer.latitudeDeg, snapshot.observer.longitudeDeg],
  );
  const downlinkMhz = entry.beacon.downlinkMhz;
  const [notice, setNotice] = useState<string | null>(null);

  const detail = useMemo(() => {
    if (satrec === null) return null;
    return {
      track: buildSkyTrack(satrec, observer, pass),
      tuning: tuningTable({ satrec, observer, downlinkMhz, pass }),
      minutes: minuteTable({ satrec, observer, downlinkMhz, pass }),
    };
  }, [satrec, observer, downlinkMhz, pass]);

  if (detail === null || satrec === null) return null;
  const { track, tuning, minutes } = detail;
  const csv = minutes.kind === 'rows' ? tuningCsv(minutes.rows, FIELD_COPY.tuningCsvHeader) : null;
  const hasTable = tuning.kind === 'table';

  async function copy() {
    const clipboard = fieldDeps?.clipboard ?? null;
    if (csv === null || clipboard === null) {
      setNotice(FIELD_COPY.copyFailed);
      return;
    }
    const ok = await clipboard.writeText(csv.replace(/,/g, '\t')).then(
      () => true,
      () => false,
    );
    setNotice(ok ? FIELD_COPY.copied : FIELD_COPY.copyFailed);
  }

  function downloadCsv() {
    if (fieldDeps === null || csv === null) return;
    createFieldDownloader(fieldDeps.download).downloadText(
      csv,
      'text/csv;charset=utf-8',
      tuningFileName(entry.slug, pass.riseMs),
    );
  }

  function addToCalendar() {
    if (fieldDeps === null || satrec === null) return;
    const a = observeAt(satrec, pass.riseMs, observer);
    const l = observeAt(satrec, pass.setMs, observer);
    if (!a.ok || !l.ok) return;
    const ics = buildCalendarEvent({
      entry: {
        slug: entry.slug,
        name: entry.name,
        noradId: entry.noradId,
        displayFrequency: entry.beacon.displayFrequency,
      },
      pass,
      aosAzimuthDeg: a.lookAngles.azimuthDeg,
      losAzimuthDeg: l.lookAngles.azimuthDeg,
      profile: profile ?? { kind: 'unavailable' },
      stampMs: fieldDeps.clock.nowMs(),
    });
    createFieldDownloader(fieldDeps.download).downloadText(
      ics,
      'text/calendar;charset=utf-8',
      calendarFileName(entry.slug, pass.riseMs),
    );
  }

  return (
    <section className="planner-detail">
      <p>
        <button type="button" onClick={addToCalendar}>
          {FIELD_COPY.addToCalendar}
        </button>
      </p>
      <IlluminationBadge profile={profile} sunlitOnly={entry.beacon.sunlitOnly === true} />
      <SkyTrackView
        track={track}
        profile={profile}
        pass={pass}
        target={null}
        truncatedStart={pass.startTruncated}
        truncatedEnd={pass.endTruncated}
      />
      {tuning.kind === 'no-frequency' ? <p>{FIELD_COPY.noFrequencyNote}</p> : null}
      {tuning.kind === 'table' ? (
        <table className="tuning">
          <thead>
            <tr>
              <th />
              <th>{FIELD_COPY.tuningFrequencyHeading}</th>
              <th>{FIELD_COPY.tuningShiftHeading}</th>
            </tr>
          </thead>
          <tbody>
            {tuning.points.map((p) => (
              <tr key={p.kind}>
                <th scope="row">{rowLabel(p)}</th>
                <td>{p.frequencyMhz.toFixed(4)}</td>
                <td>{signedKhz(p.shiftKhz)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {hasTable && entry.beacon.displayFrequency !== null ? (
        <p>{`${FIELD_COPY.tuningNominalPrefix} ${entry.beacon.displayFrequency}`}</p>
      ) : null}
      {hasTable && entry.slug === 'les-1' ? <p>{FIELD_COPY.les1Note}</p> : null}
      {hasTable && entry.slug === 'prospero' ? <p>{FIELD_COPY.prosperoNote}</p> : null}

      <InstrumentDetail>
        {shadowLines(profile).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {minutes.kind === 'rows' ? (
          <>
            <h3>{FIELD_COPY.minuteTableHeading}</h3>
            <table className="tuning minute-table">
              <thead>
                <tr>
                  <th>{FIELD_COPY.minuteTimeHeading}</th>
                  <th>{FIELD_COPY.tuningFrequencyHeading}</th>
                  <th>{FIELD_COPY.tuningShiftHeading}</th>
                  <th>{FIELD_COPY.minuteAzimuthHeading}</th>
                  <th>{FIELD_COPY.minuteElevationHeading}</th>
                </tr>
              </thead>
              <tbody>
                {minutes.rows.map((r) => (
                  <tr key={r.tMs}>
                    <th scope="row">{formatUtc(r.tMs).slice(11, 19)}</th>
                    <td>{r.frequencyMhz.toFixed(4)}</td>
                    <td>{signedKhz(r.shiftKhz)}</td>
                    <td>{r.azimuthDeg.toFixed(1)}</td>
                    <td>{r.elevationDeg.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <button type="button" onClick={() => void copy()}>
                {FIELD_COPY.copyTable}
              </button>{' '}
              <button type="button" onClick={downloadCsv}>
                {FIELD_COPY.downloadCsv}
              </button>
            </p>
            {notice !== null ? <p role="status">{notice}</p> : null}
          </>
        ) : null}
      </InstrumentDetail>
      <GroundTrackMap
        satrec={satrec}
        observer={snapshot.observer}
        instantMs={nowMs}
        meanMotion={(satrec.no * 1440) / (2 * Math.PI)}
        entryName={entry.name}
      />
    </section>
  );
}

function PlannerView({ entry }: { entry: PlayableEntry }) {
  const [controller, setController] = useState<PlannerController | null>(null);
  const [fieldDeps, setFieldDeps] = useState<FieldBrowserDeps | null>(null);
  const [minElevation, setMinElevation] = useState(DEFAULT_PLANNER_MIN_ELEVATION_DEG);
  const [selected, setSelected] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const serverSnapshot = useMemo(() => initialSnapshot(entry), [entry]);
  const getServerSnapshot = (): PlannerSnapshot => serverSnapshot;

  useEffect(() => {
    const field = createFieldBrowserDeps();
    const picker = createPickerBrowserDeps();
    const created = createPlannerController(
      {
        clock: field.clock,
        timers: field.timers,
        storage: field.storage,
        tleSource: createTleSource(picker.tleFetcher, entry.noradId),
      },
      entry,
    );
    setFieldDeps(field);
    setController(created);
    return () => {
      created.dispose();
      setController(null);
      setFieldDeps(null);
    };
  }, [entry]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const snapshot = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    controller ? controller.getSnapshot : getServerSnapshot,
    getServerSnapshot,
  );

  const shown = useMemo(() => {
    const passes = new Set(filterPassesByElevation(snapshot.rows.map((r) => r.pass), minElevation));
    return snapshot.rows.filter((r) => passes.has(r.pass));
  }, [snapshot.rows, minElevation]);

  // AOS and LOS azimuths: one observation pair per row.
  const azimuths = useMemo(() => {
    const map = new Map<Pass, { aos: number | null; los: number | null }>();
    if (snapshot.satrec === null) return map;
    const observer = {
      latitudeDeg: snapshot.observer.latitudeDeg,
      longitudeDeg: snapshot.observer.longitudeDeg,
      altitudeKm: 0,
    };
    for (const r of shown) {
      const a = observeAt(snapshot.satrec, r.pass.riseMs, observer);
      const l = observeAt(snapshot.satrec, r.pass.setMs, observer);
      map.set(r.pass, {
        aos: a.ok ? a.lookAngles.azimuthDeg : null,
        los: l.ok ? l.lookAngles.azimuthDeg : null,
      });
    }
    return map;
  }, [shown, snapshot.satrec, snapshot.observer.latitudeDeg, snapshot.observer.longitudeDeg]);

  const busy = snapshot.status === 'loading' || snapshot.status === 'searching';
  const selectedRow = selected === null ? null : (shown.find((r) => r.pass.riseMs === selected) ?? null);

  return (
    <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>{`${FIELD_COPY.plannerHeading} · ${entry.name} · zombieSatellite`}</title>
      <header>
        <h1>{FIELD_COPY.plannerHeading}</h1>
        <h2>{entry.name}</h2>
        <p>
          <Link className="button primary" href={`/session/${entry.noradId}`}>
            {FIELD_COPY.plannerSessionLink}
          </Link>{' '}
          <Link href={`/guide/${entry.noradId}`}>{FIELD_COPY.guideLink}</Link>{' '}
          <Link href="/session">{FIELD_COPY.plannerBackLink}</Link>
        </p>
      </header>

      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        {FIELD_COPY.plannerFilterLabel}{' '}
        <select value={minElevation} onChange={(e) => setMinElevation(Number(e.target.value))}>
          {PLANNER_MIN_ELEVATIONS.map((n) => (
            <option key={n} value={n}>
              {`${n}°`}
            </option>
          ))}
        </select>
      </label>

      {snapshot.status === 'loading' ? <p>{FIELD_COPY.plannerLoading}</p> : null}
      {snapshot.status === 'searching' ? <p>{FIELD_COPY.plannerSearching}</p> : null}
      {snapshot.status === 'badging' ? <p>{FIELD_COPY.plannerBadging}</p> : null}
      {snapshot.status === 'tle-unavailable' ? (
        <p>
          {FIELD_COPY.plannerTleUnavailable}{' '}
          <button type="button" onClick={() => controller?.retry()}>
            {FIELD_COPY.plannerRetry}
          </button>
        </p>
      ) : null}
      {!busy && snapshot.status !== 'tle-unavailable' && snapshot.rows.length === 0 ? (
        <p>{FIELD_COPY.plannerNoPass}</p>
      ) : null}
      {!busy && snapshot.rows.length > 0 && shown.length === 0 ? (
        <p>
          {`${FIELD_COPY.plannerNoPassAtElevationPrefix} ${minElevation}${FIELD_COPY.plannerNoPassAtElevationSuffix}`}{' '}
          {FIELD_COPY.plannerLowerFilterHint}
        </p>
      ) : null}

      {shown.length > 0 ? (
        <section>
          <h2>{FIELD_COPY.plannerPassesHeading}</h2>
          <p>{FIELD_COPY.plannerSelectHint}</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {shown.map((row, index) => {
              const { pass } = row;
              const az = azimuths.get(pass);
              const isFirst = index === 0 && shown[0] === snapshot.rows[0];
              return (
                <li key={pass.riseMs} className="card">
                  <button
                    type="button"
                    aria-pressed={selected === pass.riseMs}
                    onClick={() => setSelected(selected === pass.riseMs ? null : pass.riseMs)}
                  >
                    {pass.startTruncated ? `${FIELD_COPY.plannerNowInProgress}: ` : ''}
                    {formatUtc(pass.riseMs)} to {formatUtc(pass.setMs)}
                  </button>
                  <p>
                    {FIELD_COPY.plannerAosAzimuthLabel} {azimuthText(az?.aos ?? null)} ·{' '}
                    {FIELD_COPY.plannerMaxElevationLabel} {pass.maxElevationDeg.toFixed(1)}° ·{' '}
                    {FIELD_COPY.plannerLosAzimuthLabel} {azimuthText(az?.los ?? null)}
                  </p>
                  <IlluminationBadge profile={row.profile} sunlitOnly={entry.beacon.sunlitOnly === true} />
                  <p>
                    {SHELL_COPY.localTimeLabel}{' '}
                    {formatLocalTimeNote(pass.riseMs, -new Date(pass.riseMs).getTimezoneOffset())}
                  </p>
                  {isFirst ? <p>{FIELD_COPY.plannerNextPassMark}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {selectedRow !== null ? (
        <PassDetail entry={entry} snapshot={snapshot} row={selectedRow} nowMs={nowMs} fieldDeps={fieldDeps} />
      ) : null}
    </main>
  );
}

export default function PlannerPage() {
  const params = useParams<{ noradId: string }>();
  const entry = resolvePlayableEntry(params?.noradId);

  if (entry === null) {
    return (
      <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
        <title>{`${FIELD_COPY.plannerNotFoundHeading} · zombieSatellite`}</title>
        <h1>{FIELD_COPY.plannerNotFoundHeading}</h1>
        <p>{FIELD_COPY.plannerNotFoundText}</p>
        <p>
          <Link href="/session">{FIELD_COPY.plannerNotFoundLink}</Link>
        </p>
      </main>
    );
  }

  return <PlannerView entry={entry} />;
}
