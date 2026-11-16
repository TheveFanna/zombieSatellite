import type { FieldDownloadDeps } from './deps';

export const REVOKE_DELAY_MS = 1000;

export function createFieldDownloader(deps: FieldDownloadDeps): {
  downloadText(text: string, mime: string, fileName: string): void;
  downloadBytes(bytes: Uint8Array, mime: string, fileName: string): void;
} {
  function deliver(blob: unknown, fileName: string): void {
    const url = deps.createObjectUrl(blob);
    deps.triggerDownload(url, fileName);
    deps.timers.setTimeout(() => deps.revokeObjectUrl(url), REVOKE_DELAY_MS);
  }
  return {
    downloadText: (text, mime, fileName) => deliver(deps.makeTextBlob(text, mime), fileName),
    downloadBytes: (bytes, mime, fileName) => deliver(deps.makeBytesBlob(bytes, mime), fileName),
  };
}
