'use client';
// Story_Card of the AR tab (S11 Requirement 7): the story of the satellite, in a small card over the bottom panel.
import Link from 'next/link';
import type { PlayableEntry } from '../../lib/catalog/index';
import { SHELL_COPY } from '../shell/copy';

export function StoryCard({ entry, onClose }: { entry: PlayableEntry; onClose: () => void }) {
  return (
    <section className="ar-story" role="dialog" aria-label={entry.name}>
      <div className="ar-story-head">
        <strong>{entry.name}</strong>
        <button type="button" onClick={onClose} aria-label={SHELL_COPY.closeLabel}>
          ✕
        </button>
      </div>
      <p className="ar-story-hook">{entry.hook}</p>
      <p className="ar-story-body">{entry.story}</p>
      <Link className="ar-story-link" href={`/catalog#${entry.slug}`}>
        {SHELL_COPY.storyLink}
      </Link>
    </section>
  );
}
