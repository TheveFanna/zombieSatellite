// Temporary preview switch (S8 task 9, deleted in task 11): `?console=1` shows the Console_Home.
'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { listCatalogEntries } from '../../lib/catalog/index';
import type { CatalogEntry } from '../../lib/catalog/index';
import { FIELD_COPY } from '../../lib/field/index';
import { FirstRunGuide } from '../field/first-run-guide';
import { ModelViewer } from '../field/model-viewer';
import { SESSION_COPY } from '../session/copy';
import { SHELL_COPY } from '../shell/copy';
import { lifelineFor } from '../shell/history';
import { GhostSky } from '../shell/visuals/sky-dome';
import { LifelineView } from '../shell/visuals/lifeline';
import { ConsoleHome } from './console-home';

function EntryArticle({ entry }: { entry: CatalogEntry }) {
  const line = lifelineFor(entry.noradId);
  return (
    <article className="card">
      <h3>{entry.name}</h3>
      <p>
        {entry.playable ? SHELL_COPY.playableLabel : SHELL_COPY.storyOnlyLabel} ·{' '}
        {SESSION_COPY.statusLabels[entry.status]}
      </p>
      {line === null ? null : <LifelineView data={line} storyOnly={!entry.playable} />}
      <p>{entry.hook}</p>
      <details>
        <summary>{SHELL_COPY.historyLabel}</summary>
        <p>{entry.story}</p>
        <ul>
          {entry.sourceUrls.map((url, index) => (
            <li key={url}>
              <a href={url} rel="noopener noreferrer" target="_blank">
                {`${SHELL_COPY.sourceLabel} ${String(index + 1)}`}
              </a>
            </li>
          ))}
        </ul>
      </details>
      <ModelViewer slug={entry.slug} />
      {entry.playable ? (
        <p>
          <Link className="button" href={`/session/${entry.noradId}`}>{SHELL_COPY.openSession}</Link>{' '}
          <Link className="button" href={`/planner/${entry.noradId}`}>{FIELD_COPY.plannerLink}</Link>{' '}
          <Link className="button" href={`/guide/${entry.noradId}`}>{FIELD_COPY.guideLink}</Link>
        </p>
      ) : (
        <p>{SHELL_COPY.unplayableReasons[entry.unplayableReason]}</p>
      )}
    </article>
  );
}

function LandedHome() {
  return (
    <main data-tab="home" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <div className="hero">
        <GhostSky entries={listCatalogEntries()} />
        <p className="kicker">zombieSatellite</p>
        <h1>
          <span>{SHELL_COPY.heroLine1}</span> <span>{SHELL_COPY.heroLine2}</span>
        </h1>
        <p>{SHELL_COPY.appStatement}</p>
      </div>
      <section className="plain">
        <p className="actions">
          <Link className="button primary" href="/session">{SHELL_COPY.startSession}</Link>{' '}<Link className="button" href="/cards">{SHELL_COPY.openCards}</Link>{' '}
          <Link className="button" href="/log">{FIELD_COPY.logLink}</Link>
        </p>
        <p>{SHELL_COPY.demoHint}</p>
      </section>
      <FirstRunGuide />
      <section className="plain" id="catalog">
        <h2>{SHELL_COPY.catalogHeading}</h2>
        {listCatalogEntries().map((entry) => (
          <EntryArticle key={entry.noradId} entry={entry} />
        ))}
      </section>
      <footer>
        <p>{SHELL_COPY.honestyFooter}</p>
      </footer>
    </main>
  );
}

function PreviewSwitch() {
  const params = useSearchParams();
  return params.get('console') === '1' ? <ConsoleHome /> : <LandedHome />;
}

export function ConsolePreview() {
  return (
    <Suspense fallback={<LandedHome />}>
      <PreviewSwitch />
    </Suspense>
  );
}
