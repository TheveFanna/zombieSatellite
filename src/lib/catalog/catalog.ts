import { deepFreeze } from './deep-freeze';
import { RAW_ENTRIES } from './entries';
import type { CatalogEntry, NoradId, PlayableEntry } from './types';

const ENTRIES: readonly CatalogEntry[] = deepFreeze(RAW_ENTRIES);
const PLAYABLE: readonly PlayableEntry[] = Object.freeze(
  ENTRIES.filter((entry): entry is PlayableEntry => entry.playable),
);

/** All 7 Catalog_Entries in Entry overview order (D2). Same frozen array on every call. */
export function listCatalogEntries(): readonly CatalogEntry[] {
  return ENTRIES;
}

/**
 * The Catalog_Entry with this NORAD_ID, the same reference as in listCatalogEntries() (D3),
 * or undefined for any other value, including invalid ones (D6). Never throws.
 */
export function getCatalogEntry(noradId: NoradId): CatalogEntry | undefined {
  return ENTRIES.find((entry) => entry.noradId === noradId);
}

/** The 5 Playable_Entries in Entry overview order (D2). Same frozen array on every call. */
export function listPlayableEntries(): readonly PlayableEntry[] {
  return PLAYABLE;
}
