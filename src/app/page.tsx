import Link from 'next/link';
import { listCatalogEntries } from '../lib/catalog/index';
import type { CatalogEntry } from '../lib/catalog/index';
import { SESSION_COPY } from '../components/session/copy';
import { SHELL_COPY } from '../components/shell/copy';


function EntryArticle({ entry }: { entry: CatalogEntry }) {
  return (
    <article className="card">
      <h3>{entry.name}</h3>
      <p>
        {entry.playable ? SHELL_COPY.playableLabel : SHELL_COPY.storyOnlyLabel} ·{' '}
        {SESSION_COPY.statusLabels[entry.status]}
      </p>
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
      {entry.playable ? (
        <p>
          <Link className="button" href={`/session/${entry.noradId}`}>{SHELL_COPY.openSession}</Link>
        </p>
      ) : (
        <p>{SHELL_COPY.unplayableReasons[entry.unplayableReason]}</p>
      )}
    </article>
  );
}

export default function HomePage() {
  return (
    <main data-tab="home" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <div className="hero">
        <div className="orbit" aria-hidden="true" />
        <h1>zombieSatellite</h1>
        <p>{SHELL_COPY.appStatement}</p>
      </div>
      <section className="plain">
        <p className="actions">
          <Link className="button primary" href="/session">{SHELL_COPY.startSession}</Link>{' '}<Link className="button" href="/cards">{SHELL_COPY.openCards}</Link>
        </p>
        <p>{SHELL_COPY.demoHint}</p>
      </section>
      <section className="plain">
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
