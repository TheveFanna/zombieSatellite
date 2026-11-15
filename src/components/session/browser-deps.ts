import type { AudioContextFactory, AudioContextLike } from './deps';

type AudioContextConstructor = new () => unknown;

/**
 * Builds the factory that creates a real audio context. The globals are passed in
 * (the page passes `window`), so this function touches no global itself.
 * Uses `AudioContext` when it is a function, else `webkitAudioContext`, else the
 * factory returns `null`.
 */
export function createAudioContextFactory(
  globals: { AudioContext?: unknown; webkitAudioContext?: unknown },
): AudioContextFactory {
  const Ctor =
    typeof globals.AudioContext === 'function'
      ? globals.AudioContext
      : typeof globals.webkitAudioContext === 'function'
        ? globals.webkitAudioContext
        : null;
  if (Ctor === null) return () => null;
  const Construct = Ctor as AudioContextConstructor;
  return () => new Construct() as AudioContextLike;
}
