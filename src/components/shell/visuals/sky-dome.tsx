// Sky dome visuals (S6 task 7C). Presentational only: props in, SVG out, no state and no effects.
// The dome is an azimuthal equidistant map of the sky: zenith at the centre, horizon on the rim,
// north up, east right (src/lib/shell/sky.ts).
import type { CatalogEntry } from '../../../lib/catalog/index';
import { effectiveAzimuthDeg, LOCK_TOLERANCE_DEG } from '../../../lib/pointing/index';
import { domePoint, domeRadius } from '../../../lib/shell/index';

const R = 100;
const VIEW = '-118 -118 236 236';

/** Horizon, the 30° and 60° elevation rings, the cardinal ticks and letters. */
function DomeFrame() {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <g className="dome-frame">
      <circle className="dome-horizon" r={R} />
      <circle className="dome-ring" r={domeRadius(60, R)} />
      <circle className="dome-ring" r={domeRadius(30, R)} />
      <line className="dome-cross" x1={-R} y1={0} x2={R} y2={0} />
      <line className="dome-cross" x1={0} y1={-R} x2={0} y2={R} />
      {ticks.map((az) => {
        const long = az % 30 === 0;
        const a = (az * Math.PI) / 180;
        const r0 = long ? R + 2 : R + 2;
        const r1 = long ? R + 8 : R + 4.5;
        return (
          <line
            key={az}
            className={long ? 'dome-tick dome-tick-long' : 'dome-tick'}
            x1={r0 * Math.sin(a)}
            y1={-r0 * Math.cos(a)}
            x2={r1 * Math.sin(a)}
            y2={-r1 * Math.cos(a)}
          />
        );
      })}
      <text className="dome-cardinal" x={0} y={-R - 11}>
        N
      </text>
      <text className="dome-cardinal" x={R + 12} y={0}>
        E
      </text>
      <text className="dome-cardinal" x={0} y={R + 12}>
        S
      </text>
      <text className="dome-cardinal" x={-R - 12} y={0}>
        W
      </text>
      <text className="dome-label" x={3} y={-domeRadius(60, R) - 2}>
        30°
      </text>
      <text className="dome-label" x={3} y={-domeRadius(30, R) - 2}>
        60°
      </text>
    </g>
  );
}

/**
 * The home hero: the seven catalog entries as ghost lights drifting on faint orbits. The motion is
 * decorative, not a prediction. An entry with a tumble period breathes at that period (LES-1, 4 s).
 * Story-only entries are drawn in brass.
 */
export function GhostSky({ entries }: { entries: readonly CatalogEntry[] }) {
  return (
    <svg className="dome dome-hero" viewBox={VIEW} role="img" aria-label="zombieSatellite">
      <defs>
        <radialGradient id="dome-glow" cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#26365c" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#111a2e" stopOpacity="0.25" />
          <stop offset="1" stopColor="#05070d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={R} fill="url(#dome-glow)" />
      <DomeFrame />
      {entries.map((entry, i) => {
        const rx = 28 + i * 10;
        const ry = rx * (0.34 + (i % 3) * 0.08);
        const tilt = -35 + i * 23;
        const duration = 70 + i * 19;
        const path = `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${-rx} 0 A ${rx} ${ry} 0 1 1 ${rx} 0`;
        const tumble = entry.playable ? entry.beacon.tumblePeriodS : null;
        const kind = entry.playable ? 'ghost' : 'ghost ghost-story';
        return (
          <g key={entry.noradId} transform={`rotate(${tilt})`}>
            <path className={entry.playable ? 'ghost-orbit' : 'ghost-orbit ghost-orbit-story'} d={path} />
            <g className={kind}>
              <animateMotion dur={`${duration}s`} begin={`-${(i * 37) % duration}s`} repeatCount="indefinite" path={path} rotate="0" />
              <g transform={`rotate(${-tilt})`}>
                <circle
                  className={tumble === null ? 'ghost-halo' : 'ghost-halo ghost-breathing'}
                  r={7}
                  style={tumble === null ? undefined : { animationDuration: `${tumble}s` }}
                />
                <circle className="ghost-core" r={1.9} />
                <text className="ghost-name" x={4.5} y={-4}>
                  {entry.name}
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The pass dome under the camera frame: the satellite at its computed azimuth and elevation, the
 * lock tolerance as a dashed ring around it, and the phone's aim as a reticle when it is known.
 * The target azimuth is calibrated with the offset, as the lock evaluates it.
 */
export function PassDome({
  target,
  aim,
  locked,
  offsetDeg,
}: {
  target: { readonly azimuthDeg: number; readonly elevationDeg: number } | null;
  aim: { readonly headingDeg: number; readonly pitchDeg: number } | null;
  locked: boolean;
  offsetDeg: number;
}) {
  const sat =
    target === null ? null : domePoint(effectiveAzimuthDeg(target.azimuthDeg, offsetDeg), target.elevationDeg, R);
  const reticle = aim === null ? null : domePoint(aim.headingDeg, Math.max(aim.pitchDeg, 0), R);
  return (
    <svg className={locked ? 'dome dome-pass dome-locked' : 'dome dome-pass'} viewBox={VIEW} role="img" aria-label="Sky dome">
      <circle className="dome-floor" r={R} />
      <DomeFrame />
      {sat === null ? null : (
        <g transform={`translate(${sat.x} ${sat.y})`}>
          <circle className="pass-ring" r={domeRadius(LOCK_TOLERANCE_DEG, R)} />
          <circle className="pass-halo" r={9} />
          <circle className="pass-sat" r={2.6} />
        </g>
      )}
      {reticle === null ? null : (
        <g className="pass-reticle" transform={`translate(${reticle.x} ${reticle.y})`}>
          <circle r={5.5} />
          <line x1={-11} y1={0} x2={-7} y2={0} />
          <line x1={7} y1={0} x2={11} y2={0} />
          <line x1={0} y1={-11} x2={0} y2={-7} />
          <line x1={0} y1={7} x2={0} y2={11} />
        </g>
      )}
    </svg>
  );
}