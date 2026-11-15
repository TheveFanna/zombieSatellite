// Feature: qsl-card, Property 8: Downloads against mocks
// **Validates: Requirements 6.4, 7.9, 10.2**
import { describe, expect, it } from 'vitest';
import type { DownloadDeps } from '../../src/components/qsl/deps';
import {
  createCardDownloader,
  PNG_HEIGHT,
  PNG_WIDTH,
  REVOKE_DELAY_MS,
} from '../../src/components/qsl/card-download';
import { svgDataUrl } from '../../src/lib/qsl/index';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><title>x</title></svg>';
const BASE = 'zombiesatellite-qsl-ZS-07530-ABC-1';

function makeMocks(loadImage: (src: string) => Promise<unknown>) {
  const log: unknown[][] = [];
  const timerCallbacks: Array<{ fn: () => void; ms: number }> = [];
  const image = { id: 'image' };
  const pngBlob = { id: 'png-blob' };
  const deps: DownloadDeps = {
    makeTextBlob: (text, type) => {
      log.push(['makeTextBlob', text, type]);
      return { text, type };
    },
    createObjectUrl: (blob) => {
      log.push(['createObjectUrl', blob]);
      return 'blob:mock-url';
    },
    revokeObjectUrl: (url) => void log.push(['revokeObjectUrl', url]),
    triggerDownload: (url, fileName) => void log.push(['triggerDownload', url, fileName]),
    loadImage: (src) => {
      log.push(['loadImage', src]);
      return loadImage(src);
    },
    createCanvas: (w, h) => {
      log.push(['createCanvas', w, h]);
      return {
        getContext: () => ({
          drawImage: (img, dx, dy, dw, dh) => void log.push(['drawImage', img, dx, dy, dw, dh]),
        }),
        toBlob: (cb, type) => {
          log.push(['toBlob', type]);
          cb(pngBlob);
        },
      };
    },
    timers: {
      setTimeout: (fn, ms) => {
        timerCallbacks.push({ fn, ms });
        return timerCallbacks.length;
      },
      clearTimeout: () => undefined,
    },
  };
  return { deps, log, timerCallbacks, image, pngBlob };
}

describe('downloadSvg', () => {
  it('makes an SVG blob, triggers <base>.svg and revokes only when the timer fires', () => {
    const m = makeMocks(() => Promise.resolve(null));
    createCardDownloader(m.deps).downloadSvg(SVG, BASE);
    expect(m.log).toEqual([
      ['makeTextBlob', SVG, 'image/svg+xml;charset=utf-8'],
      ['createObjectUrl', { text: SVG, type: 'image/svg+xml;charset=utf-8' }],
      ['triggerDownload', 'blob:mock-url', BASE + '.svg'],
    ]);
    expect(m.timerCallbacks).toHaveLength(1);
    expect(m.timerCallbacks[0].ms).toBe(REVOKE_DELAY_MS);
    m.timerCallbacks[0].fn();
    expect(m.log[m.log.length - 1]).toEqual(['revokeObjectUrl', 'blob:mock-url']);
  });
});

describe('downloadPng', () => {
  it('loads the data URL, draws on a 1200 x 760 canvas, encodes PNG and triggers <base>.png', async () => {
    const image = { id: 'image' };
    const m = makeMocks(() => Promise.resolve(image));
    const outcome = await createCardDownloader(m.deps).downloadPng(SVG, BASE);
    expect(outcome).toEqual({ ok: true });
    expect(PNG_WIDTH).toBe(1200);
    expect(PNG_HEIGHT).toBe(760);
    expect(m.log).toEqual([
      ['loadImage', svgDataUrl(SVG)],
      ['createCanvas', 1200, 760],
      ['drawImage', image, 0, 0, 1200, 760],
      ['toBlob', 'image/png'],
      ['createObjectUrl', m.pngBlob],
      ['triggerDownload', 'blob:mock-url', BASE + '.png'],
    ]);
    expect(m.timerCallbacks).toHaveLength(1);
    expect(m.timerCallbacks[0].ms).toBe(REVOKE_DELAY_MS);
  });

  it('resolves image-load-failed and triggers nothing when the image loader rejects', async () => {
    const m = makeMocks(() => Promise.reject(new Error('load failed')));
    const outcome = await createCardDownloader(m.deps).downloadPng(SVG, BASE);
    expect(outcome).toEqual({ ok: false, reason: 'image-load-failed' });
    expect(m.log.filter((e) => e[0] === 'triggerDownload')).toEqual([]);
    expect(m.timerCallbacks).toHaveLength(0);
  });
});
