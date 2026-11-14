// Live_Test (design.md, Live_Test; Requirement 14, criteria 3 to 5 and 11). It runs only when
// ZOMBIESAT_LIVE_TEST holds a non-empty value and sends one request to the real CelesTrak endpoint
// through the built-in `fetch` of Node.js, which the network guard saved when it loaded.
import { expect, it } from 'vitest';
import { createTleFetcher } from '../../src/lib/orbit/index';
import type { TleRecord } from '../../src/lib/orbit/index';
import type { NetworkGuardState } from '../setup/network-guard';

// The timeout is twice the Request_Timeout (D20). Only the identity of the satellite is asserted,
// because the live epoch and elements change over time.
it.skipIf(!process.env.ZOMBIESAT_LIVE_TEST)(
  'fetches the ISS TLE from the real CelesTrak endpoint',
  async () => {
    const guard: NetworkGuardState = Reflect.get(globalThis, Symbol.for('zombieSatellite.networkGuard'));

    let record: TleRecord;
    globalThis.fetch = guard.builtinFetch;
    try {
      record = await createTleFetcher().fetchTle(25544);
    } finally {
      globalThis.fetch = guard.blockedFetch;
    }

    expect(record.NORAD_CAT_ID).toBe(25544);
    expect(record.OBJECT_ID).toBe('98067A');
    expect(record.OBJECT_NAME).toBe('ISS (ZARYA)');
  },
  30_000,
);
