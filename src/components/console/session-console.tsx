'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PointerEvent, ReactNode, RefObject } from 'react';
import type { PlayableEntry } from '../../lib/catalog/index';
import { CALIBRATION_STEP_DEG } from '../../lib/pointing/index';
import type { MarkerPlacement } from '../../lib/shell/index';
import { FieldSessionPanel } from '../field/session-panel';
import type { FieldSessionSection } from '../field/session-panel';
import { ConsoleSheet } from './console-sheet';
import { ConsoleTabs } from './console-tabs';
import { StoryPanel } from './story-panel';
import { FIELD_COPY } from '../../lib/field/index';
import type { SkySampleOk } from '../../lib/field/index';
import type { LockResult } from '../../lib/pointing/index';
import { formatDopplerReadout, formatUtc } from '../../lib/session/index';
import type { SessionResult } from '../../lib/session/index';
import type { PassFieldSnapshot } from '../field/pass-field-controller';
import type { PointingSession, PointingSnapshot } from '../pointing/pointing-session';
import type { SessionController, SessionSnapshot } from '../session/session-controller';
import { SESSION_COPY } from '../session/copy';
import { SHELL_COPY } from '../shell/copy';
import { DopplerDial } from '../shell/visuals/doppler-dial';
import { AlignmentMeter } from './alignment-meter';
import { CONSOLE_COPY } from './copy';
import { CountdownRing } from './countdown-ring';
import { PassTimeline } from './pass-timeline';
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
  readonly onCopy: (text: string) => Promise<boolean>;
  readonly onDownloadCsv: (csv: string, aosMs: number) => void;
  /** Observer fields and location button, built by the page (landed handlers). */
  readonly observerControls: ReactNode;
  readonly placement: MarkerPlacement;
  readonly cameraOn: boolean;
  readonly cameraDisabled: boolean;
  readonly onToggleCamera: () => void;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
}

type DockSheet = 'story' | 'field' | 'settings' | 'doppler' | null;

const FIELD_TABS: ReadonlyArray<{ id: FieldSessionSection; label: string }> = [
  { id: 'overview', label: CONSOLE_COPY.tabOverview },
  { id: 'tuning', label: CONSOLE_COPY.tabTuning },
  { id: 'minutes', label: CONSOLE_COPY.tabMinutes },
  { id: 'map', label: CONSOLE_COPY.tabMap },
  { id: 'links', label: CONSOLE_COPY.tabLinks },
];

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(1);
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
  onCopy,
  onDownloadCsv,
  observerControls,
  placement,
  cameraOn,
  cameraDisabled,
  onToggleCamera,
  videoRef,
}: SessionConsoleProps) {
  const [sheet, setSheet] = useState<DockSheet>(null);
  const [fieldTab, setFieldTab] = useState<FieldSessionSection>('overview');
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

  const closeSheet = () => setSheet(null);
  const audioStatus = snapshot.audio.status;
  const live = phase === 'awaiting-pass' || phase === 'in-pass';

  function pointerOf(e: PointerEvent<HTMLDivElement>) {
    return { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };
  }

  function dragArea(label: string) {
    return (
      <div
        className="drag-area"
        style={{
          touchAction: 'none',
          marginTop: '0.5rem',
          height: '10rem',
          border: '1px dashed currentColor',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          controller?.pointerDown(pointerOf(e));
        }}
        onPointerMove={(e) => controller?.pointerMove(pointerOf(e))}
        onPointerUp={(e) => {
          controller?.pointerUp(pointerOf(e));
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => controller?.pointerUp(pointerOf(e))}
      >
        {label}
      </div>
    );
  }

  function closeSettings() {
    // The Sky_View camera stops when the sheet closes (S6 DD-2).
    if (cameraOn) onToggleCamera();
    closeSheet();
  }

  const inPassControls =
    phase !== 'in-pass' ? null : isDemo ? (
      <div>
        <h3>{CONSOLE_COPY.pointingHeading}</h3>
        <p>
          <button
            type="button"
            className="console-btn"
            aria-pressed={snapshot.pointingSource === 'auto'}
            onClick={() => controller?.setDemoPointing('auto')}
          >
            {CONSOLE_COPY.autoPoint}
          </button>{' '}
          <button
            type="button"
            className="console-btn"
            aria-pressed={snapshot.pointingSource === 'manual'}
            onClick={() => controller?.setDemoPointing('manual')}
          >
            {CONSOLE_COPY.manualPoint}
          </button>
        </p>
        <p>{SESSION_COPY.autoPointNote}</p>
        {snapshot.pointingSource === 'manual' ? dragArea(CONSOLE_COPY.dragAreaDemo) : null}
      </div>
    ) : (
      <div>
        <h3>{CONSOLE_COPY.motionHeading}</h3>
        {pointingSnapshot.permission === 'denied' ? <p role="alert">{CONSOLE_COPY.motionDenied}</p> : null}
        {pointingSnapshot.permission === 'requesting' ? <p>{CONSOLE_COPY.motionRequesting}</p> : null}
        {pointingSnapshot.permission === 'unavailable' ? <p>{CONSOLE_COPY.motionUnavailable}</p> : null}
        {pointingSnapshot.permission === 'granted' ? (
          <p>
            {CONSOLE_COPY.motionGranted} {pointingSnapshot.source ?? '—'}
          </p>
        ) : null}
        <h3>{SHELL_COPY.skyViewHeading}</h3>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <input type="checkbox" checked={cameraOn} onChange={onToggleCamera} disabled={cameraDisabled} />{' '}
          {SHELL_COPY.cameraToggle}
        </label>
        <div
          className="sky-view"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 4',
            overflow: 'hidden',
            border: '1px solid currentColor',
          }}
        >
          {cameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          {placement.kind === 'on-screen' ? (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${placement.leftPct}%`,
                top: `${placement.topPct}%`,
                width: '1.5rem',
                height: '1.5rem',
                marginLeft: '-0.75rem',
                marginTop: '-0.75rem',
                borderRadius: '50%',
                border: `3px solid ${snapshot.lock?.locked ? '#2ea043' : '#f0f6fc'}`,
                boxShadow: '0 0 0 1px #0d1117',
              }}
            />
          ) : (
            <p style={{ position: 'absolute', left: 0, right: 0, bottom: 0, margin: 0, padding: '0.5rem' }}>
              {placement.kind === 'out-of-view' ? SHELL_COPY.markerOutOfView : SHELL_COPY.noPointingYet}
            </p>
          )}
        </div>
        <label>
          <input
            type="checkbox"
            checked={pointingSnapshot.dragActive}
            onChange={() => pointing?.setDragEnabled(!pointingSnapshot.dragActive)}
          />{' '}
          {CONSOLE_COPY.dragCompass}
        </label>
        {dragArea(CONSOLE_COPY.dragAreaCompass)}
        <p>
          <button type="button" className="console-btn" onClick={() => pointing?.stepCalibration(-CALIBRATION_STEP_DEG)}>
            −{CALIBRATION_STEP_DEG}°
          </button>{' '}
          <button type="button" className="console-btn" onClick={() => pointing?.stepCalibration(CALIBRATION_STEP_DEG)}>
            +{CALIBRATION_STEP_DEG}°
          </button>{' '}
          {CONSOLE_COPY.offsetLabel}: {fmt(pointingSnapshot.calibrationOffsetDeg)}°
        </p>
      </div>
    );

  const sheets = (
    <>
      <ConsoleSheet open={sheet === 'story'} title={CONSOLE_COPY.sheetTitleStory} closeLabel={CONSOLE_COPY.sheetClose} onClose={closeSheet}>
        <StoryPanel entry={entry} />
      </ConsoleSheet>
      <ConsoleSheet open={sheet === 'field'} title={CONSOLE_COPY.sheetTitleField} closeLabel={CONSOLE_COPY.sheetClose} onClose={closeSheet}>
        <ConsoleTabs
          tabs={FIELD_TABS}
          selected={fieldTab}
          onSelect={(id) => setFieldTab(id as FieldSessionSection)}
          idPrefix="field"
        >
          <FieldSessionPanel
            entry={entry}
            snapshot={snapshot}
            field={field}
            onCopy={onCopy}
            onDownloadCsv={onDownloadCsv}
            sections={[fieldTab]}
          />
        </ConsoleTabs>
      </ConsoleSheet>
      <ConsoleSheet open={sheet === 'doppler'} title={CONSOLE_COPY.sheetTitleDoppler} closeLabel={CONSOLE_COPY.sheetClose} onClose={closeSheet}>
        <DopplerDial readout={snapshot.doppler} caption={SHELL_COPY.dialCaption} />
        <p>{SESSION_COPY.glideNote}</p>
      </ConsoleSheet>
      <ConsoleSheet open={sheet === 'settings'} title={CONSOLE_COPY.sheetTitleSettings} closeLabel={CONSOLE_COPY.sheetClose} onClose={closeSettings}>
        {live ? (
          <p className="console-row">
            {phase === 'awaiting-pass' ? (
              <button type="button" className="console-btn" onClick={onStartDemo} disabled={controller === null}>
                {CONSOLE_COPY.startDemoInstead}
              </button>
            ) : null}
            <button type="button" className="console-btn" onClick={() => controller?.abort()} disabled={controller === null}>
              {CONSOLE_COPY.abort}
            </button>
          </p>
        ) : null}
        <h3>{CONSOLE_COPY.observerHeading}</h3>
        {observerControls}
        {inPassControls}
        <h3>{CONSOLE_COPY.soundHeading}</h3>
        {audioStatus === 'off' || audioStatus === 'suspended' ? (
          <p>
            <button type="button" className="console-btn" onClick={() => controller?.enableAudio()} disabled={controller === null}>
              {SESSION_COPY.enableSound}
            </button>
          </p>
        ) : null}
        {audioStatus === 'unavailable' ? <p>{SESSION_COPY.audioUnavailable}</p> : null}
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <input type="checkbox" checked={snapshot.audio.muted} onChange={(e) => controller?.setMuted(e.target.checked)} />{' '}
          {CONSOLE_COPY.mute}
        </label>
        <label style={{ display: 'block' }}>
          {CONSOLE_COPY.volume}{' '}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snapshot.audio.volume}
            onChange={(e) => controller?.setVolume(Number(e.target.value))}
          />
        </label>
      </ConsoleSheet>
    </>
  );

  const dock = (
    <nav className="dock">
      <button type="button" className="console-btn dockBtn" onClick={() => setSheet('story')}>
        {CONSOLE_COPY.dockStory}
      </button>
      <button type="button" className="console-btn dockBtn" onClick={() => setSheet('field')}>
        {CONSOLE_COPY.dockField}
      </button>
      <button type="button" className="console-btn dockBtn" onClick={() => setSheet('settings')}>
        {CONSOLE_COPY.dockSettings}
      </button>
    </nav>
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
        {dock}
        {sheets}
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
          <CountdownRing mode="awaiting" countdownMs={snapshot.countdownMs} />
        ) : (
          <div className="console-row">
            {targetPass !== null ? (
              <CountdownRing
                mode="in-pass"
                countdownMs={null}
                nowMs={snapshot.sessionInstantMs}
                riseMs={targetPass.riseMs}
                setMs={targetPass.setMs}
              />
            ) : null}
            <span className="console-badge">{lockBadge}</span>
            <button type="button" className="console-btn" onClick={() => setSheet('doppler')}>
              {CONSOLE_COPY.dopplerLabel}: {snapshot.doppler === null ? '—' : formatDopplerReadout(snapshot.doppler)}
            </button>
            <button
              type="button"
              className="console-btn"
              aria-pressed={snapshot.audio.muted}
              onClick={() => controller?.setMuted(!snapshot.audio.muted)}
              disabled={controller === null}
            >
              {CONSOLE_COPY.mute}
            </button>
            <span>{snapshot.sessionInstantMs === null ? '—' : formatUtc(snapshot.sessionInstantMs)}</span>
          </div>
        )}
        {targetPass !== null ? (
          <PassTimeline
            riseMs={targetPass.riseMs}
            peakMs={targetPass.peakMs}
            setMs={targetPass.setMs}
            nowMs={phase === 'in-pass' ? snapshot.sessionInstantMs : null}
          />
        ) : null}
        {phase === 'in-pass' ? <p>{SHELL_COPY.dialCaption}</p> : null}
        <p className="console-row">
          <button type="button" className="console-btn console-ar" onClick={onOpenAr}>
            {FIELD_COPY.arOpen}
          </button>
          {phase === 'awaiting-pass' ? (
            <button type="button" className="console-btn" onClick={onStartDemo} disabled={controller === null}>
              {CONSOLE_COPY.demoShort}
            </button>
          ) : null}
        </p>
      </section>
      {dock}
      {sheets}
      {footer}
    </div>
  );
}
