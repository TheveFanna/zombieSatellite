import { parseCatnr, TLE_PROXY_PATH, UPSTREAM_GP_URL } from './tle-proxy';

/**
 * `/api/tle?CATNR=n` for a URL of exactly the landed fetcher shape
 * (`${UPSTREAM_GP_URL}?CATNR=n&FORMAT=tle`, no other parameter, no hash), else null.
 */
export function toProxyUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (`${url.origin}${url.pathname}` !== UPSTREAM_GP_URL || url.hash !== '') return null;
  const keys = [...url.searchParams.keys()].sort();
  if (keys.length !== 2 || keys[0] !== 'CATNR' || keys[1] !== 'FORMAT') return null;
  if (url.searchParams.get('FORMAT') !== 'tle') return null;
  const noradId = parseCatnr(url.searchParams);
  return noradId === null ? null : `${TLE_PROXY_PATH}?CATNR=${String(noradId)}`;
}
