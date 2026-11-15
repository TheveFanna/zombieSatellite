import { DEMO_RATE } from './constants';

/** The Virtual_Clock: the Session_Instant that corresponds to one Real_Clock instant. */
export interface VirtualClockAnchor {
  readonly anchorRealMs: number;
  readonly anchorSessionMs: number;
}

/** Real-time Session_Instant: an integer number of ms UTC (D4). */
export function realInstantMs(realMs: number): number {
  return Math.floor(realMs);
}

/** Demo Session_Instant: anchor + Demo_Rate × elapsed real time, an integer number of ms UTC (D4). */
export function virtualInstantMs(anchor: VirtualClockAnchor, realMs: number): number {
  return Math.floor(anchor.anchorSessionMs + DEMO_RATE * (realMs - anchor.anchorRealMs));
}

/** AOS minus the Session_Instant. Never stored; derived from the clock on each read. */
export function countdownMs(aosMs: number, sessionInstantMs: number): number {
  return aosMs - sessionInstantMs;
}
