import type { GeolocationLike } from './geolocation';

/**
 * The real browser geolocation API, or null when the browser has none.
 * Browser only: the pages call it inside `useEffect`.
 */
export function browserGeolocation(): GeolocationLike | null {
  try {
    return typeof navigator !== 'undefined' && navigator.geolocation ? navigator.geolocation : null;
  } catch {
    return null;
  }
}
