import type { ReactNode } from 'react';
import { FIELD_COPY } from '../../../lib/field/index';
import type { IlluminationProfile } from '../../../lib/field/index';

export function IlluminationBadge({ profile, sunlitOnly }: { profile: IlluminationProfile | null; sunlitOnly: boolean }) {
  if (profile === null) return null;
  const text =
    profile.kind === 'sunlit'
      ? FIELD_COPY.illuminationSunlit
      : profile.kind === 'shadowed'
        ? FIELD_COPY.illuminationShadowed
        : profile.kind === 'partly'
          ? FIELD_COPY.illuminationPartly
          : FIELD_COPY.illuminationUnknown;
  const silent = sunlitOnly && (profile.kind === 'shadowed' || profile.kind === 'partly');
  return (
    <p className={'badge badge-' + profile.kind}>
      {text}
      {silent ? ' · ' + FIELD_COPY.silentInShadow : null}
    </p>
  );
}

export function InstrumentDetail({ children }: { children: ReactNode }) {
  return (
    <details className="instrument">
      <summary>{FIELD_COPY.instrumentLabel}</summary>
      {children}
    </details>
  );
}
