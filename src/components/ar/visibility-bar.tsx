// The 24-hour Visibility_Bar of the AR tab (S9 design "Visibility bar"). Presentational: props in, markup out.
import type { VisibilityWindow } from '../../lib/field/index';

export interface VisibilityBarProps {
  readonly windows: readonly VisibilityWindow[];
  readonly ticks: ReadonlyArray<{ frac: number; label: string }>;
  readonly summary: string;
}

export function VisibilityBar({ windows, ticks, summary }: VisibilityBarProps) {
  return (
    <div className="ar-vis">
      <div className="ar-vis-track" role="img" aria-label="Visibility over the next 24 hours, UTC">
        {windows.map((w) => (
          <span
            key={w.riseMs}
            className={w.running ? 'ar-vis-win ar-vis-running' : 'ar-vis-win'}
            style={{ left: `${w.startFrac * 100}%`, width: `${Math.max(0.6, (w.endFrac - w.startFrac) * 100)}%` }}
          />
        ))}
        {ticks.map((t) => (
          <span key={t.label} className="ar-vis-tick" style={{ left: `${t.frac * 100}%` }}>
            {t.label}
          </span>
        ))}
        <span className="ar-vis-now" />
      </div>
      <p className="ar-vis-text">{summary}</p>
    </div>
  );
}