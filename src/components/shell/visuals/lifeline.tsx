// Lifeline visual (S6 task 7C). Presentational only: one horizontal line per catalog entry that
// draws its documented history. Solid: in service. Dashed: silent. Phosphor wave: reported again.
// Brass dotted line: a story-only entry. A brass ring with a dot: an unconfirmed later report.
import { LIFELINE_END_YEAR, LIFELINE_NOW_YEAR, LIFELINE_START_YEAR } from '../history';
import type { Lifeline as LifelineData } from '../history';

const W = 300;
const H = 38;
const AXIS = 16;

function x(year: number): number {
  return ((year - LIFELINE_START_YEAR) / (LIFELINE_END_YEAR - LIFELINE_START_YEAR)) * W;
}

/** A small sine wave from x0 to x1 around the axis: the signal heard again. */
function wave(x0: number, x1: number): string {
  const parts = [`M ${x0.toFixed(1)} ${AXIS}`];
  for (let px = x0; px <= x1; px += 0.75) {
    parts.push(`L ${px.toFixed(2)} ${(AXIS - 3.2 * Math.sin(((px - x0) / 2.6) * Math.PI)).toFixed(2)}`);
  }
  return parts.join(' ');
}

function Year({ year, below }: { year: number; below?: boolean }) {
  return (
    <text className="lifeline-year" x={x(year)} y={below === true ? AXIS + 13 : AXIS - 8}>
      {year}
    </text>
  );
}

export function LifelineView({ data, storyOnly }: { data: LifelineData; storyOnly: boolean }) {
  const now = LIFELINE_NOW_YEAR;
  const { launched, silent, rediscovered, silentAgain, unconfirmed, episode } = data;
  return (
    <svg className={storyOnly ? 'lifeline lifeline-story' : 'lifeline'} viewBox={`-6 0 ${W + 12} ${H}`} aria-hidden="true">
      <line className="lifeline-axis" x1={0} y1={AXIS} x2={W} y2={AXIS} />
      {[1960, 1980, 2000, 2020].map((year) => (
        <line key={year} className="lifeline-grid" x1={x(year)} y1={AXIS - 2} x2={x(year)} y2={AXIS + 2} />
      ))}
      {launched === null ? null : (
        <>
          <line
            className={storyOnly ? 'lifeline-story-span' : 'lifeline-alive'}
            x1={x(launched)}
            y1={AXIS}
            x2={x(silent ?? (rediscovered === null ? now : launched))}
            y2={AXIS}
          />
          {silent === null && !storyOnly ? <path className="lifeline-wave" d={wave(x(launched), x(now))} /> : null}
          <circle className="lifeline-launch" cx={x(launched)} cy={AXIS} r={2.4} />
          <Year year={launched} below />
        </>
      )}
      {silent === null ? null : (
        <>
          <line
            className="lifeline-silent"
            x1={x(silent)}
            y1={AXIS}
            x2={x(rediscovered ?? now)}
            y2={AXIS}
          />
          <line className="lifeline-cut" x1={x(silent)} y1={AXIS - 4} x2={x(silent)} y2={AXIS + 4} />
          <Year year={silent} below />
        </>
      )}
      {rediscovered === null ? null : (
        <>
          {silentAgain === null ? (
            <path className={storyOnly ? 'lifeline-wave lifeline-wave-story' : 'lifeline-wave'} d={wave(x(rediscovered), x(now))} />
          ) : (
            <>
              <path className="lifeline-wave" d={wave(x(rediscovered), x(rediscovered) + 3)} />
              <line className="lifeline-silent" x1={x(rediscovered) + 3} y1={AXIS} x2={x(now)} y2={AXIS} />
            </>
          )}
          <circle className="lifeline-found" cx={x(rediscovered)} cy={AXIS} r={2.1} />
          <Year year={rediscovered} />
        </>
      )}
      {unconfirmed ? (
        <g className="lifeline-unconfirmed" transform={`translate(${x(2004)} ${AXIS})`}>
          <circle r={4.2} />
          <circle className="lifeline-unconfirmed-dot" r={1} />
        </g>
      ) : null}
      {episode === null ? null : (
        <>
          <line className="lifeline-story-span" x1={x(episode) - 18} y1={AXIS} x2={x(now)} y2={AXIS} />
          <circle className="lifeline-found" cx={x(episode)} cy={AXIS} r={2.1} />
          <Year year={episode} />
        </>
      )}
      <line className="lifeline-now" x1={x(now)} y1={AXIS - 6} x2={x(now)} y2={AXIS + 6} />
    </svg>
  );
}