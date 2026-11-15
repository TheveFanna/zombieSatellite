// No-DOM run (design.md, "No-DOM run"; Requirement 2, criterion 3; Requirement 14, criterion 9): every
// Public_Interface function runs to completion while `window`, `document`, `navigator`, `localStorage` and
// `indexedDB` are undefined in the global scope. Node.js 22 defines `navigator` by default, so the test removes
// it, like any other of the five that exists, for its duration and restores the saved property descriptors in
// `finally`. The calls use valid inputs from the baselines. The test passes when no call throws or rejects; the
// values that the calls return are checked by the other test files.
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  createSatrec,
  createTleFetcher,
  isEngineError,
  normalizeAzimuthDeg,
  observeAt,
  parseTle,
  predictPasses,
  propagateAt,
} from '../../src/lib/orbit/index';
import { ISS_AT_1123Z, ISS_BASELINE, REFERENCE_OBSERVER } from '../helpers/baseline';
import { createMockCelestrakFetch } from '../helpers/mock-celestrak';

const DOM_GLOBALS = ['window', 'document', 'navigator', 'localStorage', 'indexedDB'] as const;

// The window start of the section 4.6 runs. The window of the predictPasses call is 24 h.
const WINDOW_START_MS = Date.parse('2026-11-09T00:00:00Z');

describe('Orbit_Engine without DOM globals (Requirement 2, criterion 3; Requirement 14, criterion 9)', () => {
  it('runs every Public_Interface function with valid inputs', async () => {
    const saved = DOM_GLOBALS.map((name) => ({ name, descriptor: Object.getOwnPropertyDescriptor(globalThis, name) }));
    try {
      for (const name of DOM_GLOBALS) {
        Reflect.deleteProperty(globalThis, name);
      }
      expect(typeof window).toBe('undefined');
      expect(typeof document).toBe('undefined');
      expect(typeof navigator).toBe('undefined');
      expect(typeof localStorage).toBe('undefined');
      expect(typeof indexedDB).toBe('undefined');

      // Every call below must return or resolve.
      const tle = parseTle(ISS_BASELINE.text);
      const fetcher = createTleFetcher({ fetch: createMockCelestrakFetch() });
      await fetcher.fetchTle(ISS_BASELINE.expected.NORAD_CAT_ID);
      const satrec = createSatrec(tle);
      propagateAt(satrec, ISS_AT_1123Z.timeMs);
      observeAt(satrec, ISS_AT_1123Z.timeMs, REFERENCE_OBSERVER);
      normalizeAzimuthDeg(ISS_AT_1123Z.azimuthDeg);
      predictPasses({ observer: REFERENCE_OBSERVER, tle, start: WINDOW_START_MS, durationHours: 24 });
      const error = new EngineError('invalid-input', 'example');
      isEngineError(error);
    } finally {
      for (const { name, descriptor } of saved) {
        if (descriptor === undefined) {
          Reflect.deleteProperty(globalThis, name);
        } else {
          Object.defineProperty(globalThis, name, descriptor);
        }
      }
    }
  });
});
