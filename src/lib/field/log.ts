// Listening_Log core: Log_Entry validation, append, parse, serialize. User text is data only.
import { listCatalogEntries } from '../catalog/index';

export interface LogEntry {
  readonly id: string;
  readonly noradId: number;
  readonly utcMs: number;
  readonly frequencyMhz: number;
  readonly equipment: string;
  readonly note: string;
}

export const MAX_LOG_ENTRIES = 200;
export const MAX_EQUIPMENT_CHARS = 120;
export const MAX_NOTE_CHARS = 500;

const MAX_FREQUENCY_MHZ = 30000;
const EARLIEST_UTC_MS = Date.UTC(1957, 9, 4);
const FUTURE_SLACK_MS = 5 * 60 * 1000;

export type LogField = 'noradId' | 'utc' | 'frequency' | 'equipment' | 'note';

export interface LogDraftInput {
  readonly noradId: unknown;
  readonly utcText: string;
  readonly frequencyText: string;
  readonly equipment: string;
  readonly note: string;
}

export type LogDraftResult =
  | { readonly ok: true; readonly value: Omit<LogEntry, 'id'> }
  | { readonly ok: false; readonly field: LogField; readonly reason: string };

const UTC_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?Z?$/;
const FREQUENCY_PATTERN = /^\d+(?:\.\d+)?$/;
// eslint-disable-next-line no-control-regex
const CONTROL_ALL = /[\u0000-\u001f\u007f-\u009f]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_KEEP_LF = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g;

function isCatalogNorad(value: unknown): value is number {
  return typeof value === 'number' && listCatalogEntries().some((e) => e.noradId === value);
}

function parseUtcText(text: string): number | null {
  const m = UTC_PATTERN.exec(text.trim());
  if (m === null) return null;
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number);
  const s = m[6] === undefined ? 0 : Number(m[6]);
  const ms = Date.UTC(y, mo - 1, d, h, mi, s);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() !== mo - 1 ||
    back.getUTCDate() !== d ||
    back.getUTCHours() !== h ||
    back.getUTCMinutes() !== mi ||
    back.getUTCSeconds() !== s
  ) {
    return null;
  }
  return ms;
}

function cleanLine(text: string): string {
  return text.replace(CONTROL_ALL, '').trim();
}

function cleanNote(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL_KEEP_LF, '').trim();
}

export function parseLogDraft(input: LogDraftInput, nowMs: number): LogDraftResult {
  if (!isCatalogNorad(input.noradId)) {
    return { ok: false, field: 'noradId', reason: 'Choose one of the listed satellites.' };
  }
  const utcMs = parseUtcText(input.utcText);
  if (utcMs === null) {
    return { ok: false, field: 'utc', reason: 'Use the UTC form YYYY-MM-DD HH:MM.' };
  }
  if (utcMs < EARLIEST_UTC_MS || utcMs > nowMs + FUTURE_SLACK_MS) {
    return { ok: false, field: 'utc', reason: 'The instant must be after 1957-10-04 and not in the future.' };
  }
  const freqText = input.frequencyText.trim();
  const frequencyMhz = FREQUENCY_PATTERN.test(freqText) ? Number(freqText) : Number.NaN;
  if (!Number.isFinite(frequencyMhz) || frequencyMhz <= 0 || frequencyMhz > MAX_FREQUENCY_MHZ) {
    return { ok: false, field: 'frequency', reason: 'Enter a number of MHz above 0 and up to 30000.' };
  }
  const equipment = cleanLine(input.equipment);
  if (equipment.length > MAX_EQUIPMENT_CHARS) {
    return { ok: false, field: 'equipment', reason: 'Use at most 120 characters.' };
  }
  const note = cleanNote(input.note);
  if (note.length > MAX_NOTE_CHARS) {
    return { ok: false, field: 'note', reason: 'Use at most 500 characters.' };
  }
  return { ok: true, value: { noradId: input.noradId, utcMs, frequencyMhz, equipment, note } };
}

/** Appends one entry and keeps the newest MAX_LOG_ENTRIES by instant; the oldest is dropped. */
export function appendLogEntry(existing: readonly LogEntry[], entry: LogEntry): readonly LogEntry[] {
  const all = [...existing, entry];
  if (all.length <= MAX_LOG_ENTRIES) return all;
  const oldest = all.reduce((min, e, i) => (e.utcMs < all[min].utcMs ? i : min), 0);
  return all.filter((_, i) => i !== oldest);
}

function asEntry(value: unknown): LogEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0 || v.id.length > 64) return null;
  if (!isCatalogNorad(v.noradId)) return null;
  if (typeof v.utcMs !== 'number' || !Number.isFinite(v.utcMs) || v.utcMs < EARLIEST_UTC_MS) return null;
  if (
    typeof v.frequencyMhz !== 'number' ||
    !Number.isFinite(v.frequencyMhz) ||
    v.frequencyMhz <= 0 ||
    v.frequencyMhz > MAX_FREQUENCY_MHZ
  ) {
    return null;
  }
  if (typeof v.equipment !== 'string' || v.equipment.length > MAX_EQUIPMENT_CHARS) return null;
  if (typeof v.note !== 'string' || v.note.length > MAX_NOTE_CHARS) return null;
  return {
    id: v.id,
    noradId: v.noradId,
    utcMs: v.utcMs,
    frequencyMhz: v.frequencyMhz,
    equipment: cleanLine(v.equipment),
    note: cleanNote(v.note),
  };
}

/** Drops invalid elements; never throws. */
export function parseStoredLog(raw: string | null): readonly LogEntry[] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return [];
    const obj = data as Record<string, unknown>;
    if (obj.v !== 1 || !Array.isArray(obj.entries)) return [];
    const out: LogEntry[] = [];
    for (const item of obj.entries) {
      const e = asEntry(item);
      if (e !== null) out.push(e);
    }
    return out.slice(-MAX_LOG_ENTRIES);
  } catch {
    return [];
  }
}

export function serializeLog(entries: readonly LogEntry[]): string {
  return JSON.stringify({ v: 1, entries });
}

/** Display order: newest instant first. */
export function sortLogNewestFirst(entries: readonly LogEntry[]): readonly LogEntry[] {
  return [...entries].sort((a, b) => b.utcMs - a.utcMs);
}
