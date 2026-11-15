'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from './service-worker';

/** Registers the Service_Worker once in production builds; renders nothing. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') registerServiceWorker(window.navigator);
  }, []);
  return null;
}
