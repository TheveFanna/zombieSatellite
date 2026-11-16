// Feature: field-companion, Testing Strategy: Sub_Satellite_Point and footprint radius
// **Validates: Requirements 12.6, 12.7**
import { describe, expect, it } from 'vitest';
import {
  FOOTPRINT_EARTH_RADIUS_KM,
  footprintAngularRadiusDeg,
  subSatellitePoint,
} from '../../src/lib/field/index';

describe('Sub_Satellite_Point at the Reference_ISS_Instant', () => {
  it('matches the satellite.js 6.0.2 eciToGeodetic literals', () => {
    // Literals: eciToGeodetic({5024.1427, -2134.2621, 4035.6750}, gmst 3.8292582544).
    const p = subSatellitePoint({ x: -2527.614, y: 4838.2075, z: 4035.675 });
    expect(Math.abs(p.latitudeDeg - 36.648849946091744)).toBeLessThan(1e-6);
    expect(Math.abs(p.longitudeDeg - 117.58381737606199)).toBeLessThan(1e-6);
    expect(Math.abs(p.altitudeKm - 417.9451163340318)).toBeLessThan(1e-4);
  });
});

describe('Visibility_Footprint radius', () => {
  const R = FOOTPRINT_EARTH_RADIUS_KM;
  it('gives 0, 60 and 45 degrees at h = 0, R, R(sqrt2 - 1)', () => {
    expect(Math.abs(footprintAngularRadiusDeg(0))).toBeLessThan(1e-9);
    expect(Math.abs(footprintAngularRadiusDeg(R) - 60)).toBeLessThan(1e-9);
    expect(Math.abs(footprintAngularRadiusDeg(R * (Math.SQRT2 - 1)) - 45)).toBeLessThan(1e-9);
  });
});
