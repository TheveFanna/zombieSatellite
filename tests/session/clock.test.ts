// Feature: seance-session, Property 4: Virtual_Clock advance
// **Validates: Requirements 3.2, 3.11**
import { describe, expect, it } from 'vitest';
import { virtualInstantMs } from '../../src/lib/session/index';

describe('Property 4: Virtual_Clock advance', () => {
  const anchor = { anchorRealMs: 1_794_000_000_000, anchorSessionMs: 1_794_100_000_000 };

  it('starts at the session anchor', () => {
    expect(virtualInstantMs(anchor, anchor.anchorRealMs)).toBe(anchor.anchorSessionMs);
  });

  it.each([1000, 10_000])('advances 60 × d after a real advance of %i ms', (d) => {
    const before = virtualInstantMs(anchor, anchor.anchorRealMs + 5000);
    expect(virtualInstantMs(anchor, anchor.anchorRealMs + 5000 + d) - before).toBe(60 * d);
  });
});
