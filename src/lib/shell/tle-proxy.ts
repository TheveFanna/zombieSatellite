import { parseTle, REQUEST_TIMEOUT_MS, TLE_CACHE_TTL_MS } from '../orbit/index';
import type { FetchFunction } from '../orbit/index';

/** Same-origin path of the TLE_Proxy route handler (`src/app/api/tle/route.ts`). */
export const TLE_PROXY_PATH = '/api/tle';

/**
 * The CelesTrak GP endpoint. A copy of the internal `CELESTRAK_GP_URL` of `src/lib/orbit`, which its
 * barrel does not export; a test asserts that both stay equal (design D1, DD-5).
 */
export const UPSTREAM_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php';

/** CDN cache duration of a successful answer: the landed browser TLE cache TTL, 7200 s. */
export const PROXY_CACHE_SECONDS = TLE_CACHE_TTL_MS / 1000;

const CATNR_PATTERN = /^[1-9][0-9]{0,4}$/;

/** A NORAD number from exactly one CATNR value of /^[1-9][0-9]{0,4}$/ (1 to 99999), else null. */
export function parseCatnr(params: URLSearchParams): number | null {
  const values = params.getAll('CATNR');
  if (values.length !== 1) return null;
  const value = values[0];
  return value !== undefined && CATNR_PATTERN.test(value) ? Number(value) : null;
}

/** The Upstream_Request URL in the landed request shape: CATNR plus FORMAT=tle. */
export function upstreamUrl(noradId: number): string {
  return `${UPSTREAM_GP_URL}?CATNR=${String(noradId)}&FORMAT=tle`;
}

const NO_STORE = 'no-store';
const CACHED = `public, max-age=0, s-maxage=${String(PROXY_CACHE_SECONDS)}`;

function textResponse(status: number, body: string, cacheControl: string): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cacheControl },
  });
}

/** True when the text parses as a TLE of the requested catalog number. */
function isTleOf(text: string, noradId: number): boolean {
  try {
    return parseTle(text).NORAD_CAT_ID === noradId;
  } catch {
    return false;
  }
}

/**
 * Builds the GET handler of the TLE_Proxy. Only a 200 answer with a TLE of the requested number
 * carries `s-maxage`; every error answer carries `no-store`, so a failure is never cached.
 */
export function createTleProxyHandler(deps: { fetch: FetchFunction }): (request: Request) => Promise<Response> {
  return async (request) => {
    const noradId = parseCatnr(new URL(request.url).searchParams);
    if (noradId === null) return textResponse(400, 'Invalid CATNR', NO_STORE);
    let upstream: Response;
    let text: string;
    try {
      upstream = await deps.fetch(upstreamUrl(noradId), {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (upstream.status !== 200) {
        return textResponse(502, `Upstream status ${String(upstream.status)}`, NO_STORE);
      }
      text = await upstream.text();
    } catch {
      return textResponse(502, 'Upstream unavailable', NO_STORE);
    }
    if (!isTleOf(text, noradId)) return textResponse(502, 'Upstream answer is not a TLE', NO_STORE);
    return textResponse(200, text, CACHED);
  };
}
