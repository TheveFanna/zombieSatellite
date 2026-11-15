// Feature: shell-pwa-deploy, Testing Strategy item 2: the TLE_Proxy handler
// **Validates: Requirements 6.2–6.9**
import { describe, expect, it } from 'vitest';
import { CELESTRAK_GP_URL } from '../../src/lib/orbit/constants';
import { createTleProxyHandler, UPSTREAM_GP_URL, upstreamUrl } from '../../src/lib/shell/index';
import { ISS_BASELINE } from '../helpers/baseline';
import { celestrakBody, createMockCelestrakFetch } from '../helpers/mock-celestrak';
import type { MockBehavior } from '../helpers/mock-celestrak';

const ISS_BODY = celestrakBody(ISS_BASELINE);

function request(query: string): Request {
  return new Request(`https://zombiesat.example/api/tle${query}`);
}

async function run(query: string, behavior: MockBehavior = { kind: 'answer' }) {
  const fetch = createMockCelestrakFetch(behavior);
  const response = await createTleProxyHandler({ fetch })(request(query));
  return { fetch, response, body: await response.text() };
}

describe('createTleProxyHandler', () => {
  it('answers 200 with the unchanged upstream text and a 2 h CDN cache', async () => {
    const { fetch, response, body } = await run('?CATNR=25544');
    expect(response.status).toBe(200);
    expect(body).toBe(ISS_BODY);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, s-maxage=7200');
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(fetch.calls.map((call) => call.url)).toEqual([upstreamUrl(25544)]);
    expect(upstreamUrl(25544)).toBe('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle');
  });

  it.each(['', '?CATNR=0', '?CATNR=100000', '?CATNR=abc', '?CATNR=1&CATNR=2'])(
    'answers 400 without an upstream call for %j',
    async (query) => {
      const { fetch, response } = await run(query);
      expect(response.status).toBe(400);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(fetch.calls).toEqual([]);
    },
  );

  it('answers 502 no-store when the upstream answers 403', async () => {
    const { response } = await run('?CATNR=25544', { kind: 'answer', status: 403, body: 'Forbidden' });
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 502 no-store when the upstream request rejects', async () => {
    const { response } = await run('?CATNR=25544', { kind: 'reject', reason: new TypeError('offline') });
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 502 no-store when the upstream 200 body is not a TLE', async () => {
    const { response } = await run('?CATNR=25544', { kind: 'answer', body: 'No GP data found' });
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('keeps UPSTREAM_GP_URL equal to the internal CELESTRAK_GP_URL of the orbit engine', () => {
    expect(UPSTREAM_GP_URL).toBe(CELESTRAK_GP_URL);
  });
});
