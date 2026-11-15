'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createCardDownloader } from '../../../../../components/qsl/card-download';
import { createQslBrowserDeps } from '../../../../../components/qsl/browser-deps';
import { readCollection } from '../../../../../components/qsl/collection-reader';
import {
  QSL_COPY,
  buildCardSvg,
  cardFields,
  describeCard,
  findCard,
  parseCardAddress,
  svgDataUrl,
} from '../../../../../lib/qsl/index';
import type { CollectionCard } from '../../../../../lib/qsl/index';

export default function CardDetailPage() {
  const params = useParams();
  const noradId = params?.noradId;
  const aosMs = params?.aosMs;
  const n = params?.n;

  // undefined on the server and on the first client render: neutral loading
  // state. null: not found or unparsable address.
  const [card, setCard] = useState<CollectionCard | null | undefined>(undefined);
  const [pngFailed, setPngFailed] = useState(false);

  useEffect(() => {
    const address = parseCardAddress({ noradId, aosMs, n });
    if (address === null) {
      setCard(null);
      return;
    }
    const found = findCard(readCollection(createQslBrowserDeps().storage), address);
    setCard(found ?? null);
  }, [noradId, aosMs, n]);

  const backLink = (
    <p>
      <Link href="/cards">{QSL_COPY.backToCollection}</Link>
    </p>
  );

  if (card === undefined) {
    return (
      <main data-tab="cards" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
        <p>{QSL_COPY.loading}</p>
      </main>
    );
  }

  if (card === null) {
    return (
      <main data-tab="cards" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
        <p>{QSL_COPY.notFound}</p>
        {backLink}
      </main>
    );
  }

  const { model } = card;
  const svg = buildCardSvg(model);

  function onDownloadSvg() {
    createCardDownloader(createQslBrowserDeps().download).downloadSvg(svg, card!.fileBaseName);
  }

  async function onDownloadPng() {
    setPngFailed(false);
    const outcome = await createCardDownloader(createQslBrowserDeps().download).downloadPng(
      svg,
      card!.fileBaseName,
    );
    if (!outcome.ok) setPngFailed(true);
  }

  return (
    <main data-tab="cards" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <img
        src={svgDataUrl(svg)}
        alt={describeCard(model)}
        style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto' }}
      />
      <dl>
        <dt>{QSL_COPY.labels.kind}</dt>
        <dd>{QSL_COPY.kindLabels[model.kind]}</dd>
        {cardFields(model).map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
        <dt>{QSL_COPY.labels.status}</dt>
        <dd>{card.statusLabel}</dd>
      </dl>
      <p>{model.simulatedNotice[0]}</p>
      <p>{model.simulatedNotice[1]}</p>
      <p>
        <button type="button" onClick={onDownloadSvg}>
          {QSL_COPY.downloadSvg}
        </button>{' '}
        <button type="button" onClick={onDownloadPng}>
          {QSL_COPY.downloadPng}
        </button>
      </p>
      {pngFailed ? <p role="alert">{QSL_COPY.pngFailed}</p> : null}
      {backLink}
    </main>
  );
}
