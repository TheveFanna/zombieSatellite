// Feature: seance-session, Property 12: Statistics fixture
// **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.10**
import { describe, expect, it } from 'vitest';
import {
  buildSessionResult,
  closeLockStats,
  EMPTY_LOCK_STATS,
  reduceLockStats,
  type LockObservation,
} from '../../src/lib/session/index';

const MAX_HOLD_MS = 100_000;
const lock = (pointingErrorDeg: number, locked: boolean) => ({ pointingErrorDeg, locked, autoPoint: true });

const OBSERVATIONS: readonly LockObservation[] = [
  { instantMs: 1_000_000, lock: lock(5, true) },
  { instantMs: 1_100_000, lock: lock(12, false) },
  { instantMs: 1_200_000, lock: lock(3, true) },
  { instantMs: 1_300_000, lock: null },
  { instantMs: 1_400_000, lock: lock(8, true) },
];

describe('Property 12: Statistics fixture', () => {
  it('folds the hand-computed fixture into the expected Session_Result', () => {
    const folded = OBSERVATIONS.reduce((stats, o) => reduceLockStats(stats, o, MAX_HOLD_MS), EMPTY_LOCK_STATS);
    const closed = closeLockStats(folded, 1_600_000, MAX_HOLD_MS);
    const result = buildSessionResult(
      {
        noradId: 7530,
        pass: {
          riseMs: 1_000_000,
          peakMs: 1_300_000,
          setMs: 1_600_000,
          maxElevationDeg: 42,
          durationMin: 10,
          startTruncated: false,
          endTruncated: false,
        },
        endMs: 1_600_000,
        completed: true,
        mode: 'demo',
      },
      closed,
    );
    expect(result).toEqual({
      noradId: 7530,
      aosMs: 1_000_000,
      losMs: 1_600_000,
      maxElevationDeg: 42,
      lockedSeconds: 300,
      bestPointingErrorDeg: 3,
      lockedRatio: 0.5,
      completed: true,
      mode: 'demo',
      autoPointUsed: true,
    });
  });
});
