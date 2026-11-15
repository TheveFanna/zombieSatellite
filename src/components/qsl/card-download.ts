import { svgDataUrl } from '../../lib/qsl/index';
import type { DownloadDeps } from './deps';

export const REVOKE_DELAY_MS = 1000;
export const PNG_WIDTH = 1200;
export const PNG_HEIGHT = 760;

export type PngOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'image-load-failed' | 'canvas-unavailable' | 'encode-failed' };

export function createCardDownloader(deps: DownloadDeps): {
  downloadSvg(svg: string, fileBaseName: string): void;
  downloadPng(svg: string, fileBaseName: string): Promise<PngOutcome>;
} {
  function deliver(blob: unknown, fileName: string): void {
    const url = deps.createObjectUrl(blob);
    deps.triggerDownload(url, fileName);
    deps.timers.setTimeout(() => deps.revokeObjectUrl(url), REVOKE_DELAY_MS);
  }

  function downloadSvg(svg: string, fileBaseName: string): void {
    deliver(deps.makeTextBlob(svg, 'image/svg+xml;charset=utf-8'), fileBaseName + '.svg');
  }

  async function downloadPng(svg: string, fileBaseName: string): Promise<PngOutcome> {
    let img: unknown;
    try {
      img = await deps.loadImage(svgDataUrl(svg));
    } catch {
      return { ok: false, reason: 'image-load-failed' };
    }
    try {
      const canvas = deps.createCanvas(PNG_WIDTH, PNG_HEIGHT);
      const ctx = canvas ? canvas.getContext('2d') : null;
      if (!canvas || !ctx) return { ok: false, reason: 'canvas-unavailable' };
      ctx.drawImage(img, 0, 0, PNG_WIDTH, PNG_HEIGHT);
      const blob = await new Promise<unknown | null>((resolve, reject) => {
        try {
          canvas.toBlob(resolve, 'image/png');
        } catch (e) {
          reject(e);
        }
      });
      if (blob === null || blob === undefined) return { ok: false, reason: 'encode-failed' };
      deliver(blob, fileBaseName + '.png');
      return { ok: true };
    } catch {
      return { ok: false, reason: 'encode-failed' };
    }
  }

  return { downloadSvg, downloadPng };
}
