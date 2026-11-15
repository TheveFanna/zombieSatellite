import type {
  EventSourceLike,
  KeyValueStorage,
  PermissionRequester,
  TimerApi,
  VisibilitySource,
} from '../../src/components/pointing/deps';

type Listener = (event: unknown) => void;

export interface MockEventSource extends EventSourceLike {
  dispatch(type: string, fields: Record<string, unknown>): void;
  listenerCount(type: string): number;
}

export function createMockEventSource(): MockEventSource {
  const listeners = new Map<string, Set<Listener>>();
  return {
    addEventListener(type, listener) {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, fields) {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener({ type, ...fields });
      }
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

export interface MockVisibility extends VisibilitySource {
  setHidden(hidden: boolean): void;
}

export function createMockVisibility(initialHidden = false): MockVisibility {
  let hidden = initialHidden;
  const listeners = new Set<() => void>();
  return {
    isHidden: () => hidden,
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setHidden(value) {
      hidden = value;
      for (const listener of [...listeners]) listener();
    },
  };
}

export interface MockStorage extends KeyValueStorage {
  readonly data: Map<string, string>;
}

export function createMockStorage(): MockStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

export interface MockRequester {
  readonly requester: NonNullable<PermissionRequester>;
  calls(): number;
}

function makeRequester(produce: () => Promise<unknown>): MockRequester {
  let count = 0;
  return {
    requester: () => {
      count += 1;
      return produce();
    },
    calls: () => count,
  };
}

export function neverSettlingRequester(): MockRequester {
  return makeRequester(() => new Promise<unknown>(() => {}));
}

export function resolvingRequester(value: unknown): MockRequester {
  return makeRequester(() => Promise.resolve(value));
}

export function fakeTimerApi(): TimerApi {
  return {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as never),
  };
}
