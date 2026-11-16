// Console_Home controller (design.md, "Home controller"). Framework-free; all dependencies injected.
import { listCatalogEntries, listPlayableEntries } from '../../lib/catalog/index';
import type { CatalogEntry } from '../../lib/catalog/index';
import { observeAt } from '../../lib/orbit/index';
import type { TleFetcher } from '../../lib/orbit/index';
import type { ObserverPosition } from '../../lib/session/index';
import { createPlannerController } from '../field/planner-controller';
import type { PlannerController, PlannerSnapshot } from '../field/planner-controller';
import { createTleSource } from '../field/tle-source';
import type { Clock, KeyValueStorage, TimerApi } from '../pointing/deps';
import { OBSERVER_STORAGE_KEY, createObserverStore } from '../session/observer-store';

export const SELECTED_SLUG_KEY = 'zombieSatellite.console.selectedSlug';
/** Delay after the last selection before a planner search starts. */
export const HOME_PLANNER_DELAY_MS = 250;
/** Live position refresh interval. */
export const HOME_LIVE_INTERVAL_MS = 1000;

export interface HomeSnapshot {
  readonly entry: CatalogEntry;
  /** null: no Observer known (location control shown). */
  readonly observer: ObserverPosition | null;
  readonly nowMs: number;
  readonly live: { readonly azimuthDeg: number; readonly elevationDeg: number } | null;
  /** null for story-only entries, and during the 250 ms delay. */
  readonly planner: PlannerSnapshot | null;
}

export interface HomeController {
  subscribe(listener: () => void): () => void;
  getSnapshot(): HomeSnapshot;
  select(slug: string): void;
  /** Re-reads the stored observer (after the locator stored a position) and restarts the search. */
  refreshObserver(): void;
  dispose(): void;
}

export interface HomeDeps {
  readonly clock: Clock;
  readonly timers: TimerApi;
  readonly storage: KeyValueStorage;
  readonly tleFetcher: TleFetcher;
}

/** True when an Observer was stored (the landed store otherwise returns its default). */
export function hasStoredObserver(storage: KeyValueStorage): boolean {
  try {
    return storage.getItem(OBSERVER_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function findEntry(slug: string | null): CatalogEntry | undefined {
  return slug === null ? undefined : listCatalogEntries().find((entry) => entry.slug === slug);
}

function firstPlayable(): CatalogEntry {
  const first = listPlayableEntries()[0] ?? listCatalogEntries()[0];
  if (first === undefined) throw new Error('empty catalog');
  return first;
}

export function createHomeController(deps: HomeDeps): HomeController {
  const observerStore = createObserverStore(deps.storage);
  const listeners = new Set<() => void>();
  let disposed = false;

  let stored: string | null = null;
  try {
    stored = deps.storage.getItem(SELECTED_SLUG_KEY);
  } catch {
    stored = null;
  }
  let entry: CatalogEntry = findEntry(stored) ?? firstPlayable();
  let planner: PlannerController | null = null;
  let unsubscribePlanner: (() => void) | null = null;
  let plannerSnapshot: PlannerSnapshot | null = null;
  let live: HomeSnapshot['live'] = null;
  let nowMs = deps.clock.nowMs();
  let delayHandle: unknown = null;
  let liveHandle: unknown = null;
  let known = hasStoredObserver(deps.storage);
  let snapshot: HomeSnapshot = build();

  function build(): HomeSnapshot {
    const observer = known ? observerStore.get() : null;
    return Object.freeze({
      entry,
      observer: observer === null ? null : Object.freeze({ ...observer }),
      nowMs,
      live,
      planner: plannerSnapshot,
    });
  }

  function publish(): void {
    if (disposed) return;
    snapshot = build();
    for (const listener of [...listeners]) listener();
  }

  function stopPlanner(): void {
    if (delayHandle !== null) {
      deps.timers.clearTimeout(delayHandle);
      delayHandle = null;
    }
    unsubscribePlanner?.();
    unsubscribePlanner = null;
    planner?.dispose();
    planner = null;
    plannerSnapshot = null;
    live = null;
  }

  function startPlannerLater(): void {
    stopPlanner();
    if (!entry.playable || !known) return;
    const playable = entry;
    delayHandle = deps.timers.setTimeout(() => {
      delayHandle = null;
      if (disposed) return;
      const created = createPlannerController(
        {
          clock: deps.clock,
          timers: deps.timers,
          storage: deps.storage,
          tleSource: createTleSource(deps.tleFetcher, playable.noradId),
        },
        playable,
      );
      planner = created;
      plannerSnapshot = created.getSnapshot();
      unsubscribePlanner = created.subscribe(() => {
        plannerSnapshot = created.getSnapshot();
        updateLive();
        publish();
      });
      publish();
    }, HOME_PLANNER_DELAY_MS);
  }

  function updateLive(): void {
    nowMs = deps.clock.nowMs();
    const satrec = plannerSnapshot?.satrec ?? null;
    const observer = known ? observerStore.get() : null;
    live = null;
    if (satrec === null || observer === null) return;
    try {
      const result = observeAt(satrec, nowMs, {
        latitudeDeg: observer.latitudeDeg,
        longitudeDeg: observer.longitudeDeg,
        altitudeKm: 0,
      });
      if (result.ok && result.lookAngles.elevationDeg >= 0) {
        live = { azimuthDeg: result.lookAngles.azimuthDeg, elevationDeg: result.lookAngles.elevationDeg };
      }
    } catch {
      live = null;
    }
  }

  function tick(): void {
    liveHandle = null;
    if (disposed) return;
    updateLive();
    publish();
    liveHandle = deps.timers.setTimeout(tick, HOME_LIVE_INTERVAL_MS);
  }

  startPlannerLater();
  liveHandle = deps.timers.setTimeout(tick, HOME_LIVE_INTERVAL_MS);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    select(slug) {
      if (disposed) return;
      const next = findEntry(slug);
      if (next === undefined) return;
      try {
        deps.storage.setItem(SELECTED_SLUG_KEY, next.slug);
      } catch {
        // Storage errors are swallowed (OQ-A).
      }
      if (next.slug === entry.slug) return;
      entry = next;
      startPlannerLater();
      publish();
    },
    refreshObserver() {
      if (disposed) return;
      known = hasStoredObserver(deps.storage);
      startPlannerLater();
      publish();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopPlanner();
      if (liveHandle !== null) deps.timers.clearTimeout(liveHandle);
      liveHandle = null;
      listeners.clear();
    },
  };
}
