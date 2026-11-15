import type { TimerApi } from '../pointing/deps';

export interface Canvas2dLike { drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void }
export interface CanvasLike {
  getContext(type: '2d'): Canvas2dLike | null;
  toBlob(callback: (blob: unknown | null) => void, type: string): void;
}
export interface DownloadDeps {
  makeTextBlob(text: string, type: string): unknown;
  createObjectUrl(blob: unknown): string;
  revokeObjectUrl(url: string): void;
  triggerDownload(url: string, fileName: string): void;
  loadImage(src: string): Promise<unknown>;
  createCanvas(width: number, height: number): CanvasLike | null;
  timers: TimerApi;
}
