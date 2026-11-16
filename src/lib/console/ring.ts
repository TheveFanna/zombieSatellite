/** Countdown ring geometry (S8 design "Countdown ring and timeline"). Pure; the instant is always passed in. */

/** The ring starts filling this long before AOS. */
export const RING_LEAD_MS = 30 * 60_000;
/** "AOS near" threshold. */
export const RING_NEAR_MS = 5 * 60_000;

/** 0 when null or at least the lead; 1 at 0. */
export function countdownRingFraction(countdownMs: number | null): number {
  if (countdownMs === null || !Number.isFinite(countdownMs) || countdownMs >= RING_LEAD_MS) return 0;
  if (countdownMs <= 0) return 1;
  return 1 - countdownMs / RING_LEAD_MS;
}

/** Share of the pass still ahead, clamped to [0, 1]. */
export function remainingRingFraction(nowMs: number, riseMs: number, setMs: number): number {
  const span = setMs - riseMs;
  if (!(span > 0) || !Number.isFinite(nowMs)) return 0;
  return Math.min(1, Math.max(0, (setMs - nowMs) / span));
}

/** True when 0 <= countdown <= RING_NEAR_MS. */
export function ringIsNear(countdownMs: number | null): boolean {
  return countdownMs !== null && countdownMs >= 0 && countdownMs <= RING_NEAR_MS;
}
