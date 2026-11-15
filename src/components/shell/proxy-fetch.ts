import type { FetchFunction } from '../../lib/orbit/index';
import { toProxyUrl } from '../../lib/shell/index';

/**
 * The Proxy_Fetch injected into `createTleFetcher`: it rewrites the CelesTrak URL the fetcher built
 * into the same-origin TLE_Proxy URL and forwards the fetcher's init unchanged. A URL of another
 * shape is rejected without any request. There is no fallback to direct CelesTrak access.
 * `getFetch` is read on every call, so a later replacement of the global fetch is honoured.
 */
export function createProxyFetch(getFetch: () => FetchFunction): FetchFunction {
  return (input, init) => {
    const proxyUrl = toProxyUrl(input);
    if (proxyUrl === null) return Promise.reject(new TypeError('Not a CelesTrak GP request'));
    return getFetch()(proxyUrl, init);
  };
}
