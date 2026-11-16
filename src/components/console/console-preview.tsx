// Temporary preview switch (S8 task 9, deleted in task 11): `?console=1` shows the Console_Home.
'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { listCatalogEntries } from '../../lib/catalog/index';
import { FIELD_COPY } from '../../lib/field/index';
import { FirstRunGuide } from '../field/first-run-guide';
import { SHELL_COPY } from '../shell/copy';
import { GhostSky } from '../shell/visuals/sky-dome';
import { ConsoleHome } from './console-home';

// The home page only introduces the app and routes to its pages (S10 "Page responsibilities").
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
      <div className="contest">
        <p className="contest-kicker">{SHELL_COPY.contestHeading}</p>
        <p>{SHELL_COPY.contestBody}</p>
        <p className="contest-note">{SHELL_COPY.contestProvenance}</p>
        <p className="contest-links">
          <a href="https://github.com/TheveFanna/zombieSatellite" rel="noopener noreferrer" target="_blank">
            {SHELL_COPY.contestSource}
          </a>
          <a href="https://github.com/TheveFanna/zombieSatellite/tree/main/.kiro/specs" rel="noopener noreferrer" target="_blank">
            {SHELL_COPY.contestSpecs}
          </a>
        </p>
      </div>
      <section className="plain">
        <div className="entry-grid">
          <Link className="card entry entry-wide" href="/ar">
            <h3>{SHELL_COPY.entryArTitle}</h3>
            <p className="entry-body">{SHELL_COPY.entryArBody}</p>
          </Link>
          <Link className="card entry" href="/session">
            <h3>{SHELL_COPY.entryPassesTitle}</h3>
            <p className="entry-body">{SHELL_COPY.entryPassesBody}</p>
          </Link>
          <Link className="card entry" href="/catalog">
            <h3>{SHELL_COPY.entryArchiveTitle}</h3>
            <p className="entry-body">{SHELL_COPY.entryArchiveBody}</p>
          </Link>
          <Link className="card entry" href="/cards">
            <h3>{SHELL_COPY.openCards}</h3>
            <p className="entry-body">{SHELL_COPY.entryCardsBody}</p>
          </Link>
          <Link className="card entry" href="/log">
            <h3>{FIELD_COPY.logLink}</h3>
            <p className="entry-body">{SHELL_COPY.entryLogBody}</p>
          </Link>
        </div>
      </section>
      <FirstRunGuide />
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
