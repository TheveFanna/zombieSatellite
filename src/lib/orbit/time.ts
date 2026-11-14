import { MAX_TIME_MS } from './constants';
import { EngineError } from './errors';

/** A point in time at the Public_Interface: a Date, or milliseconds since 1970-01-01T00:00:00Z. */
export type TimeInput = Date | number;

function kindOf(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

/**
 * Internal. Validates a UTC_Instant (D3) and returns its time value in whole milliseconds.
 * Accepts a Date of any realm with a valid time value, or a finite number with an absolute value
 * of at most 8.64e15. A Date and the number equal to its time value give the same integer.
 * Everything else throws EngineError('invalid-input').
 */
export function toTimeMs(value: unknown, label: string): number {
  let timeValue: number;
  if (typeof value === 'number') {
    timeValue = value;
  } else {
    try {
      // Reads the internal time value of a Date from any realm; throws for every other value.
      timeValue = Date.prototype.getTime.call(value);
    } catch {
      throw new EngineError(
        'invalid-input',
        `${label} must be a Date or a number of milliseconds since 1970-01-01T00:00:00Z, received ${kindOf(value)}`,
      );
    }
    if (Number.isNaN(timeValue)) {
      throw new EngineError('invalid-input', `${label} must be a valid Date, received an Invalid Date`);
    }
  }
  if (!Number.isFinite(timeValue) || Math.abs(timeValue) > MAX_TIME_MS) {
    throw new EngineError(
      'invalid-input',
      `${label} must be a finite number of milliseconds with an absolute value of at most ${MAX_TIME_MS}, received ${String(timeValue)}`,
    );
  }
  // Truncates toward zero as `new Date(value)` does; "+ 0" turns -0 into +0.
  return Math.trunc(timeValue) + 0;
}

/**
 * Internal. Renders an instant for error messages as ISO 8601 UTC via `toISOString()` only,
 * never in local time. A value outside the Date range is rendered as its number.
 */
export function isoOf(timeMs: number): string {
  return Math.abs(timeMs) <= MAX_TIME_MS ? new Date(timeMs).toISOString() : String(timeMs);
}
