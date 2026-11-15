import { describe, expect, it } from 'vitest';
import {
  cameraBasisFromSensor,
  headingPitch,
  normalizeScreenOrientationDeg,
} from '../../src/lib/pointing/index';
import type { SensorAttitude } from '../../src/lib/pointing/index';
import { expectClose, expectVec } from '../helpers/pointing-assert';

const TOL = 1e-9;

const rel = (alphaDeg: number, betaDeg: number, gammaDeg: number): SensorAttitude => ({
  source: 'relative',
  alphaDeg,
  betaDeg,
  gammaDeg,
});

const ROWS: ReadonlyArray<{ a: number; b: number; g: number; forward: [number, number, number] }> = [
  { a: 0, b: 90, g: 0, forward: [0, 0, -1] },
  { a: 90, b: 90, g: 0, forward: [-1, 0, 0] },
  { a: 180, b: 90, g: 0, forward: [0, 0, 1] },
  { a: 270, b: 90, g: 0, forward: [1, 0, 0] },
  { a: 0, b: 0, g: 0, forward: [0, -1, 0] },
];

describe('cameraBasisFromSensor', () => {
  // Feature: ar-pointing, Property 3: §4.5 forward baselines
  // **Validates: Requirements 5.4**
  it.each(ROWS)('forward baseline (α=$a, β=$b, γ=$g)', ({ a, b, g, forward }) => {
    expectVec(cameraBasisFromSensor(rel(a, b, g), 0, 0).forward, forward, TOL);
  });

  // Feature: ar-pointing, Property 4: Non-zero screen orientation
  // **Validates: Requirements 5.8**
  const sigmas = [90, 180, 270, normalizeScreenOrientationDeg(-90)];
  for (const sigma of sigmas) {
    it.each(ROWS)(`forward unchanged at σ=${sigma} (α=$a, β=$b, γ=$g)`, ({ a, b, g, forward }) => {
      expectVec(cameraBasisFromSensor(rel(a, b, g), sigma, 0).forward, forward, TOL);
    });
  }

  it('OQ-D3: (0, 90, 0) at σ=90 gives up = (1, 0, 0)', () => {
    expectVec(cameraBasisFromSensor(rel(0, 90, 0), 90, 0).up, [1, 0, 0], TOL);
  });

  // Feature: ar-pointing, Property 5: §4.5 UI conventions
  // **Validates: Requirements 5.9**
  it('headingPitch of the baseline forwards', () => {
    const hp = (a: number, b: number, g: number) =>
      headingPitch(cameraBasisFromSensor(rel(a, b, g), 0, 0).forward);

    expectClose(hp(90, 90, 0).headingDeg as number, 270, TOL);
    expectClose(hp(270, 90, 0).headingDeg as number, 90, TOL);
    const up = hp(0, 90, 0);
    expectClose(up.headingDeg as number, 0, TOL);
    expectClose(up.pitchDeg, 0, TOL);
    const down = hp(0, 0, 0);
    expect(down.headingDeg).toBeNull();
    expectClose(down.pitchDeg, -90, TOL);
  });

  // Feature: ar-pointing, Property 6: Compass with tilt
  // **Validates: Requirements 5.10**
  it('compass heading 45 with tilt β=120, γ=60', () => {
    const attitude: SensorAttitude = { source: 'compass', compassHeadingDeg: 45, betaDeg: 120, gammaDeg: 60 };
    const { forward } = cameraBasisFromSensor(attitude, 0, 0);
    expectVec(forward, [0.6846531968814576, 0.25, -0.6846531968814578], TOL);
    const hp = headingPitch(forward);
    expectClose(hp.headingDeg as number, 45, TOL);
    expectClose(hp.pitchDeg, 14.477512185929925, TOL);
  });
});
