// AR math example cases (design "AR math"): basis looking north, level; every expected value is analytic.
import { describe, expect, it } from 'vitest';
import { cameraBasisFromDrag, projectMarker, sceneDirection } from '../../src/lib/pointing/index';
import {
  arMarker,
  cardinalMarks,
  edgeArrow,
  horizonLine,
  lockRing,
  projectAr,
  projectTrackArc,
  arTrackSegments,
} from '../../src/lib/field/index';

const basis = cameraBasisFromDrag({ headingDeg: 0, pitchDeg: 0 });
const tanHalf = (deg: number) => Math.tan((deg * Math.PI) / 360);
const tanDeg = (deg: number) => Math.tan((deg * Math.PI) / 180);

describe('AR math', () => {
  it('1. projectAr at 75° equals projectMarker for five targets', () => {
    const targets = [
      sceneDirection(0, 0),
      sceneDirection(10, 5),
      sceneDirection(-20, 30),
      sceneDirection(35, -10),
      sceneDirection(180, 20),
    ];
    for (const t of targets) {
      expect(projectAr(t, basis, 0.5, 75)).toEqual(projectMarker(t, basis, 0.5));
    }
  });

  it('2. at 60° and aspect 0.5, azimuth 10° elevation 0° gives the analytic NDC', () => {
    const m = arMarker(10, 0, 0, basis, 0.5, 60);
    if (!m.inFront) throw new Error('expected in front');
    expect(m.ndcX).toBeCloseTo(tanDeg(10) / (tanHalf(60) * 0.5), 9);
    expect(m.ndcY).toBeCloseTo(0, 9);
  });

  it('3. a behind target is not in front and the track arc drops the behind sample', () => {
    expect(arMarker(180, 0, 0, basis, 0.5, 75).inFront).toBe(false);
    const pieces = projectTrackArc(
      [
        {
          inShadow: false,
          samples: [
            { ok: true, tMs: 0, azimuthDeg: 0, elevationDeg: 20 },
            { ok: true, tMs: 1000, azimuthDeg: 180, elevationDeg: 20 },
          ],
        },
      ],
      0,
      basis,
      0.5,
      75,
    );
    expect(pieces).toHaveLength(1);
    expect(pieces[0].points).toHaveLength(1);
  });

  it('4. horizon line crosses the centre row; only N is a cardinal mark at the centre', () => {
    const pieces = horizonLine(0, basis, 0.5, 75);
    const north = pieces.flatMap((p) => p.points).find((p) => Math.abs(p.ndcX) < 1e-9);
    expect(north).toBeDefined();
    expect(north!.ndcY).toBeCloseTo(0, 9);
    const marks = cardinalMarks(0, basis, 0.5, 75);
    expect(marks).toHaveLength(1);
    expect(marks[0].label).toBe('N');
    expect(marks[0].ndcX).toBeCloseTo(0, 9);
    expect(marks[0].ndcY).toBeCloseTo(0, 9);
  });

  it('5. lock ring top point has ndcY = tan 10° / tan(fov/2) at 75° and 60°', () => {
    for (const fov of [75, 60]) {
      const ys = lockRing(0, 0, 0, basis, 0.5, fov).flatMap((p) => p.points.map((q) => q.ndcY));
      expect(Math.max(...ys)).toBeCloseTo(tanDeg(10) / tanHalf(fov), 9);
    }
  });

  it('6. edge arrow points right for azimuth 40° and up for elevation 70°', () => {
    const right = edgeArrow(40, 0, 0, basis, 0.5, 75);
    expect(right).not.toBeNull();
    expect(right!.angleRad).toBeCloseTo(0, 9);
    expect(right!.ndcX).toBeCloseTo(0.9, 9);
    expect(right!.ndcY).toBeCloseTo(0, 9);
    const up = edgeArrow(0, 70, 0, basis, 0.5, 75);
    expect(up).not.toBeNull();
    expect(up!.angleRad).toBeCloseTo(Math.PI / 2, 9);
  });
  it('7. arTrackSegments splits at the horizon, lead and tail included, and the flag reaches the pieces', () => {
    const s = (tMs: number, elevationDeg: number) => ({ ok: true as const, tMs, azimuthDeg: 0, elevationDeg });
    const track = {
      samples: [s(2, 0), s(3, 10), s(4, 0)],
      lead: [s(0, -10), s(1, -5)],
      tail: [s(5, -5)],
      tickMs: [],
      aos: s(2, 0),
      tca: s(3, 10),
      los: s(4, 0),
    };
    const segs = arTrackSegments(track, { kind: 'sunlit' });
    expect(segs.map((g) => g.belowHorizon)).toEqual([true, false, true]);
    expect(segs[0].samples.map((x) => x.tMs)).toEqual([0, 1]);
    expect(segs[1].samples.map((x) => x.tMs)).toEqual([1, 2, 3, 4]);
    expect(segs[2].samples.map((x) => x.tMs)).toEqual([4, 5]);
    const pieces = projectTrackArc(segs, 0, basis, 0.5, 75);
    expect(pieces.map((p) => p.belowHorizon)).toEqual([true, false, true]);
  });
});
