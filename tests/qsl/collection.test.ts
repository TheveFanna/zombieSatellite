// Feature: qsl-card, Property 4 (collection part), Property 6, Property 7 (shared and distinct)
// **Validates: Requirements 4.1, 4.2, 7.2, 7.6, 7.7, 8.5**
import { describe, expect, it } from 'vitest';
import type { SessionResult } from '../../src/lib/session/index';
import { buildCollection, findCard, parseCardAddress } from '../../src/lib/qsl/index';

const OLD_AOS = Date.UTC(2026, 10, 8, 6, 0, 0);
const NEW_AOS = Date.UTC(2026, 10, 9, 11, 18, 5);

function result(noradId: number, aosMs: number, over: Partial<SessionResult> = {}): SessionResult {
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
    ...over,
  } as SessionResult;
}

const demoAuto = { mode: 'demo', autoPointUsed: true } as const;

// Storage order, oldest first.
const FIXTURE: readonly SessionResult[] = [
  result(1002, OLD_AOS), // LES-1
  result(26113, OLD_AOS), // IMAGE, same aosMs, stored later
  result(7530, NEW_AOS, demoAuto),
  result(7530, NEW_AOS),
  result(7530, NEW_AOS, demoAuto),
  result(7530, NEW_AOS + 1000, { completed: false }),
  result(99999, NEW_AOS + 2000),
];

describe('collection order, ordinals and look-up (Property 4, 6)', () => {
  const cards = buildCollection(FIXTURE);

  it('lists AO-7 first in reverse storage order, then IMAGE before LES-1; skips aborted and unknown', () => {
    expect(cards.map((c) => [c.address.noradId, c.address.ordinal])).toEqual([
      [7530, 1],
      [7530, 2],
      [7530, 3],
      [26113, 1],
      [1002, 1],
    ]);
    expect(cards.slice(0, 3).map((c) => c.model.kind)).toEqual([
      'demo-auto-point',
      'real-manual',
      'demo-auto-point',
    ]);
  });

  it('findCard returns each card by its address; ordinal 4 is undefined', () => {
    for (const card of cards) expect(findCard(cards, card.address)).toBe(card);
    expect(findCard(cards, { noradId: 7530, aosMs: NEW_AOS, ordinal: 4 })).toBeUndefined();
  });

  it('parseCardAddress accepts the segments of each href and rejects a non-numeric one', () => {
    for (const card of cards) {
      const [noradId, aosMs, n] = card.href.split('/').slice(2);
      expect(parseCardAddress({ noradId, aosMs, n })).toEqual(card.address);
    }
    expect(parseCardAddress({ noradId: '7530', aosMs: 'abc', n: '1' })).toBeNull();
  });
});

describe('Pass_Number across the collection (Property 7)', () => {
  it('is shared within one pass and distinct across the three passes', () => {
    const cards = buildCollection(FIXTURE);
    const ao7 = cards.slice(0, 3).map((c) => c.model.passNumber);
    expect(new Set(ao7).size).toBe(1);
    const passes = [ao7[0], cards[3].model.passNumber, cards[4].model.passNumber];
    expect(new Set(passes).size).toBe(3);
  });
});
