// Feature: ar-pointing, Property 2: One heading-source decision
// **Validates: Requirements 2.1, 2.3**
import { describe, expect, it } from 'vitest';
import { selectHeadingSource } from '../../src/lib/pointing/index';
import type { OrientationSample } from '../../src/lib/pointing/index';

const base = { alpha: 10, beta: 20, gamma: 30 } as const;

describe('selectHeadingSource', () => {
  it('returns the single heading-source decision for each sample shape', () => {
    const row1: OrientationSample = { ...base, type: 'deviceorientationabsolute', absolute: false };
    const row2: OrientationSample = { ...base, type: 'deviceorientation', absolute: true };
    const row3: OrientationSample = { ...base, type: 'deviceorientationabsolute', absolute: false, webkitCompassHeading: 120 };
    const row4: OrientationSample = { ...base, type: 'deviceorientation', absolute: false, webkitCompassHeading: 120 };
    const row5: OrientationSample = { ...base, type: 'deviceorientation', absolute: false };

    expect(selectHeadingSource(row1)).toBe('absolute');
    expect(selectHeadingSource(row2)).toBe('absolute');
    expect(selectHeadingSource(row3)).toBe('absolute');
    expect(selectHeadingSource(row4)).toBe('compass');
    expect(selectHeadingSource(row5)).toBe('relative');
  });
});
