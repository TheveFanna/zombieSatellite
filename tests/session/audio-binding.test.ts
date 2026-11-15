// Feature: seance-session, Property 9: Audio binding applies the state
// Feature: seance-session, Property 10: Audio context only from the gesture entry
// **Validates: Requirements 6.2, 6.3, 6.5, 6.7, 6.10, 6.11, 6.12**
import { describe, expect, it } from 'vitest';
import { createAudioBinding } from '../../src/components/session/audio-binding';
import { createAudioContextFactory } from '../../src/components/session/browser-deps';
import type { BeaconState } from '../../src/lib/session/index';
import { createMockAudioContext, createScriptedNoise } from '../helpers/session-mocks';

describe('Property 9: Audio binding applies the state', () => {
  it('apply and setMaster each issue exactly the calls of the node-graph table', () => {
    const mock = createMockAudioContext({ currentTime: 2.25 });
    const binding = createAudioBinding(mock, createScriptedNoise([0.5]));
    const { oscillator, bandpass, carrierGain, noiseGain, tickGain, master } = mock.nodes;

    const params = [
      oscillator.frequency,
      bandpass.frequency,
      carrierGain.gain,
      tickGain.gain,
      noiseGain.gain,
      master.gain,
    ];
    for (const param of params) expect(param.calls).toHaveLength(0);

    const state: BeaconState = {
      mode: 'cw',
      carrierFrequencyHz: 800,
      carrierGain: 0.4,
      noiseGain: 0.1,
      tickGain: 0.2,
    };
    binding.apply(state, 1.5);

    expect(oscillator.frequency.calls).toEqual([[800, 1.5, 0.15]]);
    expect(bandpass.frequency.calls).toEqual([[800, 1.5, 0.15]]);
    expect(carrierGain.gain.calls).toEqual([[0.4, 1.5, 0.005]]);
    expect(tickGain.gain.calls).toEqual([[0.2, 1.5, 0.005]]);
    expect(noiseGain.gain.calls).toEqual([[0.1, 1.5, 0.05]]);
    expect(master.gain.calls).toHaveLength(0);

    binding.setMaster(true, 0.7);
    expect(master.gain.calls).toEqual([[0, 2.25, 0.02]]);
    expect(oscillator.frequency.calls).toHaveLength(1);
    expect(bandpass.frequency.calls).toHaveLength(1);
    expect(carrierGain.gain.calls).toHaveLength(1);
    expect(tickGain.gain.calls).toHaveLength(1);
    expect(noiseGain.gain.calls).toHaveLength(1);

    binding.setMaster(false, 0.4);
    expect(master.gain.calls).toEqual([
      [0, 2.25, 0.02],
      [0.4, 2.25, 0.02],
    ]);
    expect(oscillator.frequency.calls).toHaveLength(1);
    expect(bandpass.frequency.calls).toHaveLength(1);
    expect(carrierGain.gain.calls).toHaveLength(1);
    expect(tickGain.gain.calls).toHaveLength(1);
    expect(noiseGain.gain.calls).toHaveLength(1);
  });
});

describe('Property 10: Audio context only from the gesture entry (factory part)', () => {
  class MockCtor {}
  class PreferredCtor {}

  it('falls back to webkitAudioContext', () => {
    const created = createAudioContextFactory({ webkitAudioContext: MockCtor })();
    expect(created).toBeInstanceOf(MockCtor);
  });

  it('prefers AudioContext when both are provided', () => {
    const created = createAudioContextFactory({
      AudioContext: PreferredCtor,
      webkitAudioContext: MockCtor,
    })();
    expect(created).toBeInstanceOf(PreferredCtor);
    expect(created).not.toBeInstanceOf(MockCtor);
  });
});
