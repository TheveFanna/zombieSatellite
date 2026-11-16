'use client';
// The satellite archive (S10 design "Page responsibilities"): stories, lifelines, models and guide links.
import Link from 'next/link';
import { listCatalogEntries } from '../../lib/catalog/index';
import type { CatalogEntry } from '../../lib/catalog/index';
import { FIELD_COPY } from '../../lib/field/index';
import { SESSION_COPY } from '../session/copy';
import { SHELL_COPY } from '../shell/copy';
import { lifelineFor } from '../shell/history';
import { LifelineView } from '../shell/visuals/lifeline';
import { ModelViewer } from '../field/model-viewer';

function EntryArticle({ entry }: { entry: CatalogEntry }) {
  const line = lifelineFor(entry.noradId);
  return (
    <article className="card" id={entry.slug}>
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

export function CatalogList() {
  return (
    <section className="plain" id="catalog">
      {listCatalogEntries().map((entry) => (
        <EntryArticle key={entry.noradId} entry={entry} />
      ))}
    </section>
  );
}
