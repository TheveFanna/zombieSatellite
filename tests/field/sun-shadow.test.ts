// Feature: field-companion, Testing Strategy: Sun_Direction and the cylindrical shadow
// **Validates: Requirements 2.5, 2.6**
import { describe, expect, it } from 'vitest';
import { illuminationState, sunDirection } from '../../src/lib/field/index';

// 2026 equinox and solstice instants (UTC). The USNO "Earth's Seasons" page could not be opened
// (HTTP 500 on /data/EarthSeasons; the calculated-seasons page returned no data), so the design
// literals were cross-checked against secondary sources: March 14:46, September 00:05 and
// December 20:50 agree; the June solstice is listed as 08:23 to 08:25, the design value 08:24 is
// kept. One minute is 0.0007 deg of solar longitude, far inside the 0.05 deg tolerance.
const EPS_DEG = 23.436;
const EPS = (EPS_DEG * Math.PI) / 180;
const CASES: ReadonlyArray<{ name: string; iso: string; expected: readonly [number, number, number] }> = [
  { name: 'March equinox', iso: '2026-03-20T14:46:00Z', expected: [1, 0, 0] },
  { name: 'June solstice', iso: '2026-06-21T08:24:00Z', expected: [0, Math.cos(EPS), Math.sin(EPS)] },
  { name: 'September equinox', iso: '2026-09-23T00:05:00Z', expected: [-1, 0, 0] },
  { name: 'December solstice', iso: '2026-12-21T20:50:00Z', expected: [0, -Math.cos(EPS), -Math.sin(EPS)] },
];

describe('sun direction and shadow', () => {
  it.each(CASES)('$name: Sun direction is within 0.05 deg of the definition vector', ({ iso, expected }) => {
    const s = sunDirection(Date.parse(iso));
    const dot = s.x * expected[0] + s.y * expected[1] + s.z * expected[2];
    const angleDeg = (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
    expect(angleDeg).toBeLessThanOrEqual(0.05);
  });

  it('puts 7000 km toward the Sun in sunlight and 7000 km away from it in the umbra', () => {
    const s = sunDirection(Date.parse('2026-03-20T14:46:00Z'));
    const at = (k: number) => ({ x: k * s.x, y: k * s.y, z: k * s.z });
    expect(illuminationState(at(7000), s)).toBe('sunlit');
    expect(illuminationState(at(-7000), s)).toBe('umbra');
  });
});
