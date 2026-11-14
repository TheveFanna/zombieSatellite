import type { TleRecord } from './tle-parser';

/** One cached TLE. */
export interface CacheEntry {
  /** The frozen record that the fetcher returns to callers. */
  readonly record: TleRecord;
  /** Cache_Clock reading, in ms, at the instant the request ended in a TleRecord. */
  readonly storedAtMs: number;
}

/**
 * Internal (not exported from index.ts). In-memory store of entries keyed by NORAD catalog number;
 * a new cache holds no entries (Requirement 5, criteria 1 and 9).
 *
 * The cache reads no clock and decides no freshness: the fetcher compares `storedAtMs` with its
 * Cache_Clock reading (criteria 3, 4 and 12). Entries are never deleted. An expired entry stays
 * until a successful request replaces it, and a failed request leaves every entry untouched
 * (criteria 5 and 6).
 */
export class TleCache {
  private readonly entries = new Map<number, CacheEntry>();

  get(noradId: number): CacheEntry | undefined {
    return this.entries.get(noradId);
  }

  /** Stores `entry` as the only entry for `noradId`, replacing any previous one. */
  set(noradId: number, entry: CacheEntry): void {
    this.entries.set(noradId, entry);
  }

  /** Number of entries. */
  get size(): number {
    return this.entries.size;
  }
}
