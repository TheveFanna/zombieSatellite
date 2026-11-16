// AR tab (S9) core: example cases of design "Tests". Expected values are analytic or equal a landed function.
import { describe, expect, it } from 'vitest';
import { createSatrec, observeAt, parseTle } from '../../src/lib/orbit/index';
import type { Pass } from '../../src/lib/orbit/index';
import { cameraBasisFromDrag } from '../../src/lib/pointing/index';
import {
  blendDirection,
  blendRings,
  buildOrbitRing,
  guideAngleRad,
  hourTicks,
  ringSegments,
  starField,
  visibilityWindows,
} from '../../src/lib/field/index';
import type { OrbitRing } from '../../src/lib/field/index';
import { ISS_BASELINE, ISS_AT_1123Z, REFERENCE_OBSERVER } from '../helpers/baseline';

const tle = parseTle(ISS_BASELINE.text);
const satrec = createSatrec(tle);
const basis = cameraBasisFromDrag({ headingDeg: 0, pitchDeg: 0 });

describe('AR tab core', () => {
  it('1. the ring starts at observeAt of the anchor, has 181 samples and is near-closed for a LEO satellite', () => {
    const ring = buildOrbitRing(satrec, tle.MEAN_MOTION, ISS_AT_1123Z.timeMs, REFERENCE_OBSERVER);
    expect(ring).not.toBeNull();
    const first = ring!.samples[0];
    const last = ring!.samples[ring!.samples.length - 1];
    expect(ring!.samples).toHaveLength(181);
    if (!first.ok || !last.ok) throw new Error('expected ok samples');
    const obs = observeAt(satrec, ISS_AT_1123Z.timeMs, REFERENCE_OBSERVER);
    if (!obs.ok) throw new Error('expected an observation');
    expect(first.azimuthDeg).toBeCloseTo(obs.lookAngles.azimuthDeg, 2);
    expect(first.elevationDeg).toBeCloseTo(obs.lookAngles.elevationDeg, 2);
    // Frozen Earth: only the SGP4 drift of one revolution remains between the first and the last sample.
    const dEl = Math.abs(last.elevationDeg - first.elevationDeg);
    const dAz = Math.abs(((last.azimuthDeg - first.azimuthDeg + 540) % 360) - 180);
    expect(dEl).toBeLessThan(3);
    expect(dAz).toBeLessThan(3);
  });

  it('2. the ring is null for a mean motion of 0 and of NaN', () => {
    expect(buildOrbitRing(satrec, 0, ISS_AT_1123Z.timeMs, REFERENCE_OBSERVER)).toBeNull();
    expect(buildOrbitRing(satrec, Number.NaN, ISS_AT_1123Z.timeMs, REFERENCE_OBSERVER)).toBeNull();
  });

  it('3. ringSegments splits at the horizon and shares the boundary sample', () => {
    const s = (tMs: number, elevationDeg: number) => ({ ok: true as const, tMs, azimuthDeg: 0, elevationDeg });
    const ring: OrbitRing = { anchorMs: 0, periodMs: 4, samples: [s(0, -5), s(1, 5), s(2, 10), s(3, -3)] };
    const segs = ringSegments(ring);
    expect(segs.map((g) => g.belowHorizon)).toEqual([true, false, true]);
    expect(segs[1].samples.map((x) => x.tMs)).toEqual([0, 1, 2]);
    expect(segs[0].samples.map((x) => x.tMs)).toEqual([0]);
    expect(segs[2].samples.map((x) => x.tMs)).toEqual([2, 3]);
  });

  it('4. blendDirection returns the inputs at w=0 and w=1 and the midpoint of 0° and 90° at 45°; blendRings at 0 equals from', () => {
    const a = { azimuthDeg: 0, elevationDeg: 0 };
    const b = { azimuthDeg: 90, elevationDeg: 0 };
    expect(blendDirection(a, b, 0).azimuthDeg).toBeCloseTo(0, 9);
    expect(blendDirection(a, b, 1).azimuthDeg).toBeCloseTo(90, 9);
    const mid = blendDirection(a, b, 0.5);
    expect(mid.azimuthDeg).toBeCloseTo(45, 9);
    expect(mid.elevationDeg).toBeCloseTo(0, 9);
    const s = (tMs: number, azimuthDeg: number) => ({ ok: true as const, tMs, azimuthDeg, elevationDeg: 10 });
    const from: OrbitRing = { anchorMs: 0, periodMs: 2, samples: [s(0, 10), s(1, 20)] };
    const to: OrbitRing = { anchorMs: 1, periodMs: 2, samples: [s(1, 80), s(2, 90)] };
    const zero = blendRings(from, to, 0);
    for (let i = 0; i < 2; i += 1) {
      const z = zero.samples[i];
      const f = from.samples[i];
      if (!z.ok || !f.ok) throw new Error('expected ok');
      expect(z.azimuthDeg).toBeCloseTo(f.azimuthDeg, 9);
    }
  });

  it('5. guideAngleRad: azimuth 40° gives 0, elevation 70° gives π/2, exactly behind gives 0', () => {
    expect(guideAngleRad(40, 0, 0, basis)).toBeCloseTo(0, 9);
    expect(guideAngleRad(0, 70, 0, basis)).toBeCloseTo(Math.PI / 2, 9);
    expect(guideAngleRad(180, 0, 0, basis)).toBe(0);
  });

  it('6. starField is deterministic and inside the angle ranges', () => {
    const a = starField(300, 20260101);
    expect(a).toEqual(starField(300, 20260101));
    expect(a).toHaveLength(300);
    for (const s of a) {
      expect(s.elevationDeg).toBeGreaterThanOrEqual(-90);
      expect(s.elevationDeg).toBeLessThanOrEqual(90);
      expect(s.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(s.azimuthDeg).toBeLessThan(360);
    }
  });

  it('7. visibilityWindows clips, drops and flags; hourTicks lists the UTC multiples of 6 h', () => {
    const now = Date.parse('2026-11-09T11:23:00Z');
    const min = 60_000;
    const day = 86_400_000;
    const pass = (riseMs: number, setMs: number): Pass => ({
      riseMs,
      peakMs: (riseMs + setMs) / 2,
      setMs,
      maxElevationDeg: 40,
      durationMin: (setMs - riseMs) / min,
      startTruncated: false,
      endTruncated: false,
    });
    const w = visibilityWindows(
      [pass(now - 10 * min, now + 10 * min), pass(now + day - 5 * min, now + day + 5 * min), pass(now + 30 * 3_600_000, now + 31 * 3_600_000)],
      now,
    );
    expect(w).toHaveLength(2);
    expect(w[0].startFrac).toBe(0);
    expect(w[0].running).toBe(true);
    expect(w[1].endFrac).toBe(1);
    const ticks = hourTicks(now);
    expect(ticks.map((t) => t.label)).toEqual(['12Z', '18Z', '00Z', '06Z']);
    expect(ticks[0].frac).toBeCloseTo((37 * min) / day, 9);
  });
});
