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
