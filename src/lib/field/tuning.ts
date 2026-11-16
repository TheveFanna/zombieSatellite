import { observeAt } from '../orbit/index';
import type { Observer, Pass, Satrec } from '../orbit/index';
import { formatUtc, physicalDopplerShiftKhz } from '../session/index';

export interface TuningPoint {
  readonly kind: 'aos' | 'tca' | 'los';
  readonly tMs: number;
  readonly frequencyMhz: number;
  readonly shiftKhz: number;
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  readonly truncated: boolean;
}

export type TuningResult =
  | { readonly kind: 'table'; readonly nominalMhz: number; readonly points: readonly [TuningPoint, TuningPoint, TuningPoint] }
  | { readonly kind: 'no-frequency' }
  | { readonly kind: 'unavailable' };

export type MinuteTableResult =
  | { readonly kind: 'rows'; readonly rows: readonly TuningPoint[] }
  | { readonly kind: 'no-frequency' }
  | { readonly kind: 'unavailable' };

interface TuningInput {
  readonly satrec: Satrec;
  readonly observer: Observer;
  readonly downlinkMhz: number | null;
  readonly pass: Pass;
}

/** Rounds to 0.1 kHz (4 decimals of MHz). */
export function roundMhz(mhz: number): number {
  return Math.round(mhz * 10_000) / 10_000;
}

function pointAt(
  input: TuningInput & { readonly downlinkMhz: number },
  kind: TuningPoint['kind'],
  tMs: number,
  truncated: boolean,
): TuningPoint | null {
  const obs = observeAt(input.satrec, tMs, input.observer);
  if (!obs.ok) return null;
  const shiftKhz = physicalDopplerShiftKhz(input.downlinkMhz, obs.rangeRateKmPerS);
  return {
    kind,
    tMs,
    frequencyMhz: roundMhz(input.downlinkMhz + shiftKhz / 1000),
    shiftKhz,
    azimuthDeg: obs.lookAngles.azimuthDeg,
    elevationDeg: obs.lookAngles.elevationDeg,
    truncated,
  };
}

export function tuningTable(input: TuningInput): TuningResult {
  const { downlinkMhz, pass } = input;
  if (downlinkMhz === null) return { kind: 'no-frequency' };
  const withF = { ...input, downlinkMhz };
  const aos = pointAt(withF, 'aos', pass.riseMs, pass.startTruncated);
  const tca = pointAt(withF, 'tca', pass.peakMs, false);
  const los = pointAt(withF, 'los', pass.setMs, pass.endTruncated);
  if (aos === null || tca === null || los === null) return { kind: 'unavailable' };
  return { kind: 'table', nominalMhz: downlinkMhz, points: [aos, tca, los] };
}

/**
 * AOS, every whole UTC minute strictly between AOS and LOS, and LOS.
 * Interior rows carry kind 'tca' (the union has no interior kind); labels use the instant, not the kind.
 */
export function minuteTable(input: TuningInput): MinuteTableResult {
  const { downlinkMhz, pass } = input;
  if (downlinkMhz === null) return { kind: 'no-frequency' };
  const withF = { ...input, downlinkMhz };
  const instants: Array<{ kind: TuningPoint['kind']; tMs: number; truncated: boolean }> = [
    { kind: 'aos', tMs: pass.riseMs, truncated: pass.startTruncated },
  ];
  for (let t = (Math.floor(pass.riseMs / 60_000) + 1) * 60_000; t < pass.setMs; t += 60_000) {
    instants.push({ kind: 'tca', tMs: t, truncated: false });
  }
  instants.push({ kind: 'los', tMs: pass.setMs, truncated: pass.endTruncated });
  const rows: TuningPoint[] = [];
  for (const i of instants) {
    const p = pointAt(withF, i.kind, i.tMs, i.truncated);
    if (p !== null) rows.push(p);
  }
  return rows.length === 0 ? { kind: 'unavailable' } : { kind: 'rows', rows };
}

function signed(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  return text.startsWith('-') ? text : `+${text}`;
}

/** RFC 4180 style, CRLF line ends, final CRLF. */
export function tuningCsv(rows: readonly TuningPoint[], header: string): string {
  const lines = [header];
  for (const r of rows) {
    lines.push(
      [
        formatUtc(r.tMs),
        r.frequencyMhz.toFixed(4),
        signed(r.shiftKhz, 2),
        r.azimuthDeg.toFixed(1),
        r.elevationDeg.toFixed(1),
      ].join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** `zombiesatellite-<slug>-<yyyymmddhhmm>-tuning.csv` from the AOS instant. */
export function tuningFileName(slug: string, aosMs: number): string {
  const stamp = formatUtc(aosMs).replace(/\D/g, '').slice(0, 12);
  return `zombiesatellite-${slug}-${stamp}-tuning.csv`;
}
