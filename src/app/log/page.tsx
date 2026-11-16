'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { listCatalogEntries } from '../../lib/catalog/index';
import { FIELD_COPY, parseLogDraft, sortLogNewestFirst } from '../../lib/field/index';
import type { LogEntry, LogField } from '../../lib/field/index';
import { formatUtc } from '../../lib/session/index';
import { createFieldBrowserDeps } from '../../components/field/browser-deps';
import { addLogEntry, readLog } from '../../components/field/log-store';
import { SelfReportedMark } from '../../components/field/visuals/field-bits';

type Errors = Partial<Record<LogField, string>>;

export default function LogPage() {
  const deps = useMemo(() => (typeof window === 'undefined' ? null : createFieldBrowserDeps()), []);
  const counter = useRef(0);
  const [entries, setEntries] = useState<readonly LogEntry[]>([]);
  const [noradId, setNoradId] = useState('');
  const [utcText, setUtcText] = useState('');
  const [frequencyText, setFrequencyText] = useState('');
  const [equipment, setEquipment] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (deps !== null) setEntries(readLog(deps.storage));
  }, [deps]);

  const nameOf = (id: number): string => listCatalogEntries().find((e) => e.noradId === id)?.name ?? String(id);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (deps === null) return;
    const result = parseLogDraft(
      { noradId: noradId === '' ? null : Number(noradId), utcText, frequencyText, equipment, note },
      deps.clock.nowMs(),
    );
    if (!result.ok) {
      setErrors({ [result.field]: result.reason });
      return;
    }
    counter.current += 1;
    const entry: LogEntry = { id: `${String(result.value.utcMs)}-${String(counter.current)}`, ...result.value };
    setEntries(addLogEntry(deps.storage, entry));
    setErrors({});
    setUtcText('');
    setFrequencyText('');
    setEquipment('');
    setNote('');
  }

  const sorted = sortLogNewestFirst(entries);

  return (
    <main data-tab="log" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <h1>{FIELD_COPY.logHeading}</h1>
      <SelfReportedMark />
      <p>{FIELD_COPY.logStoredLocally}</p>
      <form className="log-form" onSubmit={onSubmit} noValidate>
        <label>
          {FIELD_COPY.logSatelliteLabel}
          <select value={noradId} onChange={(e) => setNoradId(e.target.value)} aria-invalid={errors.noradId !== undefined}>
            <option value="">—</option>
            {listCatalogEntries().map((e) => (
              <option key={e.noradId} value={String(e.noradId)}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        {errors.noradId === undefined ? null : <p role="alert">{errors.noradId}</p>}
        <label>
          {FIELD_COPY.logUtcLabel}
          <input
            type="text"
            value={utcText}
            placeholder={FIELD_COPY.logUtcPlaceholder}
            onChange={(e) => setUtcText(e.target.value)}
            aria-invalid={errors.utc !== undefined}
          />
        </label>
        {errors.utc === undefined ? null : <p role="alert">{errors.utc}</p>}
        <label>
          {FIELD_COPY.logFrequencyLabel}
          <input
            type="text"
            inputMode="decimal"
            value={frequencyText}
            onChange={(e) => setFrequencyText(e.target.value)}
            aria-invalid={errors.frequency !== undefined}
          />
        </label>
        {errors.frequency === undefined ? null : <p role="alert">{errors.frequency}</p>}
        <label>
          {FIELD_COPY.logEquipmentLabel}
          <input
            type="text"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            aria-invalid={errors.equipment !== undefined}
          />
        </label>
        {errors.equipment === undefined ? null : <p role="alert">{errors.equipment}</p>}
        <label>
          {FIELD_COPY.logNoteLabel}
          <textarea value={note} rows={4} onChange={(e) => setNote(e.target.value)} aria-invalid={errors.note !== undefined} />
        </label>
        {errors.note === undefined ? null : <p role="alert">{errors.note}</p>}
        <p>
          <button className="button primary" type="submit">
            {FIELD_COPY.logAdd}
          </button>
        </p>
      </form>
      <p>{FIELD_COPY.logCapNote}</p>
      {sorted.length === 0 ? (
        <p>{FIELD_COPY.logEmpty}</p>
      ) : (
        <ul className="log-list">
          {sorted.map((e) => (
            <li key={e.id} className="log-entry">
              <SelfReportedMark />
              <h3>{nameOf(e.noradId)}</h3>
              <p>
                {formatUtc(e.utcMs)} · {String(e.frequencyMhz)} MHz
              </p>
              {e.equipment === '' ? null : <p>{e.equipment}</p>}
              {e.note === '' ? null : <p className="log-note">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
