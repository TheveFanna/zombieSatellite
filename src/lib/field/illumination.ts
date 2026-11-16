import { propagateAt } from '../orbit/index';
import type { Pass, Satrec } from '../orbit/index';
import { ILLUMINATION_REFINE_MS, ILLUMINATION_STEP_MS, MAX_ILLUMINATION_SAMPLES } from './constants';
import { isInShadow } from './shadow';

export type ShadowTransition = { readonly atMs: number; readonly kind: 'entry' | 'exit' };
export type IlluminationProfile =
  | { readonly kind: 'sunlit' }
  | { readonly kind: 'shadowed' }
  | { readonly kind: 'partly'; readonly startsInShadow: boolean; readonly transitions: readonly ShadowTransition[] }
  | { readonly kind: 'unavailable' };

/** Shadow state at an instant, or null when propagation fails. */
function shadowAtInstant(satrec: Satrec, tMs: number): boolean | null {
  const r = propagateAt(satrec, tMs);
  return r.ok ? isInShadow(r.eciPositionKm, tMs) : null;
}

export function illuminationProfile(satrec: Satrec, pass: Pass): IlluminationProfile {
  const span = pass.setMs - pass.riseMs;
  const step = Math.max(
    ILLUMINATION_STEP_MS,
    Math.ceil(span / (MAX_ILLUMINATION_SAMPLES * 1000)) * 1000,
  );
  const good: Array<{ tMs: number; shadow: boolean }> = [];
  for (let t = pass.riseMs; ; t += step) {
    const at = Math.min(t, pass.setMs);
    const s = shadowAtInstant(satrec, at);
    if (s !== null) good.push({ tMs: at, shadow: s });
    if (at >= pass.setMs) break;
  }
  if (good.length === 0) return { kind: 'unavailable' };

  const transitions: ShadowTransition[] = [];
  for (let i = 1; i < good.length; i += 1) {
    const prev = good[i - 1];
    const next = good[i];
    if (prev.shadow === next.shadow) continue;
    let lo = prev.tMs;
    let hi = next.tMs;
    while (hi - lo > ILLUMINATION_REFINE_MS) {
      const mid = Math.floor((lo + hi) / 2);
      const s = shadowAtInstant(satrec, mid);
      if (s === null) break;
      if (s === prev.shadow) lo = mid;
      else hi = mid;
    }
    transitions.push({ atMs: hi, kind: next.shadow ? 'entry' : 'exit' });
  }
  const startsInShadow = good[0].shadow;
  if (transitions.length === 0) return { kind: startsInShadow ? 'shadowed' : 'sunlit' };
  return { kind: 'partly', startsInShadow, transitions };
}

/** True in shadow, false sunlit, null when the profile is unavailable. */
export function shadowedAt(profile: IlluminationProfile, tMs: number): boolean | null {
  switch (profile.kind) {
    case 'unavailable':
      return null;
    case 'sunlit':
      return false;
    case 'shadowed':
      return true;
    case 'partly': {
      let state = profile.startsInShadow;
      for (const tr of profile.transitions) {
        if (tr.atMs <= tMs) state = tr.kind === 'entry';
        else break;
      }
      return state;
    }
  }
}

export function shadowIntervals(
  profile: IlluminationProfile,
  pass: Pass,
): ReadonlyArray<{ fromMs: number; toMs: number }> {
  if (profile.kind === 'shadowed') return [{ fromMs: pass.riseMs, toMs: pass.setMs }];
  if (profile.kind !== 'partly') return [];
  const out: Array<{ fromMs: number; toMs: number }> = [];
  let from: number | null = profile.startsInShadow ? pass.riseMs : null;
  for (const tr of profile.transitions) {
    if (tr.kind === 'entry') from = tr.atMs;
    else if (from !== null) {
      out.push({ fromMs: from, toMs: tr.atMs });
      from = null;
    }
  }
  if (from !== null) out.push({ fromMs: from, toMs: pass.setMs });
  return out;
}
