// Feature: qsl-card, collection-reader case of "Testing Strategy"
// **Validates: Requirements 10.2**
import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../../src/components/pointing/deps';
import { readCollection } from '../../src/components/qsl/collection-reader';
import { RESULT_STORAGE_KEY } from '../../src/components/session/result-store';

const AOS_1 = Date.UTC(2026, 10, 8, 6, 0, 0);
const AOS_2 = Date.UTC(2026, 10, 9, 11, 18, 5);

function stored(noradId: number, aosMs: number) {
  return {
    noradId,
    aosMs,
    losMs: aosMs + 600_000,
    maxElevationDeg: 40,
    lockedSeconds: 300,
    lockedRatio: 0.5,
    bestPointingErrorDeg: 2,
    completed: true,
    mode: 'real',
    autoPointUsed: false,
  };
}

describe('readCollection', () => {
  it('returns the cards of two stored results, newest first', () => {
    const data = new Map<string, string>([[RESULT_STORAGE_KEY, JSON.stringify([stored(1002, AOS_1), stored(7530, AOS_2)])]]);
    const storage: KeyValueStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
    };
    const cards = readCollection(storage);
    expect(cards.map((c) => [c.address.noradId, c.address.aosMs, c.address.ordinal])).toEqual([
      [7530, AOS_2, 1],
      [1002, AOS_1, 1],
    ]);
  });
});
