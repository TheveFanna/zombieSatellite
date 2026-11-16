import Link from 'next/link';
import { useMemo } from 'react';
import type { PlayableEntry } from '../../lib/catalog/index';
import { FIELD_COPY } from '../../lib/field/index';
import type { SkySampleOk } from '../../lib/field/index';
import type { LockResult } from '../../lib/pointing/index';
import { formatCountdown, formatDopplerReadout, formatUtc } from '../../lib/session/index';
import type { SessionResult } from '../../lib/session/index';
import type { PassFieldSnapshot } from '../field/pass-field-controller';
import type { PointingSession, PointingSnapshot } from '../pointing/pointing-session';
import type { SessionController, SessionSnapshot } from '../session/session-controller';
import { SESSION_COPY } from '../session/copy';
import { SHELL_COPY } from '../shell/copy';
import { DopplerDial } from '../shell/visuals/doppler-dial';
import { AlignmentMeter } from './alignment-meter';
import { CONSOLE_COPY } from './copy';
import { RadarPanel } from './radar-panel';

export interface SessionConsoleProps {
  readonly entry: PlayableEntry;
  readonly snapshot: SessionSnapshot;
  readonly pointingSnapshot: PointingSnapshot;
  readonly field: PassFieldSnapshot;
  readonly pointing: PointingSession | null;
  readonly controller: SessionController | null;
  readonly onOpenAr: () => void;
  readonly onStartDemo: () => void;
}

/** Pointing_Error source (design C3): sensor in real time reads the pointing snapshot, otherwise the session snapshot. */
function selectLock(snapshot: SessionSnapshot, pointingSnapshot: PointingSnapshot): LockResult | null {
  if (snapshot.phase !== 'in-pass' || snapshot.orbitDataMissing) return null;
  if (snapshot.clockMode === 'real' && snapshot.pointingSource === 'sensor') return pointingSnapshot.lock;
  return snapshot.lock;
}

function ResultView({ result }: { result: SessionResult }) {
  return (
    <dl>
      <dt>{CONSOLE_COPY.resultLockedTime}</dt>
      <dd>{Math.round(result.lockedSeconds)} s</dd>
      <dt>{CONSOLE_COPY.resultLockedRatio}</dt>
      <dd>{(result.lockedRatio * 100).toFixed(1)} %</dd>
      <dt>{CONSOLE_COPY.resultBestError}</dt>
      <dd>{result.bestPointingErrorDeg === null ? '—' : `${result.bestPointingErrorDeg.toFixed(1)}°`}</dd>
      <dt>{CONSOLE_COPY.resultOutcome}</dt>
      <dd>{result.completed ? CONSOLE_COPY.resultCompleted : CONSOLE_COPY.resultAborted}</dd>
      <dt>{CONSOLE_COPY.resultMode}</dt>
      <dd>{result.mode === 'demo' ? CONSOLE_COPY.demoUnit : CONSOLE_COPY.realUnit}</dd>
    </dl>
  );
}

export function SessionConsole({
  entry,
  snapshot,
  pointingSnapshot,
  field,
  pointing,
  controller,
  onOpenAr,
  onStartDemo,
}: SessionConsoleProps) {
  const { phase, targetPass } = snapshot;
  const { beacon } = entry;
  const isDemo = snapshot.clockMode === 'demo';
  const lock = selectLock(snapshot, pointingSnapshot);
  const missing = snapshot.orbitDataMissing || snapshot.target === null;
  const satellite = phase === 'in-pass' && !missing ? snapshot.target : null;
  const track = field.track;

  const passMarks = useMemo(() => {
    if (track === null) return null;
    const ok = track.samples.filter((s): s is SkySampleOk => s.ok);
    if (ok.length === 0) return null;
    const peak = ok.reduce((best, s) => (s.elevationDeg > best.elevationDeg ? s : best), ok[0]);
    return { aos: ok[0], peak, los: ok[ok.length - 1] };
  }, [track]);

  const reticle =
    lock === null || lock.deviceHeadingDeg === null
      ? null
      : { headingDeg: lock.deviceHeadingDeg, pitchDeg: lock.devicePitchDeg };
  const needsSensors = !isDemo && (pointingSnapshot.permission === 'unknown' || pointingSnapshot.permission === 'denied');

  const header = (
    <header className="console-header">
      <h1>{entry.name}</h1>
      <p>
        {CONSOLE_COPY.difficultyLabel}: {entry.difficulty} · {SESSION_COPY.statusLabels[entry.status]} ·{' '}
        <span className="console-chip">{CONSOLE_COPY.utcChip}</span>
      </p>
      <p>
        {CONSOLE_COPY.downlinkLabel}: {beacon.displayFrequency ?? SESSION_COPY.noFrequency}
      </p>
      {beacon.sunlitOnly ? <p>{SESSION_COPY.sunlitNote}</p> : null}
      {snapshot.shadowSilent ? <p>{FIELD_COPY.shadowSilenceNote}</p> : null}
      {beacon.downlinkMhz === null ? <p>{SESSION_COPY.imageNote}</p> : null}
      <p>{SESSION_COPY.utcNote}</p>
      <p>
        <Link href="/session">{CONSOLE_COPY.allSatellites}</Link>
      </p>
    </header>
  );

  const footer = (
    <footer className="console-footer">
      <p>{SESSION_COPY.simulationNotice}</p>
    </footer>
  );

  if (phase === 'selecting') {
    return (
      <div className="console-main">
        {header}
        {footer}
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="console-main">
        {header}
        <section className="console-section">
          <h2>{CONSOLE_COPY.sessionResultHeading}</h2>
          {snapshot.result !== null ? <ResultView result={snapshot.result} /> : null}
          <button type="button" className="console-btn" onClick={() => controller?.newSession()} disabled={controller === null}>
            {CONSOLE_COPY.newSession}
          </button>
          <p>
            <Link href="/cards">{CONSOLE_COPY.viewCards}</Link>
          </p>
        </section>
        {footer}
      </div>
    );
  }

  const lockBadge = lock === null ? CONSOLE_COPY.lockBadgeNone : lock.locked ? CONSOLE_COPY.lockBadgeOn : CONSOLE_COPY.lockBadgeOff;

  return (
    <div className="console-main">
      {header}
      <section className="console-section">
        <h2>{phase === 'in-pass' ? CONSOLE_COPY.inPassHeading : CONSOLE_COPY.waitingHeading}</h2>
        {phase === 'in-pass' && snapshot.joined ? <p>{SESSION_COPY.joinNote}</p> : null}
        {targetPass !== null ? (
          <p>
            {CONSOLE_COPY.targetPassLabel}: {formatUtc(targetPass.riseMs)} to {formatUtc(targetPass.setMs)}
          </p>
        ) : null}
        <div className="console-radar">
          <RadarPanel
            satellite={satellite}
            path={field.track}
            passMarks={passMarks}
            reticle={reticle}
            locked={lock?.locked ?? false}
            sunlitOnly={beacon.sunlitOnly === true}
            profile={field.profile}
            sweep
            emptyText={CONSOLE_COPY.radarEmpty}
          />
          {phase === 'in-pass' ? (
            <div className="console-meter">
              {needsSensors ? (
                <button type="button" className="console-btn" onClick={() => pointing?.requestPermission()} disabled={pointing === null}>
                  {pointingSnapshot.permission === 'denied' ? 'Try again' : CONSOLE_COPY.meterEnableSensors}
                </button>
              ) : (
                <AlignmentMeter errorDeg={lock?.pointingErrorDeg ?? null} locked={lock?.locked ?? false} behind={lock?.behind ?? false} />
              )}
            </div>
          ) : null}
        </div>
        {phase === 'awaiting-pass' ? (
          <p className="console-countdown">{snapshot.countdownMs === null ? '—' : formatCountdown(snapshot.countdownMs)}</p>
        ) : (
          <div className="console-row">
            <span className="console-badge">{lockBadge}</span>
            <span>
              {CONSOLE_COPY.dopplerLabel}: {snapshot.doppler === null ? '—' : formatDopplerReadout(snapshot.doppler)}
            </span>
            <span>{snapshot.sessionInstantMs === null ? '—' : formatUtc(snapshot.sessionInstantMs)}</span>
          </div>
        )}
        {phase === 'in-pass' ? (
          <div>
            <DopplerDial readout={snapshot.doppler} caption={SHELL_COPY.dialCaption} />
            <p>{SESSION_COPY.glideNote}</p>
          </div>
        ) : null}
        <p className="console-row">
          <button type="button" className="console-btn console-ar" onClick={onOpenAr}>
            {FIELD_COPY.arOpen}
          </button>
          {phase === 'awaiting-pass' ? (
            <button type="button" className="console-btn" onClick={onStartDemo} disabled={controller === null}>
              {CONSOLE_COPY.startDemoInstead}
            </button>
          ) : null}
          <button type="button" className="console-btn" onClick={() => controller?.abort()} disabled={controller === null}>
            {CONSOLE_COPY.abort}
          </button>
        </p>
      </section>
      {footer}
    </div>
  );
}
