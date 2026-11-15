// Feature: seance-session, Property 6: Jitter distribution
// **Validates: Requirements 4.6, 4.8**
import { describe, expect, it } from 'vitest';
import { drawJitter, offsetDirection } from '../../src/lib/session/index';
import { evaluateLock, sceneDirection } from '../../src/lib/pointing/index';
import { expectClose } from '../helpers/pointing-assert';

describe('Property 6: Jitter distribution', () => {
  it('wobble at u1 = 0 gives offset 1 and bearing 0', () => {
    const j = drawJitter(0, 0.5, 0);
    expectClose(j.offsetDeg, 1, 1e-9);
    expectClose(j.bearingDeg, 0, 1e-9);
  });

  it('wobble at u1 = 0.999 gives offset just below 8 and bearing 90', () => {
    const j = drawJitter(0.999, 0.5, 0.25);
    expectClose(j.offsetDeg, 1 + 7 * 0.999, 1e-9);
    expect(j.offsetDeg).toBeLessThan(8);
    expectClose(j.bearingDeg, 90, 1e-9);
  });

  it('excursion at u1 = 0 gives offset 12 and bearing 180', () => {
    const j = drawJitter(0, 0.05, 0.5);
    expectClose(j.offsetDeg, 12, 1e-9);
    expectClose(j.bearingDeg, 180, 1e-9);
  });

  it('excursion at u1 = 0.999 gives offset just below 20 and bearing 270', () => {
    const j = drawJitter(0.999, 0.05, 0.75);
    expectClose(j.offsetDeg, 12 + 8 * 0.999, 1e-9);
    expect(j.offsetDeg).toBeLessThan(20);
    expectClose(j.bearingDeg, 270, 1e-9);
  });

  const targets = [
    { azimuthDeg: 30, elevationDeg: 0 },
    { azimuthDeg: 200, elevationDeg: 80 },
  ];
  const jitters = [
    { name: 'wobble', jitter: drawJitter(0.999, 0.5, 0.25), locked: true },
    { name: 'excursion', jitter: drawJitter(0.999, 0.05, 0.75), locked: false },
  ];

  for (const target of targets) {
    for (const { name, jitter, locked } of jitters) {
      it(`${name} at azimuth ${target.azimuthDeg}, elevation ${target.elevationDeg} keeps its Pointing_Error and lock decision`, () => {
        const dir = offsetDirection(target, jitter);
        const lock = evaluateLock(sceneDirection(dir.azimuthDeg, dir.elevationDeg), target, 0);
        expectClose(lock.pointingErrorDeg, jitter.offsetDeg, 1e-6);
        expect(lock.locked).toBe(locked);
      });
    }
  }
});
