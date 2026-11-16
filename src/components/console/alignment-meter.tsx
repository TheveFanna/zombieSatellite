import { LOCK_TOLERANCE_DEG } from '../../lib/pointing/index';
import { meterLevel } from '../../lib/console/index';
import type { MeterBand } from '../../lib/console/index';
import { CONSOLE_COPY } from './copy';

export interface AlignmentMeterProps {
  readonly errorDeg: number | null;
  readonly locked: boolean;
  readonly behind: boolean;
}

const CENTER = 60;
const RADIUS = 50;
const SWEEP_DEG = 240;
const START_DEG = 150; // gauge starts at the lower left and runs clockwise over the top

const BAND_LABEL: Record<MeterBand, string> = {
  locked: CONSOLE_COPY.meterBandLocked,
  closing: CONSOLE_COPY.meterBandClosing,
  far: CONSOLE_COPY.meterBandFar,
  unavailable: CONSOLE_COPY.meterBandUnavailable,
};

function arcPoint(deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
}

const ARC_START = arcPoint(START_DEG);
const ARC_END = arcPoint(START_DEG + SWEEP_DEG);
const ARC_PATH = `M ${ARC_START.x.toFixed(2)} ${ARC_START.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 1 1 ${ARC_END.x.toFixed(2)} ${ARC_END.y.toFixed(2)}`;
const ARC_LENGTH = (2 * Math.PI * RADIUS * SWEEP_DEG) / 360;

export function AlignmentMeter({ errorDeg, locked, behind }: AlignmentMeterProps) {
  const measured = meterLevel(errorDeg, LOCK_TOLERANCE_DEG);
  const band: MeterBand = locked && measured.band !== 'unavailable' ? 'locked' : measured.band;
  const level = band === 'locked' ? 1 : measured.level;
  const lockTick = arcPoint(START_DEG + SWEEP_DEG);
  const readout = errorDeg === null || Number.isNaN(errorDeg) || errorDeg < 0 ? '–' : `${errorDeg.toFixed(1)}°`;

  return (
    <div className={`meter meter-${band}`} role="group" aria-label={CONSOLE_COPY.meterTitle}>
      <svg className="meter-svg" viewBox="0 0 120 100" aria-hidden="true">
        <path className="meter-track" d={ARC_PATH} fill="none" />
        <path
          className="meter-fill"
          d={ARC_PATH}
          fill="none"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={ARC_LENGTH * (1 - level)}
        />
        <circle className="meter-lock-tick" cx={lockTick.x} cy={lockTick.y} r="3" />
        <text className="meter-readout" x={CENTER} y="62" textAnchor="middle">
          {readout}
        </text>
      </svg>
      <p className="meter-band" aria-live="polite">
        {BAND_LABEL[band]}
        {behind ? ` · ${CONSOLE_COPY.meterBehind}` : ''}
      </p>
      <p className="meter-caption">{CONSOLE_COPY.meterCaption}</p>
    </div>
  );
}
