// Feature: shell-pwa-deploy, Testing Strategy item 6: marker placement in the Sky_View
// **Validates: Requirements 9.6, 9.7**
import { describe, expect, it } from 'vitest';
import { cameraBasisFromDrag } from '../../src/lib/pointing/index';
import { markerPlacement } from '../../src/lib/shell/index';

const basis = cameraBasisFromDrag({ headingDeg: 90, pitchDeg: 30 });

describe('markerPlacement', () => {
  it('puts a target straight ahead at the centre', () => {
    const placement = markerPlacement({ azimuthDeg: 90, elevationDeg: 30 }, 0, basis);
    expect(placement.kind).toBe('on-screen');
    if (placement.kind !== 'on-screen') return;
    expect(placement.leftPct).toBeCloseTo(50, 9);
    expect(placement.topPct).toBeCloseTo(50, 9);
  });

  it('reports a target behind the camera as out of view', () => {
    expect(markerPlacement({ azimuthDeg: 270, elevationDeg: -30 }, 0, basis)).toEqual({ kind: 'out-of-view' });
  });

  it('reports none without a basis', () => {
    expect(markerPlacement({ azimuthDeg: 90, elevationDeg: 30 }, 0, null)).toEqual({ kind: 'none' });
  });
});
