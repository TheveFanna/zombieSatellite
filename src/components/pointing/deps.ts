export interface EventSourceLike {
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
}
export interface TimerApi { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle: unknown): void }
export interface Clock { nowMs(): number }
export interface VisibilitySource { isHidden(): boolean; onChange(listener: () => void): () => void }
export interface ScreenOrientationSource { readAngle(): unknown }
export interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** `undefined` when DeviceOrientationEvent.requestPermission does not exist. */
export type PermissionRequester = (() => Promise<unknown>) | undefined;
export interface PointerInput { readonly pointerId: number; readonly clientX: number; readonly clientY: number }
