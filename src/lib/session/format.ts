import type { ObserverPosition } from './types';

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** `2026-11-09 11:18:05 UTC`, from the ISO UTC string only, never local time. */
export function formatUtc(instantMs: number): string {
  if (!Number.isFinite(instantMs)) return '—';
  const iso = new Date(instantMs).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

/** `T−HH:MM:SS`; a value at or below 0 shows as `T−00:00:00`. */
export function formatCountdown(countdownMs: number): string {
  const totalS = Math.max(0, Math.ceil(countdownMs / 1000));
  const hours = Math.floor(totalS / 3600);
  const minutes = Math.floor((totalS % 3600) / 60);
  const seconds = totalS % 60;
  return `T\u2212${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** Pass duration in whole minutes (C79). */
export function formatDurationMin(durationMin: number): string {
  return `${Math.round(durationMin)} min`;
}

/** The `/pointing` rule: empty or out-of-range text gives null. */
export function parseCoordinateInput(text: string, min: number, max: number): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function isValidPosition(latitudeDeg: unknown, longitudeDeg: unknown): boolean {
  return (
    typeof latitudeDeg === 'number' &&
    Number.isFinite(latitudeDeg) &&
    latitudeDeg >= -90 &&
    latitudeDeg <= 90 &&
    typeof longitudeDeg === 'number' &&
    Number.isFinite(longitudeDeg) &&
    longitudeDeg >= -180 &&
    longitudeDeg <= 180
  );
}

/** Stored observer text to a position, or null when absent, malformed or out of range. Never throws. */
export function parseStoredObserver(raw: string | null): ObserverPosition | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { latitudeDeg, longitudeDeg } = parsed as { latitudeDeg?: unknown; longitudeDeg?: unknown };
    if (!isValidPosition(latitudeDeg, longitudeDeg)) return null;
    return { latitudeDeg: latitudeDeg as number, longitudeDeg: longitudeDeg as number };
  } catch {
    return null;
  }
}

export function serializeObserver(position: ObserverPosition): string {
  return JSON.stringify({ latitudeDeg: position.latitudeDeg, longitudeDeg: position.longitudeDeg });
}
