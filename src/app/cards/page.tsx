'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createQslBrowserDeps } from '../../components/qsl/browser-deps';
import { readCollection } from '../../components/qsl/collection-reader';
import { QSL_COPY, buildCardSvg, describeCard, svgDataUrl } from '../../lib/qsl/index';
import type { CollectionCard } from '../../lib/qsl/index';

export default function CardsPage() {
  // null on the server and on the first client render: neutral loading state.
  const [cards, setCards] = useState<readonly CollectionCard[] | null>(null);

  useEffect(() => {
    setCards(readCollection(createQslBrowserDeps().storage));
  }, []);

  return (
    <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>{QSL_COPY.collectionTitle}</title>
      <h1>{QSL_COPY.collectionTitle}</h1>
      <p>{QSL_COPY.collectionIntro}</p>
      {cards === null ? (
        <p>{QSL_COPY.loading}</p>
      ) : cards.length === 0 ? (
        <section>
          <p>{QSL_COPY.emptyState}</p>
          <p>
            <Link href="/session">{QSL_COPY.startSession}</Link>
          </p>
        </section>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {cards.map((card) => (
            <li key={card.href} style={{ marginBottom: '1rem' }}>
              <Link href={card.href}>
                <img
                  src={svgDataUrl(buildCardSvg(card.model))}
                  alt={describeCard(card.model)}
                  style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto' }}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
