// Per-pass field model for the Session_Page (design.md, "Pass field controller and TLE source").
// Framework-free; the TLE source is injected. Recomputes synchronously on setPass / setObserver.
import type { PlayableEntry } from '../../lib/catalog/index';
import { buildSkyTrack, illuminationProfile, tuningTable } from '../../lib/field/index';
import type { IlluminationProfile, SkyTrack, TuningResult } from '../../lib/field/index';
import type { Observer, Pass, Satrec, TleRecord } from '../../lib/orbit/index';
import type { ObserverPosition } from '../../lib/session/index';
import type { TleSource } from './tle-source';

export interface PassFieldSnapshot {
  readonly status: 'loading' | 'ready' | 'failed';
  readonly satrec: Satrec | null;
  readonly tle: TleRecord | null;
  readonly pass: Pass | null;
  /** Sky_Track of the pass for the observer; null while either is missing. */
  readonly track: SkyTrack | null;
  readonly profile: IlluminationProfile | null;
  readonly tuning: TuningResult | null;
}

export interface PassFieldController {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PassFieldSnapshot;
  setObserver(position: ObserverPosition): void;
  setPass(pass: Pass | null): void;
  dispose(): void;
}

export function createPassFieldController(deps: { tleSource: TleSource }, entry: PlayableEntry): PassFieldController {
  const listeners = new Set<() => void>();
  let disposed = false;
  let satrec: Satrec | null = null;
  let tle: TleRecord | null = null;
  let status: PassFieldSnapshot['status'] = 'loading';
  let observer: Observer | null = null;
  let pass: Pass | null = null;
  let profile: IlluminationProfile | null = null;
  let tuning: TuningResult | null = null;
  let track: SkyTrack | null = null;
  let snapshot: PassFieldSnapshot = build();

  function build(): PassFieldSnapshot {
    return Object.freeze({ status, satrec, tle, pass, track, profile, tuning });
  }

  function publish(): void {
    if (disposed) return;
    snapshot = build();
    for (const listener of [...listeners]) listener();
  }

  function recompute(): void {
    profile = null;
    tuning = null;
    track = null;
    if (satrec === null || pass === null) return;
    profile = illuminationProfile(satrec, pass);
    if (observer !== null) {
      track = buildSkyTrack(satrec, observer, pass);
      tuning = tuningTable({ satrec, observer, downlinkMhz: entry.beacon.downlinkMhz, pass });
    }
  }

  deps.tleSource.load().then(
    (loaded) => {
      satrec = loaded.satrec;
      tle = loaded.tle;
      status = 'ready';
      recompute();
      publish();
    },
    () => {
      status = 'failed';
      publish();
    },
  );

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setObserver(position) {
      observer = { latitudeDeg: position.latitudeDeg, longitudeDeg: position.longitudeDeg, altitudeKm: 0 };
      recompute();
      publish();
    },
    setPass(next) {
      pass = next;
      recompute();
      publish();
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };
}
