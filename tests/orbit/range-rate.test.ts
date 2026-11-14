// Example tests of the Range_Rate (design.md, Testing Strategy, range-rate.test.ts):
// Requirement 8, criteria 3, 5, 6 and 7. Criterion 4 (the sign convention) has no test of its own: the baselines
// are negative while the satellite approaches (-2.1094) and positive while it recedes (+2.6384, +0.7132).
import { degreesToRadians, eciToEcf, geodeticToEcf } from 'satellite.js';
import { describe, expect, it } from 'vitest';
import { createSatrec, observeAt, parseTle } from '../../src/lib/orbit/index';
import type { ObservationSuccess, Observer } from '../../src/lib/orbit/index';
import { ISS_AT_1123Z, ISS_AT_1200Z, REFERENCE_OBSERVER, ZHTW_AT_1200Z } from '../helpers/baseline';
import type { BaselineInstant } from '../helpers/baseline';

/** Tolerance of Requirement 8, criteria 5 to 7, in km/s. */
const TOLERANCE_KM_PER_S = 0.01;

interface RangeRateCase {
  /** Test title: the satellite and the instant, and the criterion of Requirement 8 that fixes the baseline. */
  readonly title: string;
  readonly baseline: BaselineInstant;
}

function rangeRateCase(criterion: number, baseline: BaselineInstant): RangeRateCase {
  return { title: `${baseline.tle.name} at ${baseline.iso}, baseline of criterion 8.${criterion}`, baseline };
}

const CASES: readonly RangeRateCase[] = [
  rangeRateCase(5, ISS_AT_1123Z),
  rangeRateCase(6, ISS_AT_1200Z),
  rangeRateCase(7, ZHTW_AT_1200Z),
];

/** Observes the baseline satellite from the Reference_Observer at the baseline instant. */
function observe(baseline: BaselineInstant): ObservationSuccess {
  const satrec = createSatrec(parseTle(baseline.tle.text));
  const observation = observeAt(satrec, baseline.timeMs, REFERENCE_OBSERVER);
  if (!observation.ok) {
    throw new Error(`SGP4 propagation failed at ${baseline.iso} with satrec error ${observation.satrecError}`);
  }
  return observation;
}

/**
 * The Range_Rate without the Earth-rotation term (Requirement 8, criterion 3): the SGP4 velocity rotated with
 * satellite.js `eciToEcf` (the C24 rotation Rz(-θ) applied to the velocity components) and dotted with the unit
 * vector (r_ecf - r_obs) / ρ, from the engine's ECF position and Slant_Range and the Observer ECF position (C30).
 */
function rotateOnlyRangeRate(observation: ObservationSuccess, observer: Observer): number {
  const velocity = eciToEcf(observation.eciVelocityKmPerS, observation.gmstRad);
  const observerEcf = geodeticToEcf({
    latitude: degreesToRadians(observer.latitudeDeg),
    longitude: degreesToRadians(observer.longitudeDeg),
    height: observer.altitudeKm,
  });
  const position = observation.ecfPositionKm;
  const dot =
    velocity.x * (position.x - observerEcf.x) +
    velocity.y * (position.y - observerEcf.y) +
    velocity.z * (position.z - observerEcf.z);
  return dot / observation.lookAngles.slantRangeKm;
}

describe('Range_Rate baselines (Requirement 8, criteria 5 to 7)', () => {
  it.each(CASES)('is within ±0.01 km/s of the baseline: $title', ({ baseline }) => {
    const { rangeRateKmPerS } = observe(baseline);

    expect(
      Math.abs(rangeRateKmPerS - baseline.rangeRateKmPerS),
      `engine ${rangeRateKmPerS} km/s, baseline ${baseline.rangeRateKmPerS} km/s`,
    ).toBeLessThanOrEqual(TOLERANCE_KM_PER_S);
  });
});

describe('Earth-rotation term of the Range_Rate (Requirement 8, criterion 3)', () => {
  it.each(CASES)(
    'rotate-only value misses the baseline by more than 0.01 km/s while the engine value meets it: $title',
    ({ baseline }) => {
      const observation = observe(baseline);
      const rotateOnly = rotateOnlyRangeRate(observation, REFERENCE_OBSERVER);

      expect(
        Math.abs(rotateOnly - baseline.rangeRateKmPerS),
        `rotate-only ${rotateOnly} km/s, baseline ${baseline.rangeRateKmPerS} km/s`,
      ).toBeGreaterThan(TOLERANCE_KM_PER_S);
      expect(
        Math.abs(observation.rangeRateKmPerS - baseline.rangeRateKmPerS),
        `engine ${observation.rangeRateKmPerS} km/s, baseline ${baseline.rangeRateKmPerS} km/s`,
      ).toBeLessThanOrEqual(TOLERANCE_KM_PER_S);
    },
  );
});
