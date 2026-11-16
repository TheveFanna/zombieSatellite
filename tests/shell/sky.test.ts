// Feature: shell-pwa-deploy, task 7C: sky dome geometry
import { describe, expect, it } from 'vitest';
import { domePoint, domeRadius, passProfilePath } from '../../src/lib/shell/index';

describe('domePoint', () => {
  it('puts the zenith at the centre and the horizon on the rim, north up and east right', () => {
    const zenith = domePoint(123, 90, 100);
    expect(zenith?.x).toBeCloseTo(0, 9);
    expect(zenith?.y).toBeCloseTo(0, 9);
    const north = domePoint(0, 0, 100);
    expect(north?.x).toBeCloseTo(0, 9);
    expect(north?.y).toBeCloseTo(-100, 9);
    const east = domePoint(90, 30, 100);
    expect(east?.x).toBeCloseTo(66.666667, 5);
    expect(east?.y).toBeCloseTo(0, 9);
  });

  it('returns null below the horizon', () => {
    expect(domePoint(180, -1, 100)).toBeNull();
  });
});

describe('domeRadius and passProfilePath', () => {
  it('scales 10 degrees to a ninth of the radius', () => {
    expect(domeRadius(10, 90)).toBe(10);
  });

  it('draws a pass from the horizon through its peak back to the horizon', () => {
    expect(passProfilePath(0, 300_000, 600_000, 45, 200, 60)).toBe(
      'M 0 60 C 45 60 55 30 100 30 C 145 30 155 60 200 60',
    );
  });
});