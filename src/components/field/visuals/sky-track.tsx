// Sky_Track on the S6 dome (design.md, "Sky track"). Presentational: props in, SVG out.
import { FIELD_COPY, tickLabel, trackSegments } from '../../../lib/field/index';
import type { IlluminationProfile, SkySample, SkyTrack } from '../../../lib/field/index';
import type { Pass } from '../../../lib/orbit/index';
import { domePoint } from '../../../lib/shell/index';
import { DOME_RADIUS, DOME_VIEWBOX, DomeFrame } from '../../shell/visuals/sky-dome';

const R = DOME_RADIUS;

function pointOf(s: { azimuthDeg: number; elevationDeg: number }) {
  return domePoint(s.azimuthDeg, Math.max(s.elevationDeg, 0), R);
}

export function SkyTrackView({
  track,
  profile,
  pass,
  target,
  truncatedStart,
  truncatedEnd,
}: {
  track: SkyTrack;
  profile: IlluminationProfile | null;
  pass: Pass;
  target: { readonly azimuthDeg: number; readonly elevationDeg: number } | null;
  truncatedStart: boolean;
  truncatedEnd: boolean;
}) {
  const segments =
    profile === null
      ? [{ inShadow: false, samples: track.samples.filter((s): s is Extract<SkySample, { ok: true }> => s.ok) }]
      : trackSegments(track, profile);
  const aos = track.aos.ok ? track.aos : null;
  const los = track.los.ok ? track.los : null;
  const tca = track.tca.ok ? track.tca : null;
  const aosPt = aos === null ? null : pointOf(aos);
  const losPt = los === null ? null : pointOf(los);
  const tcaPt = tca === null ? null : pointOf(tca);
  const cur = target === null ? null : pointOf(target);
  return (
    <svg className="dome dome-pass dome-track" viewBox={DOME_VIEWBOX} role="img" aria-label={FIELD_COPY.skyTrackLabel}>
      <circle className="dome-floor" r={R} />
      <DomeFrame />
      {segments.map((seg, i) =>
        seg.samples.length < 2 ? null : (
          <polyline
            key={i}
            className={seg.inShadow ? 'track-shadow' : 'track-sun'}
            points={seg.samples
              .flatMap((s) => {
                const q = pointOf(s);
                return q === null ? [] : [`${q.x.toFixed(2)},${q.y.toFixed(2)}`];
              })
              .join(' ')}
          />
        ),
      )}
      {track.tickMs.map((t) => {
        const s = track.samples.find((x) => x.tMs === t);
        if (s === undefined || !s.ok) return null;
        const p = pointOf(s);
        if (p === null) return null;
        return (
          <g key={t}>
            <circle className="track-tick" cx={p.x} cy={p.y} r={1} />
            <text className="track-label" x={p.x + 2.5} y={p.y + 3}>
              {tickLabel(t)}
            </text>
          </g>
        );
      })}
      {aos !== null && aosPt !== null ? (
        <g>
          <circle className="track-mark" cx={aosPt.x} cy={aosPt.y} r={2.2} />
          <text className="track-label track-label-mark" x={aosPt.x} y={aosPt.y - 4}>
            {`${truncatedStart ? FIELD_COPY.nowLabel : FIELD_COPY.aosLabel} ${Math.round(aos.azimuthDeg)}°`}
          </text>
        </g>
      ) : null}
      {los !== null && losPt !== null ? (
        <g>
          <circle className="track-mark" cx={losPt.x} cy={losPt.y} r={2.2} />
          <text className="track-label track-label-mark" x={losPt.x} y={losPt.y + 8}>
            {`${truncatedEnd ? FIELD_COPY.windowEndLabel : FIELD_COPY.losLabel} ${Math.round(los.azimuthDeg)}°`}
          </text>
        </g>
      ) : null}
      {tca !== null && tcaPt !== null ? (
        <g>
          <circle className="track-culm" cx={tcaPt.x} cy={tcaPt.y} r={2} />
          <text className="track-label track-label-mark" x={tcaPt.x} y={tcaPt.y - 4}>
            {`${pass.maxElevationDeg.toFixed(0)}°`}
          </text>
        </g>
      ) : null}
      {cur === null ? null : (
        <g transform={`translate(${cur.x} ${cur.y})`}>
          <circle className="pass-halo" r={7} />
          <circle className="pass-sat" r={2.4} />
        </g>
      )}
    </svg>
  );
}
