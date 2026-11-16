import type { PointerEventHandler } from 'react';
import { FIELD_COPY } from '../../lib/field/index';
import type { IlluminationProfile, SkyTrack } from '../../lib/field/index';
import { LOCK_TOLERANCE_DEG } from '../../lib/pointing/index';
import { domePoint, domeRadius } from '../../lib/shell/index';
import { SkyTrackLayer } from '../field/visuals/sky-track';
import { DOME_RADIUS, DOME_VIEWBOX, DomeFrame } from '../shell/visuals/sky-dome';

const R = DOME_RADIUS;

interface Direction {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

export interface RadarPanelProps {
  readonly satellite: Direction | null;
  readonly path: SkyTrack | null;
  readonly passMarks: { readonly aos: Direction; readonly peak: Direction; readonly los: Direction } | null;
  readonly reticle: { readonly headingDeg: number; readonly pitchDeg: number } | null;
  readonly locked: boolean;
  readonly sunlitOnly: boolean;
  readonly profile: IlluminationProfile | null;
  readonly sweep: boolean;
  readonly emptyText: string | null;
  readonly onPointerDown?: PointerEventHandler<SVGSVGElement>;
  readonly onPointerMove?: PointerEventHandler<SVGSVGElement>;
  readonly onPointerUp?: PointerEventHandler<SVGSVGElement>;
}

function at(d: Direction) {
  return domePoint(d.azimuthDeg, Math.max(d.elevationDeg, 0), R);
}

export function RadarPanel({
  satellite,
  path,
  passMarks,
  reticle,
  locked,
  sunlitOnly,
  profile,
  sweep,
  emptyText,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: RadarPanelProps) {
  const sat = satellite === null ? null : at(satellite);
  const ret = reticle === null ? null : domePoint(reticle.headingDeg, Math.max(reticle.pitchDeg, 0), R);
  const marks =
    passMarks === null
      ? []
      : [
          { key: 'aos', p: at(passMarks.aos), cls: 'track-mark' },
          { key: 'peak', p: at(passMarks.peak), cls: 'track-culm' },
          { key: 'los', p: at(passMarks.los), cls: 'track-mark' },
        ];
  const empty = sat === null && path === null;
  const cls = ['dome', 'dome-pass', 'radar', locked ? 'dome-locked' : '', sunlitOnly ? 'radar-sunlit-only' : '']
    .filter((c) => c !== '')
    .join(' ');
  return (
    <svg
      className={cls}
      viewBox={DOME_VIEWBOX}
      role="img"
      aria-label={FIELD_COPY.skyTrackLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <circle className="dome-floor" r={R} />
      <DomeFrame />
      {sweep ? (
        <g className="radar-sweep">
          <path className="radar-wedge" d={`M 0 0 L 0 ${-R} A ${R} ${R} 0 0 0 ${-R * 0.5} ${-R * 0.866} Z`} />
          <line className="radar-line" x1={0} y1={0} x2={0} y2={-R} />
        </g>
      ) : null}
      {path === null ? null : <SkyTrackLayer track={path} profile={profile} />}
      {marks.map((m) =>
        m.p === null ? null : <circle key={m.key} className={m.cls} cx={m.p.x} cy={m.p.y} r={2.2} />,
      )}
      {sat === null ? null : (
        <g transform={`translate(${sat.x} ${sat.y})`}>
          <circle className="pass-ring" r={domeRadius(LOCK_TOLERANCE_DEG, R)} />
          <circle className="pass-halo" r={9} />
          <circle className="pass-sat" r={2.6} />
        </g>
      )}
      {ret === null ? null : (
        <g className="pass-reticle" transform={`translate(${ret.x} ${ret.y})`}>
          <circle r={5.5} />
          <line x1={-11} y1={0} x2={-7} y2={0} />
          <line x1={7} y1={0} x2={11} y2={0} />
          <line x1={0} y1={-11} x2={0} y2={-7} />
          <line x1={0} y1={7} x2={0} y2={11} />
        </g>
      )}
      {empty && emptyText !== null ? (
        <text className="radar-empty" x={0} y={0} textAnchor="middle">
          {emptyText}
        </text>
      ) : null}
    </svg>
  );
}
