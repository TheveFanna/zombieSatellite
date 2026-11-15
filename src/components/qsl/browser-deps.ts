import type { KeyValueStorage } from '../pointing/deps';
import type { CanvasLike, DownloadDeps } from './deps';

/** Same try/catch pattern as the session page's storage wrapper, which is not exported. */
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
 * Builds the real browser dependencies of the QSL pages.
 * Browser only: the pages call it inside `useEffect`.
 */
export function createQslBrowserDeps(): { storage: KeyValueStorage; download: DownloadDeps } {
  const download: DownloadDeps = {
    makeTextBlob: (text, type) => new Blob([text], { type }),
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
    loadImage: (src) =>
      new Promise<unknown>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image-load-failed'));
        img.src = src;
      }),
    createCanvas(width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas as unknown as CanvasLike;
    },
    timers: {
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    },
  };
  return { storage: createSafeStorage(), download };
}
