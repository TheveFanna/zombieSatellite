// SVG layer of the AR tab (S9 design "Layout of the AR_Tab"). Presentational: a model in, SVG out.
import type { ArPiece } from '../../lib/field/index';

export interface ArSceneModel {
  readonly width: number;
  readonly height: number;
  readonly ring: readonly ArPiece[];
  readonly ticks: ReadonlyArray<{ label: string; ndcX: number; ndcY: number }>;
  readonly horizon: readonly ArPiece[];
  readonly cardinals: ReadonlyArray<{ label: string; ndcX: number; ndcY: number }>;
  readonly stars: ReadonlyArray<{ ndcX: number; ndcY: number; magnitude: number }>;
  /** 0 with the camera picture at full opacity, 1 with the Night_Sky only. */
  readonly nightness: number;
  /** The Live_Target dot, or null while its direction is not in front of the camera. */
  readonly marker: { readonly ndcX: number; readonly ndcY: number; readonly below: boolean } | null;
  /** The Lock_Halo pieces, non-empty only while locked. */
  readonly halo: readonly ArPiece[];
  /** The Center_Guide, or null while locked. */
  readonly guide: { readonly angleRad: number; readonly behind: boolean } | null;
}

const RING_COLOR = '#7CFF9B';
const PLAIN_COLOR = '#f0f6fc';
const BEHIND_COLOR = '#e3a982';

export function ArScene({ model }: { model: ArSceneModel }) {
  const { width, height } = model;
  const px = (ndcX: number): number => ((ndcX + 1) / 2) * width;
  const py = (ndcY: number): number => ((1 - ndcY) / 2) * height;
  const path = (piece: ArPiece): string =>
    piece.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.ndcX).toFixed(1)} ${py(p.ndcY).toFixed(1)}`).join(' ');
  return (
    <svg
      className="ar-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {model.stars.map((s, i) => (
        <circle
          key={`s${i}`}
          cx={px(s.ndcX)}
          cy={py(s.ndcY)}
          r={0.6 + 1.2 * s.magnitude}
          fill={PLAIN_COLOR}
          fillOpacity={s.magnitude * model.nightness}
        />
      ))}
      {model.horizon.map((piece, i) => (
        <path key={`h${i}`} d={path(piece)} fill="none" stroke={PLAIN_COLOR} strokeOpacity={0.5} strokeWidth={1} />
      ))}
      {model.cardinals.map((c) => (
        <text key={c.label} x={px(c.ndcX)} y={py(c.ndcY) - 6} fill={PLAIN_COLOR} fontSize={14} textAnchor="middle">
          {c.label}
        </text>
      ))}
      {model.ring.map((piece, i) => (
        <path
          key={`r${i}`}
          d={path(piece)}
          fill="none"
          stroke={RING_COLOR}
          strokeWidth={2}
          strokeOpacity={piece.belowHorizon ? 0.7 : 1}
          strokeDasharray={piece.belowHorizon ? '6 5' : undefined}
        />
      ))}
      {model.ticks.map((t) => (
        <g key={t.label}>
          <circle cx={px(t.ndcX)} cy={py(t.ndcY)} r={1.5} fill={RING_COLOR} />
          <text x={px(t.ndcX) + 4} y={py(t.ndcY) - 3} fill={RING_COLOR} fontSize={9}>
            {t.label}
          </text>
        </g>
      ))}
      {model.halo.map((piece, i) => (
        <path key={`o${i}`} d={path(piece)} fill="none" stroke={PLAIN_COLOR} strokeOpacity={0.35} strokeWidth={2} />
      ))}
      {model.marker !== null ? (
        <g>
          <circle
            cx={px(model.marker.ndcX)}
            cy={py(model.marker.ndcY)}
            r={10}
            fill={model.marker.below ? 'none' : PLAIN_COLOR}
            fillOpacity={0.35}
            stroke={PLAIN_COLOR}
            strokeOpacity={model.marker.below ? 0.8 : 0}
            strokeWidth={1.5}
            strokeDasharray={model.marker.below ? '3 3' : undefined}
          />
          <circle cx={px(model.marker.ndcX)} cy={py(model.marker.ndcY)} r={5} fill={PLAIN_COLOR} stroke="#0d1117" strokeWidth={1} />
        </g>
      ) : null}
      {model.guide !== null ? (
        <g transform={`translate(${width / 2} ${height / 2}) rotate(${((-model.guide.angleRad * 180) / Math.PI).toFixed(1)})`}>
          <path
            d="M-26 -11 L28 0 L-26 11 L-15 0 Z"
            fill={model.guide.behind ? BEHIND_COLOR : PLAIN_COLOR}
            fillOpacity={0.9}
            stroke="#0d1117"
            strokeWidth={1.5}
          />
        </g>
      ) : null}
    </svg>
  );
}