// Example tests of the TLE_Fetcher and its cache (design.md, Testing Strategy, tle-fetcher.test.ts):
// Requirement 3, criteria 5, 10, 12, 13, 15 and 16, and Requirement 5, criteria 2 to 5, 9 and 10.
// Every request goes to a mock: a Fetch_Function passed in the options, or a mock installed as
// `globalThis.fetch` for the duration of one test (the network guard puts its blocker back afterwards).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EngineError, REQUEST_TIMEOUT_MS, TLE_CACHE_TTL_MS, createTleFetcher } from '../../src/lib/orbit/index';
import type { FetchFunction } from '../../src/lib/orbit/index';
import { ISS_BASELINE } from '../helpers/baseline';
import { celestrakBody, createMockCelestrakFetch, recordingFetch } from '../helpers/mock-celestrak';
import type { MockCelestrakFetch } from '../helpers/mock-celestrak';

const ISS_NORAD_ID = 25544;

// Tolerances of Requirement 4, criterion 18, to which Requirement 3, criterion 13 refers.
const SEMIMAJOR_AXIS_TOLERANCE_KM = 0.01;
const ALTITUDE_TOLERANCE_KM = 0.1;

/** Cache_Clock reading at which the first request of a cache test ends: 2026-11-09T00:00:00Z. */
const START_MS = Date.parse('2026-11-09T00:00:00Z');

// The ISS TLE with the epoch day 312.17541007 (line 1 columns [20:32]) replaced by 313.17541007, one day
// later. The parser does not verify checksums (D1), so the changed line needs no new checksum digit.
const LATER_EPOCH_ISS = {
  name: ISS_BASELINE.name,
  line1: `${ISS_BASELINE.line1.slice(0, 20)}313.17541007${ISS_BASELINE.line1.slice(32)}`,
  line2: ISS_BASELINE.line2,
};

/** Awaits a promise that must reject with an EngineError and returns that error. */
async function rejection(promise: Promise<unknown>): Promise<EngineError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof EngineError) {
      return error;
    }
    throw error;
  }
  throw new Error('The promise resolved, expected a rejection with an EngineError');
}

/** Installs `mock` as the global `fetch`. The network guard reinstalls its blocker after the test. */
function installGlobalFetch(mock: FetchFunction): void {
  globalThis.fetch = mock as typeof fetch;
}

/** A Fetch_Function whose promise resolves with `value`, which the test chooses to be no response. */
function resolvingWith(value: unknown): MockCelestrakFetch {
  return recordingFetch(() => Promise.resolve(value as Response));
}

/** A Fetch_Function that resolves with a status-200 response object whose `text` method is `text`. */
function answeringWithText(text: () => unknown): MockCelestrakFetch {
  return recordingFetch(() => Promise.resolve({ status: 200, text } as Response));
}

/**
 * A fetcher whose Cache_Clock and answer body the test controls. Its first request, at START_MS,
 * ends in the baseline ISS TleRecord, which is the cache entry that the test then ages.
 */
async function fetcherWithIssEntry() {
  const state = { nowMs: START_MS, body: celestrakBody(ISS_BASELINE) };
  const mock = createMockCelestrakFetch({ kind: 'answer', body: () => state.body });
  const fetcher = createTleFetcher({ fetch: mock, now: () => state.nowMs });
  const stored = await fetcher.fetchTle(ISS_NORAD_ID);
  return { state, mock, fetcher, stored };
}

describe('request through the Mock_CelesTrak_Fetch', () => {
  it('calls the mock once with a FORMAT=tle URL for 25544 (Requirement 3, criterion 12)', async () => {
    const mock = createMockCelestrakFetch();

    await createTleFetcher({ fetch: mock }).fetchTle(ISS_NORAD_ID);

    expect(mock.calls).toHaveLength(1);
    const { url } = mock.calls[0];
    expect(url).toContain('CATNR=25544&FORMAT=tle');
    expect(url).not.toContain('FORMAT=json');
  });

  it('returns the ISS TleRecord of Requirement 4, criterion 18 (Requirement 3, criterion 13)', async () => {
    const record = await createTleFetcher({ fetch: createMockCelestrakFetch() }).fetchTle(ISS_NORAD_ID);

    const { EPOCH, SEMIMAJOR_AXIS_KM, ALTITUDE_KM, ...exact } = record;
    const { expected } = ISS_BASELINE;
    expect(exact).toStrictEqual({
      OBJECT_NAME: ISS_BASELINE.name,
      TLE_LINE1: ISS_BASELINE.line1,
      TLE_LINE2: ISS_BASELINE.line2,
      NORAD_CAT_ID: expected.NORAD_CAT_ID,
      OBJECT_ID: expected.OBJECT_ID,
      MEAN_MOTION: expected.MEAN_MOTION,
      ECCENTRICITY: expected.ECCENTRICITY,
      INCLINATION: expected.INCLINATION,
      RA_OF_ASC_NODE: expected.RA_OF_ASC_NODE,
      ARG_OF_PERICENTER: expected.ARG_OF_PERICENTER,
      MEAN_ANOMALY: expected.MEAN_ANOMALY,
    });
    expect(new Date(EPOCH).toISOString()).toBe(expected.EPOCH_ISO);
    expect(Math.abs(SEMIMAJOR_AXIS_KM - expected.SEMIMAJOR_AXIS_KM)).toBeLessThanOrEqual(
      SEMIMAJOR_AXIS_TOLERANCE_KM,
    );
    expect(Math.abs(ALTITUDE_KM - expected.ALTITUDE_KM)).toBeLessThanOrEqual(ALTITUDE_TOLERANCE_KM);
  });
});

describe('request without a Fetch_Function', () => {
  it('sends each request through the global fetch that is defined at that moment (Requirement 3, criterion 5)', async () => {
    let nowMs = START_MS;
    const fetcher = createTleFetcher({ now: () => nowMs });

    const first = createMockCelestrakFetch();
    installGlobalFetch(first);
    await fetcher.fetchTle(ISS_NORAD_ID);

    expect(first.calls).toHaveLength(1);

    // Replace the global fetch again and age the entry to the TTL, so that the next request is sent.
    const second = createMockCelestrakFetch();
    installGlobalFetch(second);
    nowMs += TLE_CACHE_TTL_MS;
    await fetcher.fetchTle(ISS_NORAD_ID);

    expect(first.calls).toHaveLength(1);
    expect(second.calls).toHaveLength(1);
  });
});

describe('status-200 bodies that the TLE_Parser rejects', () => {
  it.each(['No GP data found', '', '[]'])(
    'reports invalid-tle for the body %j (Requirement 3, criterion 10)',
    async (body) => {
      const mock = createMockCelestrakFetch({ kind: 'answer', body });

      const error = await rejection(createTleFetcher({ fetch: mock }).fetchTle(ISS_NORAD_ID));

      expect(error.category).toBe('invalid-tle');
    },
  );
});

describe('answers that are no usable response (Requirement 3, criterion 15)', () => {
  it.each([null, {}, 42])('reports network with a TypeError cause when fetch resolves with %j', async (value) => {
    const error = await rejection(createTleFetcher({ fetch: resolvingWith(value) }).fetchTle(ISS_NORAD_ID));

    expect(error.category).toBe('network');
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it('reports network with the thrown value as cause when text() throws', async () => {
    const thrown = new Error('text() threw');
    const mock = answeringWithText(() => {
      throw thrown;
    });

    const error = await rejection(createTleFetcher({ fetch: mock }).fetchTle(ISS_NORAD_ID));

    expect(error.category).toBe('network');
    expect(error.cause).toBe(thrown);
  });

  it('reports network with the rejection reason as cause when text() rejects', async () => {
    const reason = new Error('text() rejected');
    const mock = answeringWithText(() => Promise.reject(reason));

    const error = await rejection(createTleFetcher({ fetch: mock }).fetchTle(ISS_NORAD_ID));

    expect(error.category).toBe('network');
    expect(error.cause).toBe(reason);
  });

  it('reports network with a TypeError cause when text() returns a number', async () => {
    const mock = answeringWithText(() => 42);

    const error = await rejection(createTleFetcher({ fetch: mock }).fetchTle(ISS_NORAD_ID));

    expect(error.category).toBe('network');
    expect(error.cause).toBeInstanceOf(TypeError);
  });
});

describe('Request_Timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts a request that does not end and rejects every waiting caller with network (Requirement 3, criterion 16)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const mock = createMockCelestrakFetch({ kind: 'never' });
    const fetcher = createTleFetcher({ fetch: mock });

    const waiting = [rejection(fetcher.fetchTle(ISS_NORAD_ID)), rejection(fetcher.fetchTle(ISS_NORAD_ID))];
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    const errors = await Promise.all(waiting);

    expect(errors.map((error) => error.category)).toEqual(['network', 'network']);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].init.signal?.aborted).toBe(true);

    // The In_Flight_Request has ended, so the next caller starts a new request and the mock is called again.
    const retry = rejection(fetcher.fetchTle(ISS_NORAD_ID));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect((await retry).category).toBe('network');
    expect(mock.calls).toHaveLength(2);
  });
});

describe('TLE_Cache', () => {
  it('has a TTL of 7 200 000 ms (Requirement 5, criterion 2)', () => {
    expect(TLE_CACHE_TTL_MS).toBe(7_200_000);
  });

  it('serves an entry of Entry_Age TTL − 1 ms from the cache (Requirement 5, criteria 3 and 10)', async () => {
    const { state, mock, fetcher, stored } = await fetcherWithIssEntry();

    state.nowMs = START_MS + TLE_CACHE_TTL_MS - 1;
    const served = await fetcher.fetchTle(ISS_NORAD_ID);

    expect(served).toStrictEqual(stored);
    expect(mock.calls).toHaveLength(1);
  });

  it('answers an entry of Entry_Age TTL with a new request, not with the expired entry (Requirement 5, criteria 4 and 10)', async () => {
    const { state, mock, fetcher, stored } = await fetcherWithIssEntry();

    state.body = celestrakBody(LATER_EPOCH_ISS);
    state.nowMs = START_MS + TLE_CACHE_TTL_MS;
    const answer = await fetcher.fetchTle(ISS_NORAD_ID);

    expect(mock.calls).toHaveLength(2);
    expect(answer.TLE_LINE1).toBe(LATER_EPOCH_ISS.line1);
    expect(answer.EPOCH).toBeGreaterThan(stored.EPOCH);
  });

  it('replaces an expired entry with the TleRecord of a refetch that has a later epoch (Requirement 5, criterion 5)', async () => {
    const { state, mock, fetcher, stored } = await fetcherWithIssEntry();
    state.body = celestrakBody(LATER_EPOCH_ISS);
    state.nowMs = START_MS + TLE_CACHE_TTL_MS;
    const refetched = await fetcher.fetchTle(ISS_NORAD_ID);

    // Entry_Age now counts from the refetch. TTL − 1 ms later the later-epoch record is served from the
    // cache, although the first entry would be 2 · TTL − 1 ms old.
    state.nowMs += TLE_CACHE_TTL_MS - 1;
    const served = await fetcher.fetchTle(ISS_NORAD_ID);

    expect(refetched.EPOCH).toBeGreaterThan(stored.EPOCH);
    expect(served).toStrictEqual(refetched);
    expect(mock.calls).toHaveLength(2);
  });

  it('starts every new fetcher with an empty cache (Requirement 5, criterion 9)', async () => {
    const first = createMockCelestrakFetch();
    await createTleFetcher({ fetch: first }).fetchTle(ISS_NORAD_ID);

    const second = createMockCelestrakFetch();
    await createTleFetcher({ fetch: second }).fetchTle(ISS_NORAD_ID);

    expect(first.calls).toHaveLength(1);
    expect(second.calls).toHaveLength(1);
  });
});
