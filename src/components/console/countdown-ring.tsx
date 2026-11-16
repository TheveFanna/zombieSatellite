import { countdownRingFraction, remainingRingFraction, ringIsNear } from '../../lib/console/index';
import { formatCountdown } from '../../lib/session/index';
import { CONSOLE_COPY } from './copy';

export interface CountdownRingProps {
  readonly mode: 'awaiting' | 'in-pass';
  /** Milliseconds to AOS (awaiting). */
  readonly countdownMs: number | null;
  /** Session instant and pass bounds (in-pass). */
  readonly nowMs?: number | null;
  readonly riseMs?: number;
  readonly setMs?: number;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownRing({ mode, countdownMs, nowMs = null, riseMs = 0, setMs = 0 }: CountdownRingProps) {
  const inPass = mode === 'in-pass';
  const fraction = inPass
    ? nowMs === null
      ? 0
      : remainingRingFraction(nowMs, riseMs, setMs)
    : countdownRingFraction(countdownMs);
  const near = !inPass && ringIsNear(countdownMs);
  const remainingMs = inPass ? (nowMs === null ? null : Math.max(0, setMs - nowMs)) : countdownMs;
  const caption = inPass ? CONSOLE_COPY.ringToLos : near ? CONSOLE_COPY.ringAosSoon : CONSOLE_COPY.ringToAos;
  const filled = fraction * CIRCUMFERENCE;
  const dash = near ? '6 4' : `${filled} ${CIRCUMFERENCE}`;
  return (
    <div className="ring" data-near={near ? 'true' : 'false'}>
      <svg className="ring-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={RADIUS} fill="none" />
        <circle
          className="ring-fill"
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeDasharray={dash}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-text">
        <span className="ring-time">{remainingMs === null ? '—' : formatCountdown(remainingMs)}</span>
        <span className="ring-caption">{caption}</span>
      </div>
    </div>
  );
}
