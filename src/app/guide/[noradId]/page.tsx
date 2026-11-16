'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PlayableEntry } from '../../../lib/catalog/index';
import { FIELD_COPY, GUIDE_NONE, getGuideEntry } from '../../../lib/field/index';
import type { GuideFact, GuideLink } from '../../../lib/field/index';
import { resolvePlayableEntry } from '../../../lib/session/index';
import { SESSION_COPY } from '../../../components/session/copy';

const FACT_ORDER = ['setup', 'illumination', 'frequency', 'modes', 'identity', 'sound', 'status'] as const;
const RECORDING_ORDER = ['archive', 'iqFile', 'analysis'] as const;

function modeText(entry: PlayableEntry): string {
  const mode = entry.beacon.beaconMode;
  if (mode === 'cw-beacon') return FIELD_COPY.guideModeCw;
  if (mode === 'telemetry') return FIELD_COPY.guideModeTelemetry;
  return FIELD_COPY.guideModeUnknown;
}

function SourceLink({ source }: { source: GuideLink }) {
  return (
    <>
      {FIELD_COPY.guideSourceLabel}:{' '}
      <a href={source.url} rel="noopener noreferrer" target="_blank">
        {source.label}
      </a>
    </>
  );
}

function GuideView({ entry }: { entry: PlayableEntry }) {
  const guide = getGuideEntry(entry.slug);
  const { beacon } = entry;
  const setup = guide?.facts.setup;
  const illumination = guide?.facts.illumination;
  const notes = FACT_ORDER.filter((key) => key !== 'setup' && key !== 'illumination')
    .map((key) => guide?.facts[key])
    .filter((fact): fact is GuideFact => fact !== undefined);
  const recordings = RECORDING_ORDER.map((key) => guide?.recordings[key]).filter(
    (link): link is GuideLink => link !== undefined,
  );

  return (
    <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
      <title>{`${FIELD_COPY.guideHeading} · ${entry.name} · zombieSatellite`}</title>
      <header>
        <h1>{FIELD_COPY.guideHeading}</h1>
        <h2>{entry.name}</h2>
      </header>

      <section className="guide-simple">
        <dl>
          <dt>{FIELD_COPY.guideFrequencyLabel}</dt>
          <dd>{beacon.displayFrequency ?? FIELD_COPY.noFrequencyNote}</dd>
          <dt>{FIELD_COPY.guideModeLabel}</dt>
          <dd>{modeText(entry)}</dd>
          <dt>{FIELD_COPY.guideIlluminationLabel}</dt>
          <dd>
            {beacon.sunlitOnly ? FIELD_COPY.guideSunlitOnly : FIELD_COPY.guideNotSunlitOnly}
            {illumination !== undefined ? (
              <span className="guide-source">
                {' '}
                · {illumination.text} <SourceLink source={illumination.source} />
              </span>
            ) : (
              <span className="guide-source"> · {GUIDE_NONE.illumination}</span>
            )}
          </dd>
          <dt>{FIELD_COPY.guideSetupLabel}</dt>
          <dd>
            {setup !== undefined ? (
              <>
                {setup.text} <span className="guide-source"><SourceLink source={setup.source} /></span>
              </>
            ) : (
              GUIDE_NONE.setup
            )}
          </dd>
        </dl>
      </section>

      <section className="guide-prose">
        <h3>{FIELD_COPY.guideNotesLabel}</h3>
        {notes.length === 0 ? (
          <p>{GUIDE_NONE.frequency}</p>
        ) : (
          <ul>
            {notes.map((fact) => (
              <li key={fact.text}>
                {fact.text}{' '}
                <span className="guide-source">
                  <SourceLink source={fact.source} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="guide-prose">
        <h3>{FIELD_COPY.guideRecordingsLabel}</h3>
        {recordings.length === 0 ? (
          <p>{GUIDE_NONE.recordings}</p>
        ) : (
          <ul>
            {recordings.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noopener noreferrer" target="_blank">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="guide-prose">
        <p>{FIELD_COPY.guideOwnEquipment}</p>
        <p>{SESSION_COPY.simulationNotice}</p>
        <p>
          <Link href={`/session/${entry.noradId}`}>Open session</Link> ·{' '}
          <Link href="/session">{FIELD_COPY.plannerBackLink}</Link>
        </p>
      </footer>
    </main>
  );
}

export default function GuidePage() {
  const params = useParams<{ noradId: string }>();
  const entry = resolvePlayableEntry(params?.noradId);

  if (entry === null) {
    return (
      <main data-tab="session" style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
        <title>{`${FIELD_COPY.plannerNotFoundHeading} · zombieSatellite`}</title>
        <h1>{FIELD_COPY.plannerNotFoundHeading}</h1>
        <p>{FIELD_COPY.plannerNotFoundText}</p>
        <p>
          <Link href="/session">{FIELD_COPY.plannerNotFoundLink}</Link>
        </p>
      </main>
    );
  }

  return <GuideView entry={entry} />;
}
