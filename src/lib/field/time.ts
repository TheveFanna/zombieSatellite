const TWO_PI = 2 * Math.PI;

/** Julian date of a UTC instant in ms since the Unix epoch. */
export function julianDate(instantMs: number): number {
  return instantMs / 86_400_000 + 2_440_587.5;
}

/** GMST in rad in [0, 2π), the IAU-82 polynomial that satellite.js `gstime` uses. */
export function gmstRad(instantMs: number): number {
  const t = (julianDate(instantMs) - 2_451_545.0) / 36_525;
  const seconds =
    -6.2e-6 * t * t * t + 0.093104 * t * t + (876_600 * 3600 + 8_640_184.812866) * t + 67_310.54841;
  const rad = ((seconds * Math.PI) / 180 / 240) % TWO_PI;
  return rad < 0 ? rad + TWO_PI : rad;
}
