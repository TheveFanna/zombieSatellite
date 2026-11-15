// Feature: ar-pointing, Controller example checks: drag compass
// Validates: Requirements 12.6
import { describe, it } from 'vitest';
import { createDragCompass } from '../../src/components/pointing/drag-compass';
import { expectClose } from '../helpers/pointing-assert';

function makeActive() {
  const compass = createDragCompass({ onPose: () => {} });
  compass.activate();
  return compass;
}

describe('drag compass', () => {
  it('activate resets the pose to heading 0 and pitch 0', () => {
    const compass = makeActive();
    const pose = compass.getPose();
    expectClose(pose.headingDeg, 0, 1e-9);
    expectClose(pose.pitchDeg, 0, 1e-9);
  });

  it('dragging 40 px to the right gives heading 10', () => {
    const compass = makeActive();
    compass.pointerDown({ pointerId: 1, clientX: 100, clientY: 100 });
    compass.pointerMove({ pointerId: 1, clientX: 140, clientY: 100 });
    const pose = compass.getPose();
    expectClose(pose.headingDeg, 10, 1e-9);
    expectClose(pose.pitchDeg, 0, 1e-9);
  });

  it('dragging 40 px to the left from heading 0 wraps to heading 350', () => {
    const compass = makeActive();
    compass.pointerDown({ pointerId: 1, clientX: 100, clientY: 100 });
    compass.pointerMove({ pointerId: 1, clientX: 60, clientY: 100 });
    const pose = compass.getPose();
    expectClose(pose.headingDeg, 350, 1e-9);
    expectClose(pose.pitchDeg, 0, 1e-9);
  });

  it('dragging 400 px toward the top clamps the pitch at 90', () => {
    const compass = makeActive();
    compass.pointerDown({ pointerId: 1, clientX: 100, clientY: 500 });
    compass.pointerMove({ pointerId: 1, clientX: 100, clientY: 100 });
    const pose = compass.getPose();
    expectClose(pose.pitchDeg, 90, 1e-9);
    expectClose(pose.headingDeg, 0, 1e-9);
  });
});
