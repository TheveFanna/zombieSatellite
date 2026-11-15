import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextFactory,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  BiquadFilterNodeLike,
  GainNodeLike,
  NoiseSource,
  OscillatorNodeLike,
} from '../../src/components/session/deps';
import type { SensorPointing } from '../../src/components/session/deps';
import type { Clock, TimerApi } from '../../src/components/pointing/deps';
import type { PointingSnapshot } from '../../src/components/pointing/pointing-session';
import { parseTle } from '../../src/lib/orbit/index';
import type { TleFetcher, TleRecord } from '../../src/lib/orbit/index';
import { ISS_BASELINE } from './baseline';

export type ParamCall = readonly [target: number, startTime: number, timeConstant: number];

export interface MockAudioParam extends AudioParamLike {
  readonly calls: ParamCall[];
}

function createMockParam(): MockAudioParam {
  const calls: ParamCall[] = [];
  return {
    value: 0,
    calls,
    setTargetAtTime(target, startTime, timeConstant) {
      calls.push([target, startTime, timeConstant]);
    },
  };
}

interface MockNodeBase extends AudioNodeLike {
  readonly connections: AudioNodeLike[];
  disconnectCalls: number;
}

function nodeBase(): MockNodeBase {
  const connections: AudioNodeLike[] = [];
  return {
    connections,
    disconnectCalls: 0,
    connect(destination) {
      connections.push(destination);
    },
    disconnect() {
      this.disconnectCalls += 1;
    },
  };
}

export interface MockGainNode extends GainNodeLike, MockNodeBase {
  readonly gain: MockAudioParam;
}
export interface MockOscillatorNode extends OscillatorNodeLike, MockNodeBase {
  readonly frequency: MockAudioParam;
  startCalls: number;
  stopCalls: number;
}
export interface MockBiquadFilterNode extends BiquadFilterNodeLike, MockNodeBase {
  readonly frequency: MockAudioParam;
  readonly Q: MockAudioParam;
}
export interface MockBufferSourceNode extends AudioBufferSourceNodeLike, MockNodeBase {
  startCalls: number;
  stopCalls: number;
}

export interface MockAudioNodes {
  readonly oscillator: MockOscillatorNode;
  readonly bandpass: MockBiquadFilterNode;
  readonly carrierGain: MockGainNode;
  readonly noiseGain: MockGainNode;
  readonly tickGain: MockGainNode;
  readonly master: MockGainNode;
  readonly noiseSource: MockBufferSourceNode;
}

export interface MockAudioContext extends AudioContextLike {
  currentTime: number;
  state: string;
  readonly resumeCalls: number;
  readonly closeCalls: number;
  /** Nodes by role. Throws if the binding has not created them yet. */
  readonly nodes: MockAudioNodes;
}

export interface MockAudioContextOptions {
  sampleRate?: number;
  currentTime?: number;
  state?: string;
}

export function createMockAudioContext(options: MockAudioContextOptions = {}): MockAudioContext {
  const gains: MockGainNode[] = [];
  const oscillators: MockOscillatorNode[] = [];
  const filters: MockBiquadFilterNode[] = [];
  const sources: MockBufferSourceNode[] = [];
  let resumeCalls = 0;
  let closeCalls = 0;

  const destination: AudioNodeLike = { connect: () => undefined, disconnect: () => undefined };

  return {
    currentTime: options.currentTime ?? 0,
    state: options.state ?? 'suspended',
    sampleRate: options.sampleRate ?? 8000,
    destination,
    get resumeCalls() { return resumeCalls; },
    get closeCalls() { return closeCalls; },
    resume() {
      resumeCalls += 1;
      return Promise.resolve();
    },
    close() {
      closeCalls += 1;
      return Promise.resolve();
    },
    createGain() {
      const node: MockGainNode = { ...nodeBase(), gain: createMockParam() };
      gains.push(node);
      return node;
    },
    createOscillator() {
      const node: MockOscillatorNode = {
        ...nodeBase(),
        type: 'sine',
        frequency: createMockParam(),
        startCalls: 0,
        stopCalls: 0,
        start() { this.startCalls += 1; },
        stop() { this.stopCalls += 1; },
      };
      oscillators.push(node);
      return node;
    },
    createBiquadFilter() {
      const node: MockBiquadFilterNode = {
        ...nodeBase(),
        type: 'lowpass',
        frequency: createMockParam(),
        Q: createMockParam(),
      };
      filters.push(node);
      return node;
    },
    createBuffer(_channels, length) {
      const data = new Float32Array(length);
      const buffer: AudioBufferLike = { getChannelData: () => data };
      return buffer;
    },
    createBufferSource() {
      const node: MockBufferSourceNode = {
        ...nodeBase(),
        buffer: null,
        loop: false,
        startCalls: 0,
        stopCalls: 0,
        start() { this.startCalls += 1; },
        stop() { this.stopCalls += 1; },
      };
      sources.push(node);
      return node;
    },
    get nodes(): MockAudioNodes {
      // Roles follow the creation order in audio-binding.ts: there is one oscillator, one
      // biquad filter and one buffer source, and the four gains are created in the order
      // carrierGain, noiseGain, tickGain, master. Keep this in step with createAudioBinding.
      const [carrierGain, noiseGain, tickGain, master] = gains;
      const oscillator = oscillators[0];
      const bandpass = filters[0];
      const noiseSource = sources[0];
      if (!carrierGain || !noiseGain || !tickGain || !master || !oscillator || !bandpass || !noiseSource) {
        throw new Error('mock audio context: the binding has not created all nodes');
      }
      return { oscillator, bandpass, carrierGain, noiseGain, tickGain, master, noiseSource };
    },
  };
}

export function createCountingAudioContextFactory(
  mock: AudioContextLike,
): { factory: AudioContextFactory; calls(): number } {
  let count = 0;
  return {
    factory: () => {
      count += 1;
      return mock;
    },
    calls: () => count,
  };
}

export function createScriptedNoise(values: number[]): NoiseSource {
  let index = 0;
  return {
    next() {
      const value = values[Math.min(index, values.length - 1)] ?? 0;
      index += 1;
      return value;
    },
  };
}

export type ManualClock = Clock & { advance(ms: number): void; set(ms: number): void };

export function createManualClock(startMs: number): ManualClock {
  let now = startMs;
  return {
    nowMs: () => now,
    advance(ms) { now += ms; },
    set(ms) { now = ms; },
  };
}

export interface ManualTimers extends TimerApi {
  /** Runs once every callback that is pending at the call; callbacks scheduled during the run wait for the next call. */
  fireAll(): void;
  pendingCount(): number;
}

export function createManualTimers(): ManualTimers {
  const pending = new Map<number, () => void>();
  let nextHandle = 1;
  return {
    setTimeout(fn) {
      const handle = nextHandle;
      nextHandle += 1;
      pending.set(handle, fn);
      return handle;
    },
    clearTimeout(handle) {
      pending.delete(handle as number);
    },
    fireAll() {
      const due = [...pending.entries()];
      for (const [handle, fn] of due) {
        // A callback may clear a later one in the same batch; skip it then.
        if (!pending.has(handle)) continue;
        pending.delete(handle);
        fn();
      }
    },
    pendingCount: () => pending.size,
  };
}

export interface MockTleFetcher extends TleFetcher {
  /** The NORAD IDs requested so far, in call order. */
  readonly calls: number[];
}

/**
 * Returns the ISS Baseline_TLE_Snapshot with the catalog-number field (columns 3 to 7 of both lines) replaced by the
 * requested NORAD ID, so the record's NORAD_CAT_ID equals the requested ID. Only the number changes; the orbital
 * elements stay the ISS values, so the fixture is a test orbit, not the entry's real orbit. The checksum digit is
 * left as it is (parseTle does not verify it).
 */
export function createMockTleFetcher(options: { failTimes?: number } = {}): MockTleFetcher {
  const calls: number[] = [];
  let remainingFailures = options.failTimes ?? 0;
  return {
    calls,
    fetchTle(noradId: number): Promise<TleRecord> {
      calls.push(noradId);
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        return Promise.reject(new Error('mock TLE fetch failure'));
      }
      const field = String(noradId).padStart(5, '0');
      const swap = (line: string): string => line.slice(0, 2) + field + line.slice(7);
      const text = [ISS_BASELINE.name, swap(ISS_BASELINE.line1), swap(ISS_BASELINE.line2)].join('\n');
      return Promise.resolve(parseTle(text));
    },
  };
}

export interface StubSensorPointing extends SensorPointing {
  readonly setTargetCalls: Parameters<SensorPointing['setTarget']>[0][];
  readonly setObserverCalls: Parameters<SensorPointing['setObserver']>[0][];
}

export function createStubSensorPointing(): StubSensorPointing {
  const snapshot: PointingSnapshot = {
    permission: 'unknown',
    mode: 'sensor',
    source: null,
    basis: null,
    lock: null,
    calibrationOffsetDeg: 0,
    declinationAppliedDeg: null,
    observer: { latitudeDeg: 39.9042, longitudeDeg: 116.4074 },
    target: { azimuthDeg: 90, elevationDeg: 30 },
    dragActive: false,
  };
  const setTargetCalls: StubSensorPointing['setTargetCalls'] = [];
  const setObserverCalls: StubSensorPointing['setObserverCalls'] = [];
  return {
    setTargetCalls,
    setObserverCalls,
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
    setTarget(target) { setTargetCalls.push(target); },
    setObserver(observer) { setObserverCalls.push(observer); },
    pointerDown: () => undefined,
    pointerMove: () => undefined,
    pointerUp: () => undefined,
  };
}
