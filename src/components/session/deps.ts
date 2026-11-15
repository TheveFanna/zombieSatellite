import type { PointingSession } from '../pointing/pointing-session';

export interface NoiseSource { next(): number }   // [0, 1)
export interface AudioParamLike { value: number; setTargetAtTime(target: number, startTime: number, timeConstant: number): unknown }
export interface AudioNodeLike { connect(destination: AudioNodeLike): unknown; disconnect(): void }
export interface GainNodeLike extends AudioNodeLike { readonly gain: AudioParamLike }
export interface OscillatorNodeLike extends AudioNodeLike { type: string; readonly frequency: AudioParamLike; start(): void; stop(): void }
export interface BiquadFilterNodeLike extends AudioNodeLike { type: string; readonly frequency: AudioParamLike; readonly Q: AudioParamLike }
export interface AudioBufferLike { getChannelData(channel: number): Float32Array }
export interface AudioBufferSourceNodeLike extends AudioNodeLike { buffer: AudioBufferLike | null; loop: boolean; start(): void; stop(): void }
export interface AudioContextLike {
  readonly currentTime: number; readonly sampleRate: number; readonly state: string;
  readonly destination: AudioNodeLike;
  resume(): Promise<void>; close(): Promise<void>;
  createGain(): GainNodeLike; createOscillator(): OscillatorNodeLike; createBiquadFilter(): BiquadFilterNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createBufferSource(): AudioBufferSourceNodeLike;
}
export type AudioContextFactory = () => AudioContextLike | null;

export type SensorPointing = Pick<PointingSession,
  'subscribe' | 'getSnapshot' | 'setTarget' | 'setObserver' | 'pointerDown' | 'pointerMove' | 'pointerUp'>;
