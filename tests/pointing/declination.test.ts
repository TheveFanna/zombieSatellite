import { describe, it } from 'vitest';
import { declinationDeg } from '../../src/lib/pointing/index';
import { expectClose } from '../helpers/pointing-assert';

// Expected values: NOAA NCEI magnetic field calculator, model WMM-2025,
// elevation 0 km, looked up for 2026-11-15 (pinned in design.md, section "Declination").

describe('declinationDeg', () => {
  // Feature: ar-pointing, Property 7: Declination at the acceptance points
  // Validates: Requirements 6.10
  it.each([
    ['Beijing', 39.9042, 116.4074, -7.5631],
    ['Shanghai', 31.23, 121.47, -6.55898],
    ['Ürümqi', 43.83, 87.62, 2.49421],
    ['Guangzhou', 23.13, 113.26, -3.28683],
  ])('%s is within 0.5 deg of the NOAA value', (_name, lat, lon, expected) => {
    expectClose(declinationDeg(lat, lon, Date.UTC(2026, 10, 15)), expected, 0.5);
  });
});
