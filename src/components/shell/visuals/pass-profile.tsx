// Pass profile visual (S6 task 7C). Presentational only: the schematic elevation over time of one
// predicted pass, from rise to set, with its peak marked. The numbers come from the Pass the picker
// already shows; the curve between them is a smooth sketch, not sampled data.
import type { Pass } from '../../../lib/orbit/index';
import { passProfilePath } from '../../../lib/shell/index';

const W = 280;
const H = 56;

export function PassProfile({ pass }: { pass: Pass }) {
  const span = pass.setMs - pass.riseMs;
  const share = span > 0 ? Math.min(Math.max((pass.peakMs - pass.riseMs) / span, 0), 1) : 0.5;
  const peakX = share * W;
  const peakY = H - (Math.min(Math.max(pass.maxElevationDeg, 0), 90) / 90) * H;
  const d = passProfilePath(pass.riseMs, pass.peakMs, pass.setMs, pass.maxElevationDeg, W, H);
  return (
    <svg className="profile" viewBox={`-4 -12 ${W + 8} ${H + 16}`} aria-hidden="true">
      <line className="profile-horizon" x1={-4} y1={H} x2={W + 4} y2={H} />
      <line className="profile-guide" x1={0} y1={H - H / 3} x2={W} y2={H - H / 3} />
      <line className="profile-guide" x1={0} y1={H - (2 * H) / 3} x2={W} y2={H - (2 * H) / 3} />
      <path className="profile-fill" d={`${d} Z`} />
      <path className="profile-line" d={d} />
      <line className="profile-drop" x1={peakX} y1={peakY} x2={peakX} y2={H} />
      <circle className="profile-peak" cx={peakX} cy={peakY} r={2.6} />
      <text className="profile-label" x={peakX} y={peakY - 5}>
        {`${Math.round(pass.maxElevationDeg)}°`}
      </text>
    </svg>
  );
}