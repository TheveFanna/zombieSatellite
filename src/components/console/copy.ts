// Console copy (S8, design "Console copy"). Every new string of the console UI comes from here.
// Honesty_Scan rules (tests/scaffold/scaffold.test.ts, checks 1.24 and 1.25) apply to each string:
//   1.24: a string that contains a radio term must also contain "simulated" or "synthesized".
//   1.25: no single sentence may contain both a reception word and a radio term.
// The meter strings talk about aim and pointing only. Keep every property value a plain string literal
// (the scan reads property-assignment strings).

export const CONSOLE_COPY = Object.freeze({
  meterTitle: 'Aim',
  meterCaption: 'How closely the phone points at the satellite',
  meterBandLocked: 'Locked',
  meterBandClosing: 'Closing in',
  meterBandFar: 'Off target',
  meterBandUnavailable: 'No pointing',
  meterBehind: 'Behind you',
  meterEnableSensors: 'Enable motion sensors',
  radarEmpty: 'No pass data to draw yet',
});
