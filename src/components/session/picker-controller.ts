// Picker controller (design.md, "Controllers > Picker controller"). Framework-free: every dependency is injected and
// all time comes from `deps.clock`. One row per Playable_Entry, each with its real-time Next_Pass (DQ-2).
import type { PlayableEntry } from '../../lib/catalog/index';
import { listPlayableEntries } from '../../lib/catalog/index';
import type { Pass, TleFetcher, TleRecord } from '../../lib/orbit/index';
import type { ObserverPosition } from '../../lib/session/index';
import type { Clock, KeyValueStorage } from '../pointing/deps';
import { createObserverStore } from './observer-store';
import { findTargetPass } from './pass-finder';

export interface PickerRow {
  readonly entry: PlayableEntry;
  readonly status: 'loading' | 'ready' | 'tle-unavailable' | 'no-pass-found';
  readonly pass: Pass | null;
  /** `pass.riseMs` is at or before the Real_Clock instant of the search. */
  readonly inProgress: boolean;
}

export interface PickerSnapshot {
  readonly observer: ObserverPosition;
  readonly rows: readonly PickerRow[];
}

export interface PickerController {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PickerSnapshot;
  setObserver(position: ObserverPosition): boolean;
  retry(): void;
  dispose(): void;
}

export function createPickerController(deps: {
  clock: Clock;
  storage: KeyValueStorage;
  tleFetcher: TleFetcher;
}): PickerController {
  const observerStore = createObserverStore(deps.storage);
  const entries = listPlayableEntries();
  const listeners = new Set<() => void>();
  let disposed = false;
  let observer: ObserverPosition = observerStore.get();

  // Per-row state, index-aligned with `entries`.
  const tles: (TleRecord | null)[] = entries.map(() => null);
  let rows: PickerRow[] = entries.map((entry) => ({ entry, status: 'loading', pass: null, inProgress: false }));
  let snapshot: PickerSnapshot = freezeSnapshot();

  function freezeSnapshot(): PickerSnapshot {
    return Object.freeze({
      observer: Object.freeze({ latitudeDeg: observer.latitudeDeg, longitudeDeg: observer.longitudeDeg }),
      rows: Object.freeze(rows.map((row) => Object.freeze({ ...row }))),
    });
  }

  function publish(): void {
    if (disposed) return;
    snapshot = freezeSnapshot();
    for (const listener of [...listeners]) listener();
  }

  function setRow(index: number, row: Omit<PickerRow, 'entry'>): void {
    rows = rows.map((existing, i) => (i === index ? { entry: existing.entry, ...row } : existing));
  }

  /** One search: the clock is read once, and the same instant decides `inProgress`. */
  function computeRow(index: number): void {
    const tle = tles[index];
    if (tle === undefined || tle === null) return;
    const nowMs = deps.clock.nowMs();
    try {
      const outcome = findTargetPass(
        tle,
        { latitudeDeg: observer.latitudeDeg, longitudeDeg: observer.longitudeDeg, altitudeKm: 0 },
        nowMs,
        'real',
      );
      if (outcome.kind === 'found') {
        setRow(index, { status: 'ready', pass: outcome.pass, inProgress: outcome.pass.riseMs <= nowMs });
      } else {
        setRow(index, { status: 'no-pass-found', pass: null, inProgress: false });
      }
    } catch {
      setRow(index, { status: 'tle-unavailable', pass: null, inProgress: false });
    }
  }

  function fetchRow(index: number): void {
    const entry = entries[index];
    if (entry === undefined) return;
    new Promise<TleRecord>((resolve) => {
      resolve(deps.tleFetcher.fetchTle(entry.noradId));
    }).then(
      (tle) => {
        if (disposed) return;
        tles[index] = tle;
        computeRow(index);
        publish();
      },
      () => {
        if (disposed) return;
        tles[index] = null;
        setRow(index, { status: 'tle-unavailable', pass: null, inProgress: false });
        publish();
      },
    );
  }

  for (let i = 0; i < entries.length; i += 1) fetchRow(i);

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
      for (let i = 0; i < entries.length; i += 1) computeRow(i);
      publish();
      return true;
    },
    retry() {
      if (disposed) return;
      const failed: number[] = [];
      rows.forEach((row, i) => {
        if (row.status === 'tle-unavailable') failed.push(i);
      });
      if (failed.length === 0) return;
      for (const i of failed) {
        tles[i] = null;
        setRow(i, { status: 'loading', pass: null, inProgress: false });
      }
      publish();
      for (const i of failed) fetchRow(i);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
    },
  };
}
