import type { NoradId } from '../catalog/index';
import type { Pass } from '../orbit/index';
import type { LockStats } from './stats';
import type { ClockMode, SessionResult } from './types';

export const MAX_STORED_RESULTS = 50;

export interface SessionResultInput {
  readonly noradId: NoradId;
  readonly pass: Pass;
  /** The Session_Instant at which the session ended; used as LOS only when `completed` is false. */
  readonly endMs: number;
  readonly completed: boolean;
  readonly mode: ClockMode;
}

/** `closedStats` must come from `closeLockStats` at the end instant. */
export function buildSessionResult(input: SessionResultInput, closedStats: LockStats): SessionResult {
  const { pass } = input;
  const passDurationMs = pass.setMs - pass.riseMs;
  const lockedRatio = passDurationMs > 0 ? Math.min(1, closedStats.lockedMs / passDurationMs) : 0;
  return {
    noradId: input.noradId,
    aosMs: pass.riseMs,
    losMs: input.completed ? pass.setMs : input.endMs,
    maxElevationDeg: pass.maxElevationDeg,
    lockedSeconds: closedStats.lockedMs / 1000,
    bestPointingErrorDeg: closedStats.bestPointingErrorDeg,
    lockedRatio,
    completed: input.completed,
    mode: input.mode,
    autoPointUsed: closedStats.autoPointUsed,
  };
}

const RESULT_FIELDS = [
  'noradId',
  'aosMs',
  'losMs',
  'maxElevationDeg',
  'lockedSeconds',
  'bestPointingErrorDeg',
  'lockedRatio',
  'completed',
  'mode',
  'autoPointUsed',
] as const;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** True for an object with exactly the ten fields of a Session_Result and valid values. */
export function isSessionResult(value: unknown): value is SessionResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== RESULT_FIELDS.length || !RESULT_FIELDS.every((field) => keys.includes(field))) return false;
  const r = value as Record<string, unknown>;
  return (
    Number.isInteger(r.noradId) &&
    (r.noradId as number) >= 1 &&
    (r.noradId as number) <= 99_999 &&
    Number.isInteger(r.aosMs) &&
    Number.isInteger(r.losMs) &&
    (r.losMs as number) >= (r.aosMs as number) &&
    isFiniteNumber(r.maxElevationDeg) &&
    isFiniteNumber(r.lockedSeconds) &&
    r.lockedSeconds >= 0 &&
    (r.bestPointingErrorDeg === null || (isFiniteNumber(r.bestPointingErrorDeg) && r.bestPointingErrorDeg >= 0)) &&
    isFiniteNumber(r.lockedRatio) &&
    r.lockedRatio >= 0 &&
    r.lockedRatio <= 1 &&
    typeof r.completed === 'boolean' &&
    (r.mode === 'real' || r.mode === 'demo') &&
    typeof r.autoPointUsed === 'boolean'
  );
}

function freshCopy(result: SessionResult): SessionResult {
  return Object.freeze({
    noradId: result.noradId,
    aosMs: result.aosMs,
    losMs: result.losMs,
    maxElevationDeg: result.maxElevationDeg,
    lockedSeconds: result.lockedSeconds,
    bestPointingErrorDeg: result.bestPointingErrorDeg,
    lockedRatio: result.lockedRatio,
    completed: result.completed,
    mode: result.mode,
    autoPointUsed: result.autoPointUsed,
  });
}

/** Stored text to the valid Session_Results it holds. Never throws; malformed records are skipped. */
export function parseSessionResults(raw: string | null): SessionResult[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isSessionResult).map(freshCopy);
}

/** The JSON of the valid stored results plus `result`, newest last, cut to the newest MAX_STORED_RESULTS. */
export function appendSessionResult(raw: string | null, result: SessionResult): string {
  return JSON.stringify([...parseSessionResults(raw), freshCopy(result)].slice(-MAX_STORED_RESULTS));
}
