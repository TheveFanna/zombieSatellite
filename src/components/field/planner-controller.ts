// Pass_Planner controller (design.md, "Planner"). Framework-free; compute is chunked on the main thread.
import type { PlayableEntry } from '../../lib/catalog/index';
import {
  PLANNER_SEARCH_MIN_ELEVATION_DEG,
  PLANNER_WINDOW_HOURS,
  illuminationProfile,
} from '../../lib/field/index';
import type { IlluminationProfile } from '../../lib/field/index';
import { predictPasses } from '../../lib/orbit/index';
import type { Pass, Satrec } from '../../lib/orbit/index';
import type { ObserverPosition } from '../../lib/session/index';
import type { Clock, KeyValueStorage, TimerApi } from '../pointing/deps';
import { createObserverStore } from '../session/observer-store';
import type { TleSource } from './tle-source';

/** Passes per illumination chunk. */
export const PLANNER_CHUNK_SIZE = 6;

export interface PlannerRow {
  readonly pass: Pass;
  /** null while pending. */
  readonly profile: IlluminationProfile | null;
}

export interface PlannerSnapshot {
  readonly entry: PlayableEntry;
  readonly observer: ObserverPosition;
  readonly nowMs: number;
  readonly status: 'loading' | 'searching' | 'badging' | 'ready' | 'tle-unavailable';
  /** Every pass found at 0°. */
  readonly rows: readonly PlannerRow[];
  readonly satrec: Satrec | null;
}

export interface PlannerController {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PlannerSnapshot;
  setObserver(position: ObserverPosition): boolean;
  retry(): void;
  dispose(): void;
}

export function createPlannerController(
  deps: { clock: Clock; timers: TimerApi; storage: KeyValueStorage; tleSource: TleSource },
  entry: PlayableEntry,
): PlannerController {
  const observerStore = createObserverStore(deps.storage);
  const listeners = new Set<() => void>();
  let disposed = false;
  let generation = 0;
  let observer: ObserverPosition = observerStore.get();
  let nowMs = deps.clock.nowMs();
  let status: PlannerSnapshot['status'] = 'loading';
  let rows: PlannerRow[] = [];
  let satrec: Satrec | null = null;
  let tle: Awaited<ReturnType<TleSource['load']>>['tle'] | null = null;
  let snapshot: PlannerSnapshot = build();

  function build(): PlannerSnapshot {
    return Object.freeze({
      entry,
      observer: Object.freeze({ latitudeDeg: observer.latitudeDeg, longitudeDeg: observer.longitudeDeg }),
      nowMs,
      status,
      rows: Object.freeze(rows.slice()),
      satrec,
    });
  }

  function publish(): void {
    if (disposed) return;
    snapshot = build();
    for (const listener of [...listeners]) listener();
  }

  /** Starts a search for the current observer; any earlier work becomes stale. */
  function startSearch(): void {
    generation += 1;
    const mine = generation;
    rows = [];
    nowMs = deps.clock.nowMs();
    if (tle === null || satrec === null) return;
    status = 'searching';
    publish();
    const loadedTle = tle;
    const loadedSatrec = satrec;
    const startMs = nowMs;
    deps.timers.setTimeout(() => {
      if (disposed || mine !== generation) return;
      let passes: Pass[];
      try {
        passes = predictPasses({
          observer: { latitudeDeg: observer.latitudeDeg, longitudeDeg: observer.longitudeDeg, altitudeKm: 0 },
          tle: loadedTle,
          start: startMs,
          durationHours: PLANNER_WINDOW_HOURS,
          minElevationDeg: PLANNER_SEARCH_MIN_ELEVATION_DEG,
        });
      } catch {
        status = 'tle-unavailable';
        publish();
        return;
      }
      rows = passes.map((pass) => ({ pass, profile: null }));
      if (rows.length === 0) {
        status = 'ready';
        publish();
        return;
      }
      status = 'badging';
      publish();
      scheduleChunk(mine, loadedSatrec, 0);
    }, 0);
  }

  function scheduleChunk(mine: number, sat: Satrec, from: number): void {
    deps.timers.setTimeout(() => {
      if (disposed || mine !== generation) return;
      const to = Math.min(from + PLANNER_CHUNK_SIZE, rows.length);
      const next = rows.slice();
      for (let i = from; i < to; i += 1) {
        const row = next[i];
        if (row === undefined) continue;
        let profile: IlluminationProfile | null = null;
        try {
          profile = illuminationProfile(sat, row.pass);
        } catch {
          profile = null;
        }
        next[i] = { pass: row.pass, profile };
      }
      rows = next;
      if (to >= rows.length) status = 'ready';
      publish();
      if (to < rows.length) scheduleChunk(mine, sat, to);
    }, 0);
  }

  function load(): void {
    status = 'loading';
    rows = [];
    satrec = null;
    tle = null;
    const mine = ++generation;
    deps.tleSource.load().then(
      (loaded) => {
        if (disposed || mine !== generation) return;
        tle = loaded.tle;
        satrec = loaded.satrec;
        startSearch();
      },
      () => {
        if (disposed || mine !== generation) return;
        status = 'tle-unavailable';
        publish();
      },
    );
  }

  load();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setObserver(position) {
      if (disposed) return false;
      if (!observerStore.set(position)) return false;
      observer = { latitudeDeg: position.latitudeDeg, longitudeDeg: position.longitudeDeg };
      if (tle === null) {
        publish();
      } else {
        startSearch();
      }
      return true;
    },
    retry() {
      if (disposed || status !== 'tle-unavailable') return;
      publish();
      load();
      publish();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      listeners.clear();
    },
  };
}
