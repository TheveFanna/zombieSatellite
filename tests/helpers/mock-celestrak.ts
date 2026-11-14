// Mock_CelesTrak_Fetch (design.md, "Layout"; Requirement 3, criteria 12 and 13; Requirement 5,
// criterion 10): a Fetch_Function that answers like the CelesTrak GP endpoint, with variants that
// answer with another status or body, throw, reject or never settle.
// Every mock records `{ url, init }` of each call in its own `calls` array. The helper does not use
// `vi.fn`, because Vitest 5 clears mock call history between tests, and it never calls the real `fetch`.
import { ISS_BASELINE } from './baseline';

/**
 * The Fetch_Function type of design.md (`FetchFunction` in `tle-fetcher.ts`), declared here until the
 * engine exports it. The two declarations are structurally identical.
 */
export type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

/** One call of a mock: the URL and the init object exactly as the caller passed them. */
export interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit;
}

/** A Fetch_Function together with the calls it received, oldest first. A test may empty `calls`. */
export type MockCelestrakFetch = FetchFunction & { readonly calls: RecordedCall[] };

/** What a mock does when it is called. */
export type MockBehavior =
  | {
      /** Resolves with a new real `Response` of content type `text/plain`. */
      readonly kind: 'answer';
      /** HTTP status, default 200. */
      readonly status?: number;
      /** Body text, or a function of the requested URL. Default: the ISS TLE as CelesTrak formats it. */
      readonly body?: string | ((url: string) => string);
    }
  | {
      /** Throws `thrown` synchronously. */
      readonly kind: 'throw';
      readonly thrown: unknown;
    }
  | {
      /** Returns a promise rejected with `reason`. */
      readonly kind: 'reject';
      readonly reason: unknown;
    }
  | {
      /** Returns a promise that never settles. It ignores `init.signal`. */
      readonly kind: 'never';
    };

/**
 * The text CelesTrak returns for FORMAT=tle: the name line right-padded to 24 characters, line 1 and
 * line 2, each line ended by CRLF.
 */
export function celestrakBody(tle: { readonly name: string; readonly line1: string; readonly line2: string }): string {
  return `${tle.name.padEnd(24)}\r\n${tle.line1}\r\n${tle.line2}\r\n`;
}

const ISS_BODY = celestrakBody(ISS_BASELINE);

// The Fetch standard lets `new Response` build statuses 200 to 599 only, and no body for 204, 205 and 304.
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

/** A new real `Response`. Design Property 14 draws statuses from 100 to 599, so a status below 200 is set afterwards. */
function buildResponse(status: number, body: string): Response {
  const constructible = status >= 200 && status <= 599;
  const response = new Response(constructible && !NULL_BODY_STATUSES.has(status) ? body : null, {
    status: constructible ? status : 200,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!constructible) {
    Object.defineProperties(response, { status: { value: status }, ok: { value: false } });
  }
  return response;
}

/**
 * Wraps `respond` in a Fetch_Function that appends `{ url, init }` to its own `calls` array before it
 * calls `respond`. A synchronous throw of `respond` reaches the caller unchanged. Tests use it for
 * answers that `MockBehavior` does not describe, for example a resolved value that is not a response.
 */
export function recordingFetch(respond: FetchFunction): MockCelestrakFetch {
  const calls: RecordedCall[] = [];
  const fetchFunction: FetchFunction = (input, init) => {
    calls.push({ url: input, init });
    return respond(input, init);
  };
  return Object.assign(fetchFunction, { calls });
}

/**
 * Creates a mock Fetch_Function with its own `calls` array. Without an argument it answers every call
 * with status 200, content type `text/plain` and the ISS TLE of `baseline.ts` (name line padded to 24
 * characters, CRLF line endings). Each answer is a new `Response`, so its body can be read once per call.
 */
export function createMockCelestrakFetch(behavior: MockBehavior = { kind: 'answer' }): MockCelestrakFetch {
  return recordingFetch((input) => {
    switch (behavior.kind) {
      case 'answer': {
        const { status = 200, body = ISS_BODY } = behavior;
        return Promise.resolve(buildResponse(status, typeof body === 'function' ? body(input) : body));
      }
      case 'throw':
        throw behavior.thrown;
      case 'reject':
        return Promise.reject(behavior.reason);
      case 'never':
        return new Promise<Response>(() => undefined);
    }
  });
}
