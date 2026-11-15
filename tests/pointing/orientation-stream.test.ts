// Feature: ar-pointing, Controller example checks: orientation stream
// Validates: Requirements 3.10, 4.4
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrientationStream } from '../../src/components/pointing/orientation-stream';
import {
  createMockEventSource,
  createMockVisibility,
  fakeTimerApi,
} from '../helpers/pointing-mocks';

function setup() {
  const events = createMockEventSource();
  const visibility = createMockVisibility();
  const onAttitude = vi.fn();
  const onFirstValidSample = vi.fn();
  const onNoSampleTimeout = vi.fn();
  const stream = createOrientationStream({
    events,
    timers: fakeTimerApi(),
    visibility,
    onAttitude,
    onFirstValidSample,
    onNoSampleTimeout,
  });
  stream.start();
  return { events, visibility, onAttitude, onFirstValidSample, onNoSampleTimeout, stream };
}

const relative = { absolute: false, alpha: 10, beta: 45, gamma: 5 };
const absolute = { absolute: true, alpha: 200, beta: 50, gamma: 6 };

describe('orientation stream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('relative then absolute inside the window selects absolute at 300 ms', () => {
    const { events, stream } = setup();
    events.dispatch('deviceorientation', relative);
    vi.advanceTimersByTime(100);
    events.dispatch('deviceorientationabsolute', absolute);
    vi.advanceTimersByTime(199);
    expect(stream.getSource()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(stream.getSource()).toBe('absolute');
  });

  it('does not switch source after lock', () => {
    const { events, stream } = setup();
    events.dispatch('deviceorientation', relative);
    vi.advanceTimersByTime(300);
    expect(stream.getSource()).toBe('relative');
    const locked = stream.getAttitude();
    vi.advanceTimersByTime(200);
    events.dispatch('deviceorientationabsolute', absolute);
    expect(stream.getSource()).toBe('relative');
    expect(stream.getAttitude()).toBe(locked);
  });

  it('opens the window at a late first sample instead of locking at once', () => {
    const { events, stream } = setup();
    vi.advanceTimersByTime(1000);
    events.dispatch('deviceorientation', relative);
    vi.advanceTimersByTime(299);
    expect(stream.getSource()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(stream.getSource()).toBe('relative');
  });

  it('all-null samples only: no source, no attitude, timeout fires once at 3000 ms', () => {
    const { events, stream, onFirstValidSample, onNoSampleTimeout } = setup();
    const nulls = { absolute: false, alpha: null, beta: null, gamma: null };
    events.dispatch('deviceorientation', nulls);
    vi.advanceTimersByTime(100);
    events.dispatch('deviceorientation', nulls);
    expect(stream.getSource()).toBeNull();
    expect(stream.getAttitude()).toBeNull();
    expect(onFirstValidSample).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2899);
    expect(onNoSampleTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onNoSampleTimeout).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onNoSampleTimeout).toHaveBeenCalledTimes(1);
    expect(stream.getSource()).toBeNull();
    expect(stream.getAttitude()).toBeNull();
    expect(onFirstValidSample).not.toHaveBeenCalled();
  });

  it('removes listeners when hidden and reselects after becoming visible', () => {
    const { events, visibility, stream } = setup();
    events.dispatch('deviceorientation', relative);
    vi.advanceTimersByTime(300);
    expect(stream.getSource()).toBe('relative');

    visibility.setHidden(true);
    expect(events.listenerCount('deviceorientation')).toBe(0);
    expect(events.listenerCount('deviceorientationabsolute')).toBe(0);
    expect(stream.getAttitude()).toBeNull();
    expect(stream.getSource()).toBeNull();

    visibility.setHidden(false);
    expect(events.listenerCount('deviceorientation')).toBe(1);
    expect(events.listenerCount('deviceorientationabsolute')).toBe(1);

    vi.advanceTimersByTime(500);
    events.dispatch('deviceorientationabsolute', absolute);
    vi.advanceTimersByTime(299);
    expect(stream.getSource()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(stream.getSource()).toBe('absolute');
  });

  it('keeps the previous attitude when alpha becomes null after a valid sample', () => {
    const { events, stream } = setup();
    expect(stream.getAttitude()).toBeNull();
    events.dispatch('deviceorientation', relative);
    vi.advanceTimersByTime(300);
    const before = stream.getAttitude();
    expect(before).not.toBeNull();
    events.dispatch('deviceorientation', { ...relative, alpha: null });
    expect(stream.getAttitude()).toBe(before);
    expect(stream.getAttitude()).toMatchObject({ alphaDeg: 10 });
  });
});
