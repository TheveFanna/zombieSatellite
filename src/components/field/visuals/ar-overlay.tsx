import type { ArPiece } from '../../../lib/field/index';

export interface ArOverlayModel {
  readonly width: number;
  readonly height: number;
  /** Satellite marker in NDC, or null when behind or out of the drawing limit. */
  readonly marker: { readonly ndcX: number; readonly ndcY: number } | null;
  readonly locked: boolean;
  readonly ring: readonly ArPiece[];
  readonly arc: readonly ArPiece[];
  readonly ticks: ReadonlyArray<{ label: string; ndcX: number; ndcY: number }>;
  readonly horizon: readonly ArPiece[];
  readonly cardinals: ReadonlyArray<{ label: string; ndcX: number; ndcY: number }>;
  readonly edge: { readonly angleRad: number; readonly ndcX: number; readonly ndcY: number } | null;
}

const SUN_COLOR = '#7CFF9B';
const SHADOW_COLOR = '#C9A24B';
const LOCK_COLOR = '#2ea043';
const PLAIN_COLOR = '#f0f6fc';

export function ArOverlay({ model }: { model: ArOverlayModel }) {
  const { width, height } = model;
  const px = (ndcX: number): number => ((ndcX + 1) / 2) * width;
  const py = (ndcY: number): number => ((1 - ndcY) / 2) * height;
  const path = (piece: ArPiece): string =>
    piece.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.ndcX).toFixed(1)} ${py(p.ndcY).toFixed(1)}`).join(' ');
  const ringColor = model.locked ? LOCK_COLOR : PLAIN_COLOR;

  return (
    <svg
      className="ar-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {model.horizon.map((piece, i) => (
        <path key={`h${i}`} className="ar-horizon" d={path(piece)} fill="none" stroke={PLAIN_COLOR} strokeOpacity={0.5} strokeWidth={1} />
      ))}
      {model.cardinals.map((c) => (
        <text key={c.label} x={px(c.ndcX)} y={py(c.ndcY) - 6} fill={PLAIN_COLOR} fontSize={14} textAnchor="middle">
          {c.label}
        </text>
      ))}
      {model.arc.map((piece, i) => (
        <path
          key={`a${i}`}
          className="ar-arc"
          d={path(piece)}
          fill="none"
          stroke={piece.inShadow ? SHADOW_COLOR : SUN_COLOR}
          strokeWidth={2}
          strokeDasharray={piece.belowHorizon ? '6 5' : undefined}
        />
      ))}
      {model.ticks.map((t) => (
        <g key={t.label}>
          <circle cx={px(t.ndcX)} cy={py(t.ndcY)} r={1.5} fill={SUN_COLOR} />
          <text x={px(t.ndcX) + 4} y={py(t.ndcY) - 3} fill={SUN_COLOR} fontSize={9}>
            {t.label}
          </text>
        </g>
      ))}
      {model.ring.map((piece, i) => (
        <path key={`r${i}`} className="ar-ring" d={path(piece)} fill="none" stroke={ringColor} strokeWidth={2} />
      ))}
      {model.marker !== null ? (
        <g className="ar-current">
          <circle cx={px(model.marker.ndcX)} cy={py(model.marker.ndcY)} r={10} fill={ringColor} fillOpacity={0.35} />
          <circle cx={px(model.marker.ndcX)} cy={py(model.marker.ndcY)} r={5} fill={ringColor} stroke="#0d1117" strokeWidth={1} />
        </g>
      ) : null}
      {model.edge !== null ? (
        <g
          className="ar-edge"
          transform={`translate(${px(model.edge.ndcX).toFixed(1)} ${py(model.edge.ndcY).toFixed(1)}) rotate(${(
            (-model.edge.angleRad * 180) /
            Math.PI
          ).toFixed(1)})`}
        >
          <path d="M-10 -8 L10 0 L-10 8 Z" fill={ringColor} stroke="#0d1117" strokeWidth={1} />
        </g>
      ) : null}
    </svg>
  );
}
