import { createTleFetcher } from '../../lib/orbit/index';
import type { TleFetcher } from '../../lib/orbit/index';
import type { Clock, KeyValueStorage } from '../pointing/deps';
import type { AudioContextFactory, AudioContextLike, SensorPointing } from './deps';
import type { SessionControllerDeps } from './session-controller';

type AudioContextConstructor = new () => unknown;

/**
 * Builds the factory that creates a real audio context. The globals are passed in
 * (the page passes `window`), so this function touches no global itself.
 * Uses `AudioContext` when it is a function, else `webkitAudioContext`, else the
 * factory returns `null`.
 */
export function createAudioContextFactory(
  globals: { AudioContext?: unknown; webkitAudioContext?: unknown },
): AudioContextFactory {
  const Ctor =
    typeof globals.AudioContext === 'function'
      ? globals.AudioContext
      : typeof globals.webkitAudioContext === 'function'
        ? globals.webkitAudioContext
        : null;
  if (Ctor === null) return () => null;
  const Construct = Ctor as AudioContextConstructor;
  return () => new Construct() as AudioContextLike;
}

/** The dependencies of the picker controller (the exact deps shape of `createPickerController`). */
export interface PickerBrowserDeps {
  readonly clock: Clock;
  readonly storage: KeyValueStorage;
  readonly tleFetcher: TleFetcher;
}

/** Same try/catch pattern as the pointing page's storage wrapper, which is not exported. */
function createSafeStorage(): KeyValueStorage {
  const resolve = (): Storage | null => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    getItem(key) {
      try {
        return resolve()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        resolve()?.setItem(key, value);
      } catch {
        // Private browsing or disabled storage: persisting is best effort.
      }
    },
  };
}

/**
 * Builds the real browser dependencies for the picker page.
 * Browser only: the page calls it inside `useEffect`.
 */
export function createPickerBrowserDeps(): PickerBrowserDeps {
  const clock: Clock = { nowMs: () => Date.now() };
  return {
    clock,
    storage: createSafeStorage(),
    tleFetcher: createTleFetcher({ now: clock.nowMs }),
  };
}

/**
 * Builds the real browser dependencies for the session controller.
 * Browser only: the page calls it inside `useEffect`.
 */
export function createSessionBrowserDeps(pointing: SensorPointing): SessionControllerDeps {
  const picker = createPickerBrowserDeps();
  return {
    clock: picker.clock,
    timers: {
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    },
    storage: picker.storage,
    tleFetcher: picker.tleFetcher,
    noise: { next: () => Math.random() },
    audioContextFactory: createAudioContextFactory(
      window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown },
    ),
    pointing,
  };
}
