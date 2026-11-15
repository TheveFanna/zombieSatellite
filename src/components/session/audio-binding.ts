import type { BeaconState } from '../../lib/session/index';
import type { AudioContextLike, AudioNodeLike, NoiseSource } from './deps';

export const FREQUENCY_TIME_CONSTANT_S = 0.15;
export const GAIN_TIME_CONSTANT_S = 0.005;
export const NOISE_TIME_CONSTANT_S = 0.05;
export const MASTER_TIME_CONSTANT_S = 0.02;
export const TICK_FILTER_Q = 8;
export const NOISE_BUFFER_SECONDS = 2;

export interface AudioBinding {
  apply(state: BeaconState, atS: number): void;
  setMaster(muted: boolean, volume: number): void;
  currentTime(): number;
  dispose(): void;
}

export function createAudioBinding(ctx: AudioContextLike, noise: NoiseSource): AudioBinding {
  const oscillator = ctx.createOscillator();
  const carrierGain = ctx.createGain();
  const noiseGain = ctx.createGain();
  const tickGain = ctx.createGain();
  const master = ctx.createGain();
  const bandpass = ctx.createBiquadFilter();
  const noiseSource = ctx.createBufferSource();

  oscillator.type = 'sine';
  bandpass.type = 'bandpass';
  bandpass.Q.value = TICK_FILTER_Q;

  carrierGain.gain.value = 0;
  noiseGain.gain.value = 0;
  tickGain.gain.value = 0;
  master.gain.value = 0;

  const length = Math.floor(NOISE_BUFFER_SECONDS * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i += 1) samples[i] = 2 * noise.next() - 1;
  noiseSource.buffer = buffer;
  noiseSource.loop = true;

  oscillator.connect(carrierGain);
  carrierGain.connect(master);
  noiseSource.connect(noiseGain);
  noiseGain.connect(master);
  noiseSource.connect(bandpass);
  bandpass.connect(tickGain);
  tickGain.connect(master);
  master.connect(ctx.destination);

  oscillator.start();
  noiseSource.start();

  const nodes: AudioNodeLike[] = [
    oscillator, noiseSource, carrierGain, noiseGain, tickGain, bandpass, master,
  ];

  return {
    apply(state, atS) {
      oscillator.frequency.setTargetAtTime(state.carrierFrequencyHz, atS, FREQUENCY_TIME_CONSTANT_S);
      bandpass.frequency.setTargetAtTime(state.carrierFrequencyHz, atS, FREQUENCY_TIME_CONSTANT_S);
      carrierGain.gain.setTargetAtTime(state.carrierGain, atS, GAIN_TIME_CONSTANT_S);
      tickGain.gain.setTargetAtTime(state.tickGain, atS, GAIN_TIME_CONSTANT_S);
      noiseGain.gain.setTargetAtTime(state.noiseGain, atS, NOISE_TIME_CONSTANT_S);
    },
    setMaster(muted, volume) {
      const level = muted ? 0 : Math.min(1, Math.max(0, volume));
      master.gain.setTargetAtTime(level, ctx.currentTime, MASTER_TIME_CONSTANT_S);
    },
    currentTime() {
      return ctx.currentTime;
    },
    dispose() {
      try { oscillator.stop(); } catch { /* ignore */ }
      try { noiseSource.stop(); } catch { /* ignore */ }
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* ignore */ }
      }
      try {
        void Promise.resolve(ctx.close()).catch(() => undefined);
      } catch { /* ignore */ }
    },
  };
}
