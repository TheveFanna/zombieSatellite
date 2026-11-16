'use client';
// Story_Card of the AR tab (S11 Requirement 7, round 2 Requirement 10): hook, facts and short paragraphs.
import Link from 'next/link';
import type { PlayableEntry } from '../../lib/catalog/index';
import { SESSION_COPY } from '../session/copy';
import { SHELL_COPY } from '../shell/copy';

/** Groups the sentences of the story into paragraphs of two sentences each. */
export function storyParagraphs(story: string): string[] {
  const sentences = story.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(' '));
  return out;
}

export function StoryCard({ entry, onClose }: { entry: PlayableEntry; onClose: () => void }) {
  return (
    <section className="ar-story" role="dialog" aria-label={entry.name}>
      <div className="ar-story-head">
        <div>
          <p className="ar-story-kicker">{entry.orbitLabel ?? entry.slug}</p>
          <strong>{entry.name}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label={SHELL_COPY.closeLabel}>
          ✕
        </button>
      </div>
      <blockquote className="ar-story-quote">{entry.hook}</blockquote>
      <div className="ar-facts">
        <div>
          <span>Launched</span>
          <b>{entry.launchDate ?? '—'}</b>
        </div>
        <div>
          <span>Operator</span>
          <b>{entry.operatorOrigin}</b>
        </div>
        <div>
          <span>Difficulty</span>
          <b>{entry.difficulty}</b>
        </div>
        <div>
          <span>Status</span>
          <b>{SESSION_COPY.statusLabels[entry.status]}</b>
        </div>
      </div>
      <div className="ar-story-body">
        {storyParagraphs(entry.story).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <Link className="ar-story-link" href={`/catalog#${entry.slug}`}>
        {SHELL_COPY.storyLink} →
      </Link>
    </section>
  );
}
