import type { Clock, KeyValueStorage, TimerApi } from '../pointing/deps';
import type { ClipboardLike, FieldDownloadDeps, FrameScheduler } from './deps';

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

export interface FieldBrowserDeps {
  readonly storage: KeyValueStorage;
  readonly clock: Clock;
  readonly timers: TimerApi;
  readonly download: FieldDownloadDeps;
  readonly clipboard: ClipboardLike | null;
  readonly frames: FrameScheduler;
}

/**
 * Builds the real browser dependencies of the field components.
 * Browser only: the pages call it inside `useEffect`.
 */
export function createFieldBrowserDeps(): FieldBrowserDeps {
  const timers: TimerApi = {
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  };
  const download: FieldDownloadDeps = {
    makeTextBlob: (text, type) => new Blob([text], { type }),
    makeBytesBlob: (bytes, type) => new Blob([bytes as BlobPart], { type }),
    createObjectUrl: (blob) => URL.createObjectURL(blob as Blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    triggerDownload(url, fileName) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    timers,
  };
  const clipboard: ClipboardLike | null =
    typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;
  return {
    storage: createSafeStorage(),
    clock: { nowMs: () => Date.now() },
    timers,
    download,
    clipboard,
    frames: {
      request: (callback) => window.requestAnimationFrame(() => callback()),
      cancel: (handle) => window.cancelAnimationFrame(handle as number),
    },
  };
}
