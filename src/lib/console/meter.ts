// Meter_Level mapping of the console UI (design.md, "Alignment meter", C2). Pure, no clock, no DOM.

export type MeterBand = 'locked' | 'closing' | 'far' | 'unavailable';

export interface MeterLevel {
  readonly level: number;
  readonly band: MeterBand;
}

/** Upper edge of the closing band, in degrees. */
export const METER_CLOSING_DEG = 30;
/** The level reaches 0 at this pointing error, in degrees. */
export const METER_FAR_DEG = 90;

/** pointingErrorDeg is null when there is none. toleranceDeg is the lock tolerance. */
export function meterLevel(pointingErrorDeg: number | null, toleranceDeg: number): MeterLevel {
  if (pointingErrorDeg === null || Number.isNaN(pointingErrorDeg) || pointingErrorDeg < 0) {
    return { level: 0, band: 'unavailable' };
  }
  if (pointingErrorDeg <= toleranceDeg) return { level: 1, band: 'locked' };
  const level = Math.max(0, 1 - (pointingErrorDeg - toleranceDeg) / (METER_FAR_DEG - toleranceDeg));
  return { level, band: pointingErrorDeg <= METER_CLOSING_DEG ? 'closing' : 'far' };
}
