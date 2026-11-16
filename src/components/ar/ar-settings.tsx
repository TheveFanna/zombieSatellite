'use client';
// Settings_Sheet of the AR tab (S11 Requirement 6): orientation calibration, sensors, camera and observer.
import { ConsoleSheet } from '../console/console-sheet';
import { CALIBRATION_STEP_DEG } from '../../lib/pointing/index';

export interface ArSettingsProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCalibrate: (deltaDeg: number) => void;
  readonly sensorText: string;
  readonly cameraText: string;
  readonly observerText: string;
  readonly onRetryCamera: () => void;
  readonly onRetrySensors: () => void;
  readonly canRetrySensors: boolean;
}

export function ArSettings(props: ArSettingsProps) {
  const { open, onClose, onCalibrate, sensorText, cameraText, observerText, onRetryCamera, onRetrySensors, canRetrySensors } =
    props;
  return (
    <ConsoleSheet open={open} title="Settings" closeLabel="Close" onClose={onClose}>
      <section className="ar-set">
        <h3>Orientation</h3>
        <p>
          If the satellite marker sits to one side of the real satellite, turn the view by one step until the two agree.
          Each step is {CALIBRATION_STEP_DEG}°.
        </p>
        <div className="ar-set-row">
          <button type="button" onClick={() => onCalibrate(-CALIBRATION_STEP_DEG)} aria-label="Turn view counter-clockwise">
            ↺ {CALIBRATION_STEP_DEG}°
          </button>
          <button type="button" onClick={() => onCalibrate(CALIBRATION_STEP_DEG)} aria-label="Turn view clockwise">
            ↻ {CALIBRATION_STEP_DEG}°
          </button>
        </div>
      </section>
      <section className="ar-set">
        <h3>Sensors and camera</h3>
        <p>{sensorText}</p>
        <p>{cameraText}</p>
        <div className="ar-set-row">
          {canRetrySensors ? (
            <button type="button" onClick={onRetrySensors}>
              Allow motion sensors
            </button>
          ) : null}
          <button type="button" onClick={onRetryCamera}>
            Restart camera
          </button>
        </div>
      </section>
      <section className="ar-set">
        <h3>Observer</h3>
        <p>{observerText}</p>
      </section>
    </ConsoleSheet>
  );
}
