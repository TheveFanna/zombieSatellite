// Feature: shell-pwa-deploy, Testing Strategy item 8: Service_Worker registration
// **Validates: Requirement 5.1**
import { describe, expect, it } from 'vitest';
import { registerServiceWorker } from '../../src/components/shell/service-worker';

describe('registerServiceWorker', () => {
  it('does nothing on a host without serviceWorker', () => {
    expect(() => registerServiceWorker({})).not.toThrow();
  });

  it('swallows a rejecting register', async () => {
    let settled = false;
    const rejection = Promise.reject(new Error('blocked'));
    registerServiceWorker({
      serviceWorker: {
        register: () => {
          settled = true;
          return rejection;
        },
      },
    });
    await Promise.resolve();
    expect(settled).toBe(true);
  });

  it('registers /sw.js with scope /', () => {
    const calls: Array<[string, { scope: string }]> = [];
    registerServiceWorker({
      serviceWorker: {
        register: (url, options) => {
          calls.push([url, options]);
          return Promise.resolve();
        },
      },
    });
    expect(calls).toEqual([['/sw.js', { scope: '/' }]]);
  });
});
