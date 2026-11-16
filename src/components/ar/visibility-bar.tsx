// The 24-hour Visibility_Bar of the AR tab (S10 design "Visibility_Bar"). Presentational: props in, markup out.
import type { VisibilityWindow } from '../../lib/field/index';

export interface VisibilityBarProps {
  /** Position of the NOW marker as a fraction of the span. */
  readonly nowFrac: number;
  readonly nowLabel: string;
  readonly windows: readonly VisibilityWindow[];
  readonly ticks: ReadonlyArray<{ frac: number; label: string }>;
  /** SAT marker, or null when there is none to show. */
  readonly sat: { readonly frac: number; readonly inView: boolean } | null;
  readonly satLabel: string;
}

const pct = (frac: number): string => `${(frac * 100).toFixed(2)}%`;

export function VisibilityBar({ nowFrac, nowLabel, windows, ticks, sat, satLabel }: VisibilityBarProps) {
  return (
    <div className="ar-vis">
      <div className="ar-vis-head">
        <span>{nowLabel}</span>
        <span>{satLabel}</span>
      </div>
      <div className="ar-vis-track" role="img" aria-label="Visibility over the next 24 hours, UTC">
        {windows.map((w) => (
          <span
            key={w.riseMs}
            className={w.running ? 'ar-vis-win ar-vis-running' : 'ar-vis-win'}
            style={{ left: pct(w.startFrac), width: `${Math.max(0.6, (w.endFrac - w.startFrac) * 100)}%` }}
          />
        ))}
        <span className="ar-vis-now" style={{ left: pct(nowFrac) }} />
        {sat === null ? null : (
          <span className={sat.inView ? 'ar-vis-sat ar-vis-sat-on' : 'ar-vis-sat'} style={{ left: pct(sat.frac) }} />
        )}
      </div>
      <div className="ar-vis-hours">
        {ticks.map((t, i) => (
          <span key={i} style={{ left: pct(t.frac) }}>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
