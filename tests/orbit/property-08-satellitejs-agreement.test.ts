// Property 8: The Propagator agrees with satellite.js (design.md, Correctness Properties).
//
// For any accepted TLE record (baselines and Property 2 generator) and for any integer instant `t` from
// EPOCH − 30 days to EPOCH + 3650 days, `createSatrec(record)` deep-equals a fresh
// `twoline2satrec(TLE_LINE1, TLE_LINE2)`; and with `date = new Date(t)`, when satellite.js `propagate` returns
// finite position and velocity with error code 0, `propagateAt` returns `ok: true` with
// `gmstRad === gstime(date)`, position and velocity components identical (`Object.is`) to satellite.js, and
// `ecfPositionKm` identical to `eciToEcf(position, gstime(date))`; otherwise it returns `ok: false` whose own
// keys are exactly `ok`, `timeMs`, `gmstRad` and `satrecError`, with `gmstRad === gstime(date)`.
import fc from 'fast-check';
import { eciToEcf, gstime, propagate, twoline2satrec } from 'satellite.js';
import type { PositionAndVelocity } from 'satellite.js';
import { expect, it } from 'vitest';
import { createSatrec, isEngineError, parseTle, propagateAt, type TleRecord } from '../../src/lib/orbit/index';
import { formatTle, tleFieldsArb, type TleLines } from '../helpers/arbitraries';
import { ISS_BASELINE, ZHTW_BASELINE } from '../helpers/baseline';

// "Property test settings" of design.md (D20, D21): Property 8 runs 200 cases and the test gets a timeout of
// 20 000 ms.
const NUM_RUNS = 200;
const TIMEOUT_MS = 20_000;

const MS_PER_DAY = 86_400_000;

/** The TLEs of the property: the two Baseline_TLE_Snapshots and generated TLEs. */
const tleArb: fc.Arbitrary<TleLines> = fc.oneof(
  fc.constantFrom<TleLines>(ISS_BASELINE, ZHTW_BASELINE),
  tleFieldsArb.map(formatTle),
);

/** Distance of the instant from EPOCH in whole ms: from −30 days to +3650 days. */
const offsetArb = fc.integer({ min: -30 * MS_PER_DAY, max: 3650 * MS_PER_DAY });

/**
 * The integer instant that lies `offsetMs` from `epochMs`. EPOCH can carry a fractional millisecond (D2), so a
 * negative offset counts down from the first whole ms at or after EPOCH and any other offset counts up from the
 * last whole ms at or before it. The instants are therefore exactly the integers from EPOCH − 30 days to
 * EPOCH + 3650 days, both ends included.
 */
function instantAt(epochMs: number, offsetMs: number): number {
  return (offsetMs < 0 ? Math.ceil(epochMs) : Math.floor(epochMs)) + offsetMs;
}

/**
 * The record that `parseTle` returns for the TLE, or `undefined` when it rejects the TLE with `invalid-tle`. The
 * generators leave it to `parseTle` whether satellite.js accepts a generated TLE, and a rejected TLE is not an
 * accepted TLE, so Property 8 does not apply to it. Any other error is rethrown.
 */
function acceptedRecord({ name, line1, line2 }: TleLines): TleRecord | undefined {
  try {
    return parseTle(`${name}\n${line1}\n${line2}`);
  } catch (error) {
    if (isEngineError(error) && error.category === 'invalid-tle') {
      return undefined;
    }
    throw error;
  }
}

interface Components {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The three components of a vector. Vitest compares numbers with `Object.is`, so `-0` differs from `+0`. */
function components(vector: Components): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function isFiniteVector(vector: Components): boolean {
  return components(vector).every(Number.isFinite);
}

// Feature: orbit-engine, Property 8: The Propagator agrees with satellite.js
// **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.11, 6.12**
it(
  'Property 8: The Propagator agrees with satellite.js',
  () => {
    fc.assert(
      fc.property(tleArb, offsetArb, (tle, offsetMs) => {
        const record = acceptedRecord(tle);
        fc.pre(record !== undefined);

        // Two Satrecs of the same lines, neither propagated yet: the engine's and the reference of satellite.js.
        const satrec = createSatrec(record);
        const reference = twoline2satrec(record.TLE_LINE1, record.TLE_LINE2);
        expect(satrec).toStrictEqual(reference);

        const t = instantAt(record.EPOCH, offsetMs);
        const date = new Date(t);
        const expectedGmstRad = gstime(date);
        // satellite.js 6.0.2 returns null when propagation fails, although its declaration says otherwise.
        const state: PositionAndVelocity | null = propagate(reference, date);
        const result = propagateAt(satrec, t);

        if (state !== null && reference.error === 0 && isFiniteVector(state.position) && isFiniteVector(state.velocity)) {
          if (!result.ok) {
            throw new Error(`propagateAt failed with satrecError ${result.satrecError} where satellite.js succeeded`);
          }
          expect(result.gmstRad).toBe(expectedGmstRad);
          expect(components(result.eciPositionKm)).toStrictEqual(components(state.position));
          expect(components(result.eciVelocityKmPerS)).toStrictEqual(components(state.velocity));
          expect(components(result.ecfPositionKm)).toStrictEqual(
            components(eciToEcf(state.position, expectedGmstRad)),
          );
        } else {
          if (result.ok) {
            throw new Error('propagateAt succeeded where satellite.js failed');
          }
          expect(Reflect.ownKeys(result).map(String).sort()).toStrictEqual([
            'gmstRad',
            'ok',
            'satrecError',
            'timeMs',
          ]);
          expect(result.gmstRad).toBe(expectedGmstRad);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  },
  TIMEOUT_MS,
);
