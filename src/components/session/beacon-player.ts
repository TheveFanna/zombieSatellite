import { SILENT_BEACON_STATE } from '../../lib/session/index';
import type { BeaconState } from '../../lib/session/index';
import type { TimerApi } from '../pointing/deps';
import { createAudioBinding } from './audio-binding';
import type { AudioBinding } from './audio-binding';
import type { AudioContextFactory, AudioContextLike, NoiseSource } from './deps';

export const BEACON_SCHEDULER_INTERVAL_MS = 25;
export const BEACON_STEP_S = 0.02;
export const BEACON_LOOKAHEAD_S = 0.1;
export const DEFAULT_VOLUME = 0.7;

export type AudioStatus = 'off' | 'running' | 'suspended' | 'unavailable';

export interface BeaconPlayer {
  enableFromGesture(): AudioStatus;
  status(): AudioStatus;
  start(stateAt: (phaseS: number) => BeaconState): void;
  stop(): void;
  setMaster(muted: boolean, volume: number): void;
  dispose(): void;
}

export function createBeaconPlayer(deps: {
  audioContextFactory: AudioContextFactory;
  timers: TimerApi;
  noise: NoiseSource;
}): BeaconPlayer {
  let factoryCalled = false;
  let unavailable = false;
  let ctx: AudioContextLike | null = null;
  let binding: AudioBinding | null = null;
  let muted = false;
  let volume = DEFAULT_VOLUME;

  let stateAt: ((phaseS: number) => BeaconState) | null = null;
  let scheduling = false;
  let origin = 0;
  let nextPointS = 0;
  let timerHandle: unknown = null;
  let timerArmed = false;

  function clearTimer(): void {
    if (timerArmed) {
      deps.timers.clearTimeout(timerHandle);
      timerArmed = false;
      timerHandle = null;
    }
  }

  function run(): void {
    timerArmed = false;
    timerHandle = null;
    if (!scheduling || binding === null || stateAt === null) return;
    const now = binding.currentTime();
    if (nextPointS < now) nextPointS = now;
    const horizon = now + BEACON_LOOKAHEAD_S;
    while (nextPointS <= horizon) {
      binding.apply(stateAt(nextPointS - origin), nextPointS);
      nextPointS += BEACON_STEP_S;
    }
    timerHandle = deps.timers.setTimeout(run, BEACON_SCHEDULER_INTERVAL_MS);
    timerArmed = true;
  }

  function beginScheduling(): void {
    if (binding === null || stateAt === null) return;
    clearTimer();
    origin = binding.currentTime();
    nextPointS = origin;
    scheduling = true;
    run();
  }

  function stopScheduling(): void {
    scheduling = false;
    clearTimer();
  }

  function status(): AudioStatus {
    if (unavailable) return 'unavailable';
    if (ctx === null) return 'off';
    return ctx.state === 'running' ? 'running' : 'suspended';
  }

  return {
    enableFromGesture() {
      if (!factoryCalled) {
        factoryCalled = true;
        try {
          const created = deps.audioContextFactory();
          if (created === null) {
            unavailable = true;
          } else {
            ctx = created;
            binding = createAudioBinding(created, deps.noise);
          }
        } catch {
          unavailable = true;
          ctx = null;
          binding = null;
        }
        if (unavailable) return 'unavailable';
        binding?.setMaster(muted, volume);
      }
      if (ctx === null || binding === null) return status();
      if (ctx.state !== 'running') {
        try {
          void Promise.resolve(ctx.resume()).catch(() => undefined);
        } catch { /* ignore */ }
      }
      if (stateAt !== null && !scheduling) beginScheduling();
      return status();
    },
    status,
    start(next) {
      stateAt = next;
      if (binding === null) return;
      beginScheduling();
    },
    stop() {
      stateAt = null;
      stopScheduling();
      binding?.apply(SILENT_BEACON_STATE, binding.currentTime());
    },
    setMaster(nextMuted, nextVolume) {
      muted = nextMuted;
      volume = nextVolume;
      binding?.setMaster(muted, volume);
    },
    dispose() {
      stateAt = null;
      stopScheduling();
      if (binding !== null) {
        binding.apply(SILENT_BEACON_STATE, binding.currentTime());
        binding.dispose();
      }
      binding = null;
      ctx = null;
    },
  };
}
