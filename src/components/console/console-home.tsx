// S8 Console_Home (design "Console home", Requirements 7 to 9).
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { listCatalogEntries } from '../../lib/catalog/index';
import { FIELD_COPY, buildSkyTrack } from '../../lib/field/index';
import type { SkySampleOk } from '../../lib/field/index';
import { formatUtc, parseCoordinateInput } from '../../lib/session/index';
import { formatLocalTimeNote } from '../../lib/shell/index';
import { createFieldBrowserDeps } from '../field/browser-deps';
import { FirstRunGuide } from '../field/first-run-guide';
import { createPickerBrowserDeps } from '../session/browser-deps';
import { SESSION_COPY } from '../session/copy';
import { createObserverStore } from '../session/observer-store';
import { browserGeolocation } from '../shell/browser-deps';
import { SHELL_COPY } from '../shell/copy';
import { createLocator } from '../shell/geolocation';
import { CONSOLE_COPY } from './copy';
import { ConsoleSheet } from './console-sheet';
import { CountdownRing } from './countdown-ring';
import { createHomeController } from './home-controller';
import type { HomeController, HomeSnapshot } from './home-controller';
import { RadarPanel } from './radar-panel';
import { SatelliteDial } from './satellite-dial';
import { StoryPanel } from './story-panel';

type Locator = ReturnType<typeof createLocator>;
type ObserverStore = ReturnType<typeof createObserverStore>;
type LocateStatus = 'idle' | 'locating' | 'failed';

const noopSubscribe = () => () => {};
const noSnapshot = (): HomeSnapshot | null => null;

export function ConsoleHome() {
  const [controller, setController] = useState<HomeController | null>(null);
  const [locator, setLocator] = useState<Locator | null>(null);
  const [store, setStore] = useState<ObserverStore | null>(null);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle');
  const [storySlug, setStorySlug] = useState<string | null>(null);
  const [rawLat, setRawLat] = useState('');
  const [rawLon, setRawLon] = useState('');

  useEffect(() => {
    const field = createFieldBrowserDeps();
    const picker = createPickerBrowserDeps();
    const created = createHomeController({
      clock: field.clock,
      timers: field.timers,
      storage: field.storage,
      tleFetcher: picker.tleFetcher,
    });
    setController(created);
    setLocator(createLocator({ geolocation: browserGeolocation(), storage: field.storage }));
    setStore(createObserverStore(field.storage));
    return () => {
      created.dispose();
      setController(null);
      setLocator(null);
      setStore(null);
    };
  }, []);

  const snapshot = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    controller ? controller.getSnapshot : noSnapshot,
    noSnapshot,
  );

  const planner = snapshot?.planner ?? null;
  const satrec = planner?.satrec ?? null;
  const observer = snapshot?.observer ?? null;
  const nowMs = snapshot?.nowMs ?? 0;
  const nextRow = useMemo(
    () => planner?.rows.find((row) => row.pass.setMs > nowMs) ?? null,
    [planner, nowMs],
  );
  const nextPass = nextRow?.pass ?? null;
  const observerLat = observer?.latitudeDeg ?? null;
  const observerLon = observer?.longitudeDeg ?? null;

  const track = useMemo(() => {
    if (satrec === null || nextPass === null || observerLat === null || observerLon === null) return null;
    try {
      return buildSkyTrack(satrec, { latitudeDeg: observerLat, longitudeDeg: observerLon, altitudeKm: 0 }, nextPass);
    } catch {
      return null;
    }
  }, [satrec, nextPass, observerLat, observerLon]);

  const passMarks = useMemo(() => {
    if (track === null) return null;
    const ok = track.samples.filter((s): s is SkySampleOk => s.ok);
    if (ok.length === 0) return null;
    const peak = ok.reduce((best, s) => (s.elevationDeg > best.elevationDeg ? s : best), ok[0]);
    return { aos: ok[0], peak, los: ok[ok.length - 1] };
  }, [track]);

  const header = (
    <header className="home-header">
      <p className="kicker">zombieSatellite</p>
      <p>
        <span>{SHELL_COPY.heroLine1}</span> <span>{SHELL_COPY.heroLine2}</span>
      </p>
    </header>
  );
  const footer = (
    <footer className="home-footer">
      <p>{SHELL_COPY.honestyFooter}</p>
    </footer>
  );

  if (controller === null || snapshot === null) {
    return (
      <main data-tab="home" className="home">
        {header}
        <FirstRunGuide />
        {footer}
      </main>
    );
  }

  const { entry } = snapshot;
  const storyEntry = storySlug === null ? undefined : listCatalogEntries().find((e) => e.slug === storySlug);

  function locateNow() {
    if (locator === null || store === null || controller === null) return;
    setLocateStatus('locating');
    void locator
      .locateNow((position) => {
        const applied = store.set(position);
        if (applied) controller.refreshObserver();
        return applied;
      })
      .then((outcome) => setLocateStatus(outcome === 'applied' || outcome === 'skipped' ? 'idle' : 'failed'));
  }

  function applyManual(nextLat: string, nextLon: string) {
    if (store === null || controller === null) return;
    const lat = parseCoordinateInput(nextLat, -90, 90);
    const lon = parseCoordinateInput(nextLon, -180, 180);
    if (lat === null || lon === null) return;
    if (store.set({ latitudeDeg: lat, longitudeDeg: lon })) controller.refreshObserver();
  }

  const calculating =
    planner === null || planner.status === 'loading' || planner.status === 'searching' || planner.status === 'badging';

  let ringBlock;
  if (!entry.playable || observer === null) ringBlock = null;
  else if (calculating) ringBlock = <p className="home-note">{CONSOLE_COPY.homeCalculating}</p>;
  else if (planner !== null && planner.status === 'tle-unavailable') {
    ringBlock = <p className="home-note">{SESSION_COPY.noOrbitData}</p>;
  } else if (nextPass === null) ringBlock = <p className="home-note">{CONSOLE_COPY.homeNoPass}</p>;
  else {
    const inPass = nextPass.riseMs <= nowMs;
    ringBlock = (
      <div className="home-ring">
        {inPass ? (
          <>
            <p>{CONSOLE_COPY.ringInPassNow}</p>
            <CountdownRing mode="in-pass" countdownMs={null} nowMs={nowMs} riseMs={nextPass.riseMs} setMs={nextPass.setMs} />
          </>
        ) : (
          <CountdownRing mode="awaiting" countdownMs={nextPass.riseMs - nowMs} />
        )}
        <p>
          {CONSOLE_COPY.timelineAos}: {formatUtc(nextPass.riseMs)}
        </p>
        <p>
          {SHELL_COPY.localTimeLabel}{' '}
          {formatLocalTimeNote(nextPass.riseMs, -new Date(nextPass.riseMs).getTimezoneOffset())}
        </p>
      </div>
    );
  }

  let stage;
  if (!entry.playable) {
    stage = <p className="home-hint">{entry.hook}</p>;
  } else if (observer === null) {
    stage = (
      <section className="home-location">
        <p>{CONSOLE_COPY.homeLocationPrompt}</p>
        <p>
          <button type="button" className="button" onClick={locateNow} disabled={locator === null || locateStatus === 'locating'}>
            {locateStatus === 'locating' ? SHELL_COPY.locating : SHELL_COPY.useMyLocation}
          </button>
        </p>
        {locateStatus === 'failed' ? <p>{SHELL_COPY.locationFailed}</p> : null}
        <label>
          Observer latitude (°){' '}
          <input
            type="number"
            step="any"
            value={rawLat}
            onChange={(e) => {
              setRawLat(e.target.value);
              applyManual(e.target.value, rawLon);
            }}
          />
        </label>
        <label>
          Observer longitude (°){' '}
          <input
            type="number"
            step="any"
            value={rawLon}
            onChange={(e) => {
              setRawLon(e.target.value);
              applyManual(rawLat, e.target.value);
            }}
          />
        </label>
      </section>
    );
  } else {
    stage = (
      <div className="home-radar">
        <RadarPanel
          satellite={snapshot.live}
          path={track}
          passMarks={passMarks}
          reticle={null}
          locked={false}
          sunlitOnly={entry.beacon.sunlitOnly === true}
          profile={nextRow?.profile ?? null}
          sweep
          emptyText={CONSOLE_COPY.radarEmpty}
        />
      </div>
    );
  }

  return (
    <main data-tab="home" className="home">
      {header}
      <SatelliteDial
        selectedSlug={entry.slug}
        onSelect={(slug) => controller.select(slug)}
        onViewStory={(slug) => setStorySlug(slug)}
      />
      {stage}
      {ringBlock}
      <nav className="home-secondary" aria-label={SHELL_COPY.navLabel}>
        <Link className="button" href="/cards">{SHELL_COPY.openCards}</Link>
        <Link className="button" href="/log">{FIELD_COPY.logLink}</Link>
        {entry.playable ? (
          <>
            <Link className="button" href={`/planner/${entry.noradId}`}>{FIELD_COPY.plannerLink}</Link>
            <Link className="button" href={`/guide/${entry.noradId}`}>{FIELD_COPY.guideLink}</Link>
          </>
        ) : null}
      </nav>
      <FirstRunGuide />
      <ConsoleSheet
        open={storyEntry !== undefined}
        title={CONSOLE_COPY.sheetTitleStory}
        closeLabel={CONSOLE_COPY.sheetClose}
        onClose={() => setStorySlug(null)}
      >
        {storyEntry === undefined ? null : <StoryPanel entry={storyEntry} />}
      </ConsoleSheet>
      {footer}
    </main>
  );
}
