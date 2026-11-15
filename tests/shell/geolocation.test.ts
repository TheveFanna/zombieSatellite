// Feature: shell-pwa-deploy, Testing Strategy item 4: the Geolocation_Controller
// **Validates: Requirement 8.10**
import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../../src/components/pointing/deps';
import { createLocator } from '../../src/components/shell/geolocation';
import type { GeolocationLike } from '../../src/components/shell/geolocation';
import { createObserverStore, OBSERVER_STORAGE_KEY } from '../../src/components/session/observer-store';
import { serializeObserver } from '../../src/lib/session/index';
import type { ObserverPosition } from '../../src/lib/session/index';

function mapStorage(initial: Record<string, string> = {}): KeyValueStorage & { readonly map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return { map, getItem: (key) => map.get(key) ?? null, setItem: (key, value) => void map.set(key, value) };
}

/** Answers every request with `answer`; counts the requests. */
function mockGeolocation(answer: { lat: number; lon: number } | { code: number }) {
  const geo = {
    requests: 0,
    getCurrentPosition(success, error) {
      geo.requests += 1;
      if ('code' in answer) error({ code: answer.code });
      else success({ coords: { latitude: answer.lat, longitude: answer.lon } });
    },
  } satisfies GeolocationLike & { requests: number };
  return geo;
}

/** The page's apply: the landed setObserver path, which writes through the observer store. */
function storeApply(storage: KeyValueStorage) {
  const store = createObserverStore(storage);
  return (position: ObserverPosition) => store.set(position);
}

const stored = (latitudeDeg: number, longitudeDeg: number): Record<string, string> => ({
  [OBSERVER_STORAGE_KEY]: serializeObserver({ latitudeDeg, longitudeDeg }),
});

describe('createLocator', () => {
  it('writes an automatic fix when nothing valid is stored', async () => {
    const storage = mapStorage();
    const geo = mockGeolocation({ lat: 31.230416, lon: 121.473701 });
    const outcome = await createLocator({ geolocation: geo, storage }).autoLocate(storeApply(storage));
    expect(outcome).toBe('applied');
    expect(createObserverStore(storage).get()).toEqual({ latitudeDeg: 31.2304, longitudeDeg: 121.4737 });
  });

  it('sends no automatic request while a valid value is stored', async () => {
    const storage = mapStorage(stored(10, 20));
    const geo = mockGeolocation({ lat: 31, lon: 121 });
    const outcome = await createLocator({ geolocation: geo, storage }).autoLocate(storeApply(storage));
    expect(outcome).toBe('skipped');
    expect(geo.requests).toBe(0);
    expect(createObserverStore(storage).get()).toEqual({ latitudeDeg: 10, longitudeDeg: 20 });
  });

  it('overwrites a stored value on an explicit locate', async () => {
    const storage = mapStorage(stored(10, 20));
    const geo = mockGeolocation({ lat: 31, lon: 121 });
    const outcome = await createLocator({ geolocation: geo, storage }).locateNow(storeApply(storage));
    expect(outcome).toBe('applied');
    expect(createObserverStore(storage).get()).toEqual({ latitudeDeg: 31, longitudeDeg: 121 });
  });

  it.each([
    [1, 'denied'],
    [3, 'timeout'],
  ] as const)('keeps the observer when the request fails with code %i', async (code, expected) => {
    const storage = mapStorage();
    const outcome = await createLocator({ geolocation: mockGeolocation({ code }), storage }).autoLocate(storeApply(storage));
    expect(outcome).toBe(expected);
    expect(storage.map.has(OBSERVER_STORAGE_KEY)).toBe(false);
  });

  it('reports an unavailable API without writing', async () => {
    const storage = mapStorage();
    const outcome = await createLocator({ geolocation: null, storage }).autoLocate(storeApply(storage));
    expect(outcome).toBe('unavailable');
    expect(storage.map.has(OBSERVER_STORAGE_KEY)).toBe(false);
  });
});
