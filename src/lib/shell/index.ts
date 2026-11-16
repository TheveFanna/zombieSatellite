// Public interface of the S6 shell core and its only entry file.
export {
  TLE_PROXY_PATH,
  UPSTREAM_GP_URL,
  PROXY_CACHE_SECONDS,
  parseCatnr,
  upstreamUrl,
  createTleProxyHandler,
} from './tle-proxy';
export { toProxyUrl } from './proxy-url';
export { SKY_VIEW_ASPECT, markerPlacement } from './marker';
export type { MarkerPlacement } from './marker';
export { formatLocalTimeNote } from './local-time';
export { domePoint, domeRadius, passProfilePath } from './sky';
export type { DomePoint } from './sky';
