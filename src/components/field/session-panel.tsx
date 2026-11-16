'use client';

import { useMemo, useState } from 'react';
import type { PlayableEntry } from '../../lib/catalog/index';
import { FIELD_COPY, minuteTable, tuningCsv } from '../../lib/field/index';
import type { IlluminationProfile, TuningPoint } from '../../lib/field/index';
import { formatDopplerReadout, formatUtc } from '../../lib/session/index';
import type { SessionSnapshot } from '../session/session-controller';
import type { PassFieldSnapshot } from './pass-field-controller';
import { IlluminationBadge, InstrumentDetail } from './visuals/field-bits';
import { SkyTrackView } from './visuals/sky-track';

export interface FieldSessionPanelProps {
  readonly entry: PlayableEntry;
  readonly snapshot: SessionSnapshot;
  readonly field: PassFieldSnapshot;
  readonly onCopy: (text: string) => Promise<boolean>;
  readonly onDownloadCsv: (csv: string, aosMs: number) => void;
}

function rowLabel(point: TuningPoint, fallback: string): string {
  if (point.kind === 'aos') return point.truncated ? FIELD_COPY.tuningNowLabel : FIELD_COPY.tuningAosLabel;
  if (point.kind === 'los') return point.truncated ? FIELD_COPY.tuningWindowEndLabel : FIELD_COPY.tuningLosLabel;
  return fallback;
}

function shadowLines(profile: IlluminationProfile | null): string[] {
  if (profile === null || profile.kind !== 'partly') return [];
  return profile.transitions.map(
    (t) => `${t.kind === 'entry' ? FIELD_COPY.shadowEntryLabel : FIELD_COPY.shadowExitLabel}: ${formatUtc(t.atMs)}`,
  );
}

function signedKhz(value: number): string {
  return `${value < 0 ? '\u2212' : '+'}${Math.abs(value).toFixed(2)} kHz`;
}

export function FieldSessionPanel({ entry, snapshot, field, onCopy, onDownloadCsv }: FieldSessionPanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const { pass, tuning, profile } = field;
  const observer = snapshot.observer;
  const downlinkMhz = entry.beacon.downlinkMhz;

  const minutes = useMemo(() => {
    if (field.satrec === null || pass === null) return null;
    return minuteTable({
      satrec: field.satrec,
      observer: { latitudeDeg: observer.latitudeDeg, longitudeDeg: observer.longitudeDeg, altitudeKm: 0 },
      downlinkMhz,
      pass,
    });
  }, [field.satrec, pass, observer.latitudeDeg, observer.longitudeDeg, downlinkMhz]);

  if (field.status === 'failed') {
    return (
      <section>
        <h2>{FIELD_COPY.panelHeading}</h2>
        <p>{FIELD_COPY.orbitUnavailable}</p>
      </section>
    );
  }
  if (pass === null) return null;

  const csv = minutes !== null && minutes.kind === 'rows' ? tuningCsv(minutes.rows, FIELD_COPY.tuningCsvHeader) : null;

  async function copy() {
    if (csv === null) return;
    setNotice((await onCopy(csv.replace(/,/g, '\t'))) ? FIELD_COPY.copied : FIELD_COPY.copyFailed);
  }

  const hasTable = tuning !== null && tuning.kind === 'table';
  const nominalLine =
    hasTable && entry.beacon.displayFrequency !== null
      ? `${FIELD_COPY.tuningNominalPrefix} ${entry.beacon.displayFrequency}`
      : null;

  return (
    <section>
      <h2>{FIELD_COPY.panelHeading}</h2>
      <IlluminationBadge profile={profile} sunlitOnly={entry.beacon.sunlitOnly === true} />
      {field.track !== null ? (
        <SkyTrackView
          track={field.track}
          profile={profile}
          pass={pass}
          target={snapshot.orbitDataMissing ? null : snapshot.target}
          truncatedStart={tuning !== null && tuning.kind === 'table' && tuning.points.some((p) => p.kind === 'aos' && p.truncated)}
          truncatedEnd={tuning !== null && tuning.kind === 'table' && tuning.points.some((p) => p.kind === 'los' && p.truncated)}
        />
      ) : null}
      <p>
        {FIELD_COPY.maxElevationLabel}: {pass.maxElevationDeg.toFixed(1)}°
      </p>

      {tuning !== null && tuning.kind === 'no-frequency' ? <p>{FIELD_COPY.noFrequencyNote}</p> : null}
      {tuning !== null && tuning.kind === 'table' ? (
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
                <th scope="row">{rowLabel(p, FIELD_COPY.tuningTcaLabel)}</th>
                <td>{p.frequencyMhz.toFixed(4)}</td>
                <td>{signedKhz(p.shiftKhz)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {nominalLine !== null ? <p>{nominalLine}</p> : null}
      {hasTable && entry.slug === 'les-1' ? <p>{FIELD_COPY.les1Note}</p> : null}
      {hasTable && entry.slug === 'prospero' ? <p>{FIELD_COPY.prosperoNote}</p> : null}

      <InstrumentDetail>
        <dl>
          <dt>{FIELD_COPY.azimuthLabel}</dt>
          <dd>{snapshot.target === null || snapshot.orbitDataMissing ? '—' : `${snapshot.target.azimuthDeg.toFixed(1)}°`}</dd>
          <dt>{FIELD_COPY.elevationLabel}</dt>
          <dd>{snapshot.target === null || snapshot.orbitDataMissing ? '—' : `${snapshot.target.elevationDeg.toFixed(1)}°`}</dd>
          <dt>{FIELD_COPY.dopplerLabel}</dt>
          <dd>{snapshot.doppler === null ? '—' : formatDopplerReadout(snapshot.doppler)}</dd>
        </dl>
        {shadowLines(profile).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {minutes !== null && minutes.kind === 'rows' ? (
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
              <button type="button" onClick={() => csv !== null && onDownloadCsv(csv, pass.riseMs)}>
                {FIELD_COPY.downloadCsv}
              </button>
            </p>
            {notice !== null ? <p role="status">{notice}</p> : null}
          </>
        ) : null}
      </InstrumentDetail>
    </section>
  );
}
