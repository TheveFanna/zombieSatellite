import { CELESTRAK_GP_URL, REQUEST_TIMEOUT_MS, TLE_CACHE_TTL_MS } from './constants';
import { EngineError } from './errors';
import { toTimeMs } from './time';
import { TleCache } from './tle-cache';
import { parseTle } from './tle-parser';
import type { TleRecord } from './tle-parser';

/** Signature of the WHATWG `fetch` API: the Fetch_Function of the TLE_Fetcher. */
export type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

export interface TleFetcherOptions {
  /**
   * Sends every request. Default: `globalThis.fetch`, read again whenever a request is sent
   * (Requirement 3, criteria 4 and 5).
   */
  readonly fetch?: FetchFunction;
  /** Cache_Clock (D11). Default: `() => Date.now()`. Every reading goes through `toTimeMs`. */
  readonly now?: () => Date | number;
}

export interface TleFetcher {
  /**
   * Resolves with the frozen TleRecord of a NORAD catalog number, from the cache or from CelesTrak.
   * Every failure is a rejection with an EngineError; the method never throws synchronously.
   */
  fetchTle(noradId: number): Promise<TleRecord>;
}

/** Range of the five-digit NORAD field of a TLE (C18; Requirement 3, criterion 7). */
const MIN_NORAD_ID = 1;
const MAX_NORAD_ID = 99_999;

/** The two members of a response that the fetcher uses. */
type ResponseParts = Pick<Response, 'status' | 'text'>;

function kindOf(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

/** A response object has a numeric `status` and a `text` function (Requirement 3, criterion 15). */
function isResponseParts(value: unknown): value is ResponseParts {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { readonly status?: unknown; readonly text?: unknown };
  return typeof candidate.status === 'number' && typeof candidate.text === 'function';
}

/**
 * Calls the Fetch_Function as a plain function. A synchronous throw and a rejection both end in
 * EngineError('network') with the thrown value or the rejection reason as cause (Requirement 3,
 * criterion 8). Resolves with whatever the Fetch_Function resolves with; the caller checks it.
 */
async function callFetch(
  noradId: number,
  fetchFunction: FetchFunction,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  try {
    return await fetchFunction(url, init);
  } catch (cause) {
    throw new EngineError('network', `Request for NORAD catalog number ${noradId} failed`, { cause });
  }
}

/**
 * Reads the response body as text. A throw, a rejection or a result that is not a string ends in
 * EngineError('network') with the underlying error as cause (Requirement 3, criterion 15).
 */
async function readBody(noradId: number, response: ResponseParts): Promise<string> {
  let body: unknown;
  try {
    body = await response.text();
  } catch (cause) {
    throw new EngineError('network', `Reading the response body for NORAD catalog number ${noradId} failed`, {
      cause,
    });
  }
  if (typeof body !== 'string') {
    throw new EngineError('network', `The response body for NORAD catalog number ${noradId} is not text`, {
      cause: new TypeError('Response.text() resolved with a value that is not a string'),
    });
  }
  return body;
}

/**
 * Creates a TLE_Fetcher that owns one TLE_Cache and one map of In_Flight_Requests, so a new fetcher
 * starts with an empty cache. An `options` value that is not an object, or a `fetch` or `now` option
 * that is present but not a function, throws `invalid-input`; `undefined` counts as absent.
 */
export function createTleFetcher(options?: TleFetcherOptions): TleFetcher {
  if (options !== undefined && (typeof options !== 'object' || options === null)) {
    throw new EngineError('invalid-input', `options must be an object, received ${kindOf(options)}`);
  }
  const optionFetch = options?.fetch;
  if (optionFetch !== undefined && typeof optionFetch !== 'function') {
    throw new EngineError('invalid-input', `options.fetch must be a function, received ${kindOf(optionFetch)}`);
  }
  const optionNow = options?.now;
  if (optionNow !== undefined && typeof optionNow !== 'function') {
    throw new EngineError('invalid-input', `options.now must be a function, received ${kindOf(optionNow)}`);
  }

  const cache = new TleCache();
  const inFlight = new Map<number, Promise<TleRecord>>();

  /** One Cache_Clock reading as a whole-millisecond UTC instant (D11). */
  const readClock = (): number => {
    let reading: unknown;
    try {
      reading = optionNow === undefined ? Date.now() : optionNow();
    } catch (cause) {
      throw new EngineError('invalid-input', 'options.now threw an exception', { cause });
    }
    return toTimeMs(reading, 'Cache_Clock reading');
  };

  /**
   * The body of one In_Flight_Request (D12). `request` is the promise that `fetchTle` registered for
   * `noradId`; the `finally` block removes that registration before any waiting caller continues.
   */
  async function runRequest(noradId: number, request: Promise<TleRecord>): Promise<TleRecord> {
    const url = `${CELESTRAK_GP_URL}?CATNR=${String(noradId)}&FORMAT=tle`;
    const controller = new AbortController();
    // No headers, so a browser sends a simple GET without a preflight (Requirement 3, criteria 3 and 14).
    const init: RequestInit = { method: 'GET', credentials: 'omit', signal: controller.signal };
    // Read now, so a replacement of `globalThis.fetch` after import is honoured (Requirement 3, criterion 5).
    const fetchFunction: FetchFunction = optionFetch ?? globalThis.fetch;

    // The timeout promise carries a no-op handler; Promise.race subscribes to every racer, so a racer
    // that settles after the race, such as an aborted `fetch`, never becomes an unhandled rejection.
    let rejectTimeout: (reason: unknown) => void = () => undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      rejectTimeout = reject;
    });
    timeout.catch(() => undefined);
    const timer = setTimeout(() => {
      controller.abort();
      rejectTimeout(
        new EngineError(
          'network',
          `Request for NORAD catalog number ${noradId} timed out after ${REQUEST_TIMEOUT_MS} ms`,
        ),
      );
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await Promise.race([callFetch(noradId, fetchFunction, url, init), timeout]);
      if (!isResponseParts(response)) {
        throw new EngineError(
          'network',
          `The Fetch_Function resolved with a value that is not a response object for NORAD catalog number ${noradId}`,
          { cause: new TypeError('Expected an object with a numeric status and a text function') },
        );
      }
      const status = response.status;
      if (status !== 200) {
        // The body stays unread (Requirement 3, criterion 9).
        throw new EngineError('http', `CelesTrak answered HTTP status ${status} for NORAD catalog number ${noradId}`, {
          status,
        });
      }
      const text = await Promise.race([readBody(noradId, response), timeout]);
      const record = parseTle(text);
      if (record.NORAD_CAT_ID !== noradId) {
        throw new EngineError(
          'catalog-mismatch',
          `CelesTrak returned NORAD catalog number ${record.NORAD_CAT_ID} for the request for ${noradId}`,
        );
      }
      cache.set(noradId, { record, storedAtMs: readClock() });
      return record;
    } finally {
      clearTimeout(timer);
      if (inFlight.get(noradId) === request) {
        inFlight.delete(noradId);
      }
    }
  }

  function fetchTle(noradId: number): Promise<TleRecord> {
    // 1. Catalog number; the Fetch_Function is not called (Requirement 3, criterion 7).
    if (typeof noradId !== 'number' || !Number.isInteger(noradId) || noradId < MIN_NORAD_ID || noradId > MAX_NORAD_ID) {
      const received = typeof noradId === 'number' ? String(noradId) : kindOf(noradId);
      return Promise.reject(
        new EngineError(
          'invalid-input',
          `NORAD catalog number must be an integer from ${MIN_NORAD_ID} to ${MAX_NORAD_ID}, received ${received}`,
        ),
      );
    }

    // 2. A running request for the same number is shared (Requirement 5, criterion 7).
    const pending = inFlight.get(noradId);
    if (pending !== undefined) return pending;

    // 3. Cache_Clock reading and freshness; a negative Entry_Age counts as fresh (Requirement 5, criteria 3, 4, 12).
    let nowMs: number;
    try {
      nowMs = readClock();
    } catch (error) {
      return Promise.reject(error);
    }
    const entry = cache.get(noradId);
    if (entry !== undefined && nowMs - entry.storedAtMs < TLE_CACHE_TTL_MS) {
      return Promise.resolve(entry.record);
    }

    // 4. Register the request before the Fetch_Function is called: `runRequest` starts in a later
    // microtask, so concurrent callers already find the registration (D12).
    const request: Promise<TleRecord> = Promise.resolve().then(() => runRequest(noradId, request));
    inFlight.set(noradId, request);
    return request;
  }

  return { fetchTle };
}
