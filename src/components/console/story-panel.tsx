import type { CatalogEntry } from '../../lib/catalog/index';
import { ModelViewer } from '../field/model-viewer';
import { SESSION_COPY } from '../session/copy';
import { SHELL_COPY } from '../shell/copy';
import { lifelineFor } from '../shell/history';
import { LifelineView } from '../shell/visuals/lifeline';

export interface StoryPanelProps {
  readonly entry: CatalogEntry;
}

/** The landed home `EntryArticle` content (story, history, sources, lifeline, Model_Viewer), presentational. */
export function StoryPanel({ entry }: StoryPanelProps) {
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
      {entry.playable ? null : <p>{SHELL_COPY.unplayableReasons[entry.unplayableReason]}</p>}
    </article>
  );
}
