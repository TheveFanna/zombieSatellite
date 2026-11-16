// Feature: ar-pointing, Controller example checks: permission flow
// Validates: Requirements 11.3, 11.7, 11.9, 11.10, 11.12
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrientationStream } from '../../src/components/pointing/orientation-stream';
import { createPermissionFlow } from '../../src/components/pointing/permission-flow';
import type { PermissionRequester } from '../../src/components/pointing/deps';
import {
  createMockEventSource,
  createMockVisibility,
  fakeTimerApi,
  neverSettlingRequester,
} from '../helpers/pointing-mocks';

function setup(requestPermission: PermissionRequester) {
  const events = createMockEventSource();
  const visibility = createMockVisibility();
  const timers = fakeTimerApi();
  const onState = vi.fn();
  const flow = createPermissionFlow({
    requestPermission,
    timers,
    createStream: (cb) =>
      createOrientationStream({ events, timers, visibility, onAttitude: () => {}, ...cb }),
    onState,
  });
  return { flow, events, onState };
}

describe('permission flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the requester without a gesture', () => {
    const mock = neverSettlingRequester();
    const { flow } = setup(mock.requester);
    flow.start();
    expect(mock.calls()).toBe(0);
    expect(flow.getState()).toBe('unknown');
  });

  it('returns to unknown when the request never settles', async () => {
    const mock = neverSettlingRequester();
    const { flow } = setup(mock.requester);
    flow.requestFromGesture();
    expect(flow.getState()).toBe('requesting');
    expect(mock.calls()).toBe(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(flow.getState()).toBe('unknown');
  });

  it('accepts a grant that arrives after the timeout and starts the stream', async () => {
    let answer: (value: unknown) => void = () => undefined;
    const requester = () => new Promise<unknown>((resolve) => {
      answer = resolve;
    });
    const { flow } = setup(requester);
    flow.requestFromGesture();
    await vi.advanceTimersByTimeAsync(5000);
    expect(flow.getState()).toBe('unknown');
    answer('granted');
    await vi.advanceTimersByTimeAsync(0);
    expect(flow.getState()).toBe('granted');
  });

  it('becomes unavailable at 3000 ms for a silent subscription without a requester', () => {
    const { flow } = setup(undefined);
    flow.start();
    expect(flow.getState()).toBe('granted');
    vi.advanceTimersByTime(3000);
    expect(flow.getState()).toBe('unavailable');
  });

  it('becomes unavailable at 3000 ms when only all-null samples arrive', () => {
    const { flow, events } = setup(undefined);
    flow.start();
    expect(flow.getState()).toBe('granted');
    events.dispatch('deviceorientation', { alpha: null, beta: null, gamma: null });
    vi.advanceTimersByTime(100);
    events.dispatch('deviceorientation', { alpha: null, beta: null, gamma: null });
    vi.advanceTimersByTime(2900);
    expect(flow.getState()).toBe('unavailable');
  });
});
