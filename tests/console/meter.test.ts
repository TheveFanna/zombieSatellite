// Feature: console-ui, Alignment meter: the pinned Meter_Level examples at tolerance 10
import { describe, expect, it } from 'vitest';
import { meterLevel } from '../../src/lib/console/index';

describe('meterLevel with tolerance 10', () => {
  it.each([
    [0, 1, 'locked'],
    [10, 1, 'locked'],
    [50, 0.5, 'far'],
    [180, 0, 'far'],
    [null, 0, 'unavailable'],
  ] as const)('maps %s to level %s, band %s', (error, level, band) => {
    expect(meterLevel(error, 10)).toEqual({ level, band });
  });
});
