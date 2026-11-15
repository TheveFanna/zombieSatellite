import { listPlayableEntries } from '../catalog/index';
import type { PlayableEntry } from '../catalog/index';

/** A route parameter to the Playable_Entry with that NORAD ID, or null for anything else. */
export function resolvePlayableEntry(raw: string | undefined | null): PlayableEntry | null {
  if (typeof raw !== 'string' || !/^[1-9][0-9]{0,4}$/.test(raw)) return null;
  const noradId = Number(raw);
  return listPlayableEntries().find((entry) => entry.noradId === noradId) ?? null;
}
