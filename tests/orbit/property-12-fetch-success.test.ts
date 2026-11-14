// Property 12 of design.md (Correctness Properties): Successful fetch for any catalog number.
//
// For any integer N from 1 to 99999 and for any accepted TLE body for N (baseline lines with columns
// [2:7] set to N, rendered with a padded name and CRLF), a new fetcher whose recording Fetch_Function
// answers status 200 with that body calls the Fetch_Function exactly once, with the URL string
// `https://celestrak.org/NORAD/elements/gp.php?CATNR=N&FORMAT=tle` (N in decimal without leading zeros,
// exactly one `FORMAT` parameter), an init object without a `headers` key and with `credentials` other
// than `'include'`, and resolves to a frozen record that deep-equals `parseTle(body)`.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createTleFetcher, parseTle } from '../../src/lib/orbit/index';
import { ISS_BASELINE } from '../helpers/baseline';
import { celestrakBody, createMockCelestrakFetch } from '../helpers/mock-celestrak';

/** `line` with its NORAD number columns [2:7] replaced by the five-digit text `noradText`. */
function withNorad(line: string, noradText: string): string {
  return `${line.slice(0, 2)}${noradText}${line.slice(7)}`;
}

describe('TLE_Fetcher successful fetch', () => {
  it('requests the FORMAT=tle URL once, sends no headers and resolves to the parsed record', async () => {
    // Feature: orbit-engine, Property 12: Successful fetch for any catalog number
    // **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.14**
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 99_999 }), async (noradId) => {
        const noradText = String(noradId).padStart(5, '0');
        const body = celestrakBody({
          name: ISS_BASELINE.name,
          line1: withNorad(ISS_BASELINE.line1, noradText),
          line2: withNorad(ISS_BASELINE.line2, noradText),
        });
        const mock = createMockCelestrakFetch({ kind: 'answer', status: 200, body });

        const record = await createTleFetcher({ fetch: mock }).fetchTle(noradId);

        expect(mock.calls).toHaveLength(1);
        const { url, init } = mock.calls[0];
        // The exact comparison covers N without leading zeros and the single FORMAT parameter.
        expect(url).toBe(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`);
        expect('headers' in init).toBe(false);
        expect(init.credentials).not.toBe('include');
        expect(Object.isFrozen(record)).toBe(true);
        expect(record).toStrictEqual(parseTle(body));
      }),
      { numRuns: 200 },
    );
  });
});
