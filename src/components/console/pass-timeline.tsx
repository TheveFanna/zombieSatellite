import { formatUtc } from '../../lib/session/index';
import { CONSOLE_COPY } from './copy';

export interface PassTimelineProps {
  readonly riseMs: number;
  readonly peakMs: number;
  readonly setMs: number;
  /** Current instant for the moving tick, or null for none. */
  readonly nowMs: number | null;
}

function share(ms: number, riseMs: number, setMs: number): number {
  const span = setMs - riseMs;
  if (!(span > 0)) return 0;
  return Math.min(1, Math.max(0, (ms - riseMs) / span));
}

function clock(ms: number): string {
  return formatUtc(ms).slice(11, 19);
}

export function PassTimeline({ riseMs, peakMs, setMs, nowMs }: PassTimelineProps) {
  const marks = [
    { key: 'aos', label: CONSOLE_COPY.timelineAos, ms: riseMs },
    { key: 'peak', label: CONSOLE_COPY.timelinePeak, ms: peakMs },
    { key: 'los', label: CONSOLE_COPY.timelineLos, ms: setMs },
  ];
  return (
    <div className="timeline">
      <div className="timeline-rule">
        {nowMs !== null && nowMs >= riseMs && nowMs <= setMs ? (
          <span className="timeline-tick" style={{ left: `${share(nowMs, riseMs, setMs) * 100}%` }} />
        ) : null}
        {marks.map((m) => (
          <span key={m.key} className="timeline-mark" style={{ left: `${share(m.ms, riseMs, setMs) * 100}%` }}>
            <span className="timeline-label">{m.label}</span>
            <span className="timeline-time">{clock(m.ms)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
