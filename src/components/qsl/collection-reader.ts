import type { KeyValueStorage } from '../pointing/deps';
import { readSessionResults } from '../session/result-store';
import { buildCollection } from '../../lib/qsl/index';
import type { CollectionCard } from '../../lib/qsl/index';

export function readCollection(storage: KeyValueStorage): readonly CollectionCard[] {
  return buildCollection(readSessionResults(storage));
}
