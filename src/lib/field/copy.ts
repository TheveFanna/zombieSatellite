// Field_Copy: plain string literals as direct property values (Honesty_Scan reads property strings).
export const FIELD_COPY = {
  illuminationSunlit: 'Sunlit during the whole pass',
  illuminationShadowed: 'In Earth\'s shadow during the whole pass',
  illuminationPartly: 'Partly in Earth\'s shadow',
  illuminationUnknown: 'Illumination unknown',
  silentInShadow: 'Silent in Earth\'s shadow',
  shadowSilenceNote: 'The satellite is in Earth\'s shadow, so the simulated beacon is silent.',
  instrumentLabel: 'Instrument detail',
} as const;
