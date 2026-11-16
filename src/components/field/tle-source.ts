import { createSatrec } from '../../lib/orbit/index';
import type { Satrec, TleFetcher, TleRecord } from '../../lib/orbit/index';

export interface TleSource {
  load(): Promise<{ tle: TleRecord; satrec: Satrec }>;
}

/** One fetch through the shared fetcher (its cache and in-flight de-duplication apply), then one Satrec. */
export function createTleSource(fetcher: TleFetcher, noradId: number): TleSource {
  return {
    async load() {
      const tle = await fetcher.fetchTle(noradId);
      return { tle, satrec: createSatrec(tle) };
    },
  };
}
