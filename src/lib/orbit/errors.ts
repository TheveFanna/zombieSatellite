/** Failure categories of the Orbit_Engine (D4). */
export type EngineErrorCategory =
  | 'invalid-input'
  | 'network'
  | 'http'
  | 'invalid-tle'
  | 'catalog-mismatch';

export interface EngineErrorOptions {
  /** Copied to `Error.cause` whenever the key is present, also when its value is `undefined`. */
  readonly cause?: unknown;
  /** HTTP status code, for category 'http' only. */
  readonly status?: number;
}

export class EngineError extends Error {
  override readonly name = 'EngineError';
  readonly category: EngineErrorCategory;
  readonly status: number | undefined;

  constructor(category: EngineErrorCategory, message: string, options?: EngineErrorOptions) {
    super(message, options !== undefined && 'cause' in options ? { cause: options.cause } : undefined);
    this.category = category;
    this.status = options?.status;
  }
}

export function isEngineError(value: unknown): value is EngineError {
  return value instanceof EngineError;
}
