// Built-in `fetch` blocker (design.md, D22; Requirement 14, criteria 1 and 2).
// Vitest loads this file before every test file (see `setupFiles` in vitest.config.ts).
import { afterAll, afterEach, beforeEach } from 'vitest';

export interface NetworkGuardState {
  readonly builtinFetch: typeof fetch;
  readonly blockedFetch: typeof fetch;
  readonly calls: string[];
}

const GUARD_KEY = Symbol.for('zombieSatellite.networkGuard');

function createGuardState(): NetworkGuardState {
  const calls: string[] = [];
  const blockedFetch = (input: string | URL | Request): Promise<Response> => {
    calls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    return Promise.reject(new TypeError('network access is disabled in the default test run'));
  };
  return { builtinFetch: globalThis.fetch, blockedFetch, calls };
}

// The state lives on globalThis, so every module instance in a worker reaches the same
// object and the built-in fetch is saved only once per worker.
const holder = globalThis as typeof globalThis & { [GUARD_KEY]?: NetworkGuardState };
const guard = (holder[GUARD_KEY] ??= createGuardState());

globalThis.fetch = guard.blockedFetch;

beforeEach(() => {
  // `calls` is not cleared here, so a call made in a `beforeAll` hook fails the next test.
  globalThis.fetch = guard.blockedFetch;
});

afterEach(() => {
  globalThis.fetch = guard.blockedFetch;
  if (guard.calls.length > 0) {
    const urls = guard.calls.splice(0);
    throw new Error(`The built-in fetch was called during the test: ${urls.join(', ')}`);
  }
});

afterAll(() => {
  if (guard.calls.length > 0) {
    throw new Error(`The built-in fetch was called after the last test: ${guard.calls.join(', ')}`);
  }
});
