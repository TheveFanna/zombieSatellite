import { expect, it } from 'vitest';
import type { NetworkGuardState } from '../setup/network-guard';

it('blocks the built-in fetch, records the URL and rejects', async () => {
  const guard: NetworkGuardState = Reflect.get(globalThis, Symbol.for('zombieSatellite.networkGuard'));
  const url = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle';

  await expect(globalThis.fetch(url)).rejects.toThrow('network access is disabled in the default test run');
  expect(guard.calls).toEqual([url]);

  // Clear the record so that this test's own afterEach passes.
  guard.calls.length = 0;
});
