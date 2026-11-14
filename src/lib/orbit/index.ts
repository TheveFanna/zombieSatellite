// Public_Interface of the Orbit_Engine and its only entry file.
// Helpers such as toTimeMs, radToDeg and the other constants stay internal.
export { EngineError, isEngineError } from './errors';
export type { EngineErrorCategory, EngineErrorOptions } from './errors';
export { REQUEST_TIMEOUT_MS, TLE_CACHE_TTL_MS } from './constants';
export type { TimeInput } from './time';
