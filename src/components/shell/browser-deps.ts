import type { MediaDevicesLike } from './camera';
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

/**
 * The real `navigator.mediaDevices`, or null outside a secure context or without `getUserMedia`.
 * Browser only.
 */
export function browserMediaDevices(): MediaDevicesLike | null {
  try {
    if (typeof window === 'undefined' || !window.isSecureContext) return null;
    const devices = navigator.mediaDevices as MediaDevices | undefined;
    return devices !== undefined && typeof devices.getUserMedia === 'function' ? devices : null;
  } catch {
    return null;
  }
}
