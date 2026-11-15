import { getCatalogEntry } from '../catalog/index';
import type { NoradId } from '../catalog/index';
import type { SessionResult } from '../session/index';
import { buildCardModel } from './card-model';
import { QSL_COPY } from './copy';
import type { CardAddress, CollectionCard } from './types';

export function cardHref(address: CardAddress): string {
  return `/cards/${address.noradId}/${address.aosMs}/${address.ordinal}`;
}

export function buildCollection(results: readonly SessionResult[]): readonly CollectionCard[] {
  const kept: { result: SessionResult; index: number; entry: NonNullable<ReturnType<typeof getCatalogEntry>> }[] = [];
  results.forEach((result, index) => {
    if (!result.completed) return;
    const entry = getCatalogEntry(result.noradId);
    if (entry === undefined) return;
    kept.push({ result, index, entry });
  });
  kept.sort((a, b) => b.result.aosMs - a.result.aosMs || b.index - a.index);

  const counts = new Map<string, number>();
  const cards: CollectionCard[] = [];
  for (const { result, entry } of kept) {
    const model = buildCardModel(result, entry);
    if (model === null) continue;
    const key = `${result.noradId}:${result.aosMs}`;
    const ordinal = (counts.get(key) ?? 0) + 1;
    counts.set(key, ordinal);
    const address: CardAddress = Object.freeze({
      noradId: entry.noradId,
      aosMs: result.aosMs,
      ordinal,
    });
    cards.push(
      Object.freeze({
        model,
        address,
        href: cardHref(address),
        statusLabel: QSL_COPY.statusLabels[entry.status],
        fileBaseName: `zombiesatellite-qsl-${model.passNumber}-${ordinal}`,
      }),
    );
  }
  return Object.freeze(cards);
}

// params: the three route segments by name, `{ noradId, aosMs, n }`. Next.js
// `useParams()` output fits; only plain strings are accepted.
export function parseCardAddress(params: {
  readonly noradId?: unknown;
  readonly aosMs?: unknown;
  readonly n?: unknown;
}): CardAddress | null {
  const { noradId, aosMs, n } = params;
  if (typeof noradId !== 'string' || !/^[1-9]\d{0,4}$/.test(noradId)) return null;
  if (typeof aosMs !== 'string' || !/^-?(0|[1-9]\d*)$/.test(aosMs)) return null;
  if (typeof n !== 'string' || !/^[1-9]\d*$/.test(n)) return null;
  const aos = Number(aosMs);
  const ordinal = Number(n);
  if (!Number.isSafeInteger(aos) || !Number.isSafeInteger(ordinal)) return null;
  return { noradId: Number(noradId) as NoradId, aosMs: aos, ordinal };
}

export function findCard(
  cards: readonly CollectionCard[],
  address: CardAddress,
): CollectionCard | undefined {
  return cards.find(
    (c) =>
      c.address.noradId === address.noradId &&
      c.address.aosMs === address.aosMs &&
      c.address.ordinal === address.ordinal,
  );
}
