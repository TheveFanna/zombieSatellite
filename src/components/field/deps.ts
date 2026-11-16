import type { TimerApi } from '../pointing/deps';

export interface ClipboardLike { writeText(text: string): Promise<void> }
export interface FieldDownloadDeps {
  makeTextBlob(text: string, type: string): unknown;
  makeBytesBlob(bytes: Uint8Array, type: string): unknown;
  createObjectUrl(blob: unknown): string;
  revokeObjectUrl(url: string): void;
  triggerDownload(url: string, fileName: string): void;
  timers: TimerApi;
}
export type FrameScheduler = {
  request(callback: () => void): unknown;
  cancel(handle: unknown): void;
};
