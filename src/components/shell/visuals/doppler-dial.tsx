// Doppler dial visual (S6 task 7C). Presentational only: a receiver-style tuning scale whose needle
// shows the computed Doppler shift. Positive (approaching) to the right. The scale spans ±6 kHz and
// the needle stops at its ends; the exact figure is printed under it.
import { formatDopplerReadout } from '../../../lib/session/index';
import type { DopplerReadout } from '../../../lib/session/index';

const R = 90;
const SPAN_KHZ = 6;

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
}

function angleOf(shiftKhz: number): number {
  return (Math.max(-SPAN_KHZ, Math.min(SPAN_KHZ, shiftKhz)) / SPAN_KHZ) * 90;
}

export function DopplerDial({ readout, caption }: { readout: DopplerReadout | null; caption: string }) {
  const shift = readout !== null && readout.kind === 'shift' ? readout.shiftKhz : null;
  const ticks = Array.from({ length: SPAN_KHZ * 4 + 1 }, (_, i) => -SPAN_KHZ + i * 0.5);
  const needle = shift === null ? null : polar(angleOf(shift), R - 10);
  const arcEnd = shift === null ? null : polar(angleOf(shift), R);
  const sweep = shift !== null && shift >= 0 ? 1 : 0;
  return (
    <figure className="dial">
      <svg viewBox="-104 -104 208 122" role="img" aria-label={readout === null ? caption : formatDopplerReadout(readout)}>
        <path className="dial-arc" d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`} />
        {ticks.map((k) => {
          const major = Number.isInteger(k);
          const strong = k % 3 === 0;
          const a = polar(angleOf(k), R + 3);
          const b = polar(angleOf(k), R + (strong ? 11 : major ? 8 : 5.5));
          return <line key={k} className={strong ? 'dial-tick dial-tick-strong' : 'dial-tick'} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {[-6, -3, 0, 3, 6].map((k) => {
          const p = polar(angleOf(k), R + 19);
          return (
            <text key={k} className="dial-number" x={p.x} y={p.y}>
              {k > 0 ? `+${k}` : k < 0 ? `\u2212${-k}` : '0'}
            </text>
          );
        })}
        {arcEnd === null ? null : (
          <path className="dial-sweep" d={`M 0 ${-R} A ${R} ${R} 0 0 ${sweep} ${arcEnd.x} ${arcEnd.y}`} />
        )}
        {needle === null ? null : <line className="dial-needle" x1={0} y1={0} x2={needle.x} y2={needle.y} />}
        <circle className="dial-hub" r={3.2} />
        <text className="dial-unit" x={0} y={14}>
          kHz
        </text>
      </svg>
      <figcaption>
        <span className="dial-value">{readout === null ? '—' : formatDopplerReadout(readout)}</span>
        <span className="dial-caption">{caption}</span>
      </figcaption>
    </figure>
  );
}