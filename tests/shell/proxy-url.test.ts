// Feature: shell-pwa-deploy, Testing Strategy item 3: the Proxy_Fetch URL rewrite
// **Validates: Requirement 7.6**
import { describe, expect, it } from 'vitest';
import { toProxyUrl } from '../../src/lib/shell/index';

const GP = 'https://celestrak.org/NORAD/elements/gp.php';

describe('toProxyUrl', () => {
  it('rewrites the URL the landed fetcher builds', () => {
    expect(toProxyUrl(`${GP}?CATNR=7530&FORMAT=tle`)).toBe('/api/tle?CATNR=7530');
  });

  it.each([
    `https://example.org/NORAD/elements/gp.php?CATNR=7530&FORMAT=tle`,
    `https://celestrak.org/NORAD/elements/other.php?CATNR=7530&FORMAT=tle`,
    `${GP}?CATNR=7530`,
    `${GP}?CATNR=7530&FORMAT=tle&EXTRA=1`,
  ])('returns null for %s', (input) => {
    expect(toProxyUrl(input)).toBeNull();
  });
});
