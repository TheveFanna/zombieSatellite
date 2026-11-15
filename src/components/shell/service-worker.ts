export interface ServiceWorkerHost {
  readonly serviceWorker?: { register(scriptUrl: string, options: { scope: string }): Promise<unknown> };
}

export const SERVICE_WORKER_URL = '/sw.js';

/** Registers `/sw.js` with scope `/`. Never throws; a missing API or a rejection is ignored. */
export function registerServiceWorker(host: ServiceWorkerHost): void {
  try {
    const container = host.serviceWorker;
    if (container === undefined || typeof container.register !== 'function') return;
    container.register(SERVICE_WORKER_URL, { scope: '/' }).catch(() => undefined);
  } catch {
    // An unsupported or broken API leaves the app a normal web page.
  }
}
