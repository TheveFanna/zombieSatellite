// Session copy (D17). Every page paragraph that touches the simulated audio comes from here.
// Honesty_Scan rules (tests/scaffold/scaffold.test.ts, checks 1.24 and 1.25) apply to each string:
//   1.24: a string that contains a radio term must also contain "simulated" or "synthesized".
//   1.25: no single sentence may contain both a reception word and a radio term.
// Keep every property value a plain string literal (the scan reads property-assignment strings).

import type { EntryStatus } from '../../lib/catalog/index';

export const SESSION_COPY = Object.freeze({
  simulationNotice:
    'zombieSatellite receives no RF. The beacon tone here is synthesized live from public orbital data; bring your own radio for the real thing and tune it by the Doppler figure.',
  glideNote:
    'The pitch of the tone glides on an artistic, scaled curve. The real Doppler shift is the kHz figure only.',
  imageNote:
    'IMAGE has been silent again since August 2018. The soft ticks are a simulated sketch of its telemetry character, synthesized from public orbital data, and do not mean that it transmits today.',
  sunlitNote:
    "Sunlit only: in reality it transmits only while the Sun shines on it. In Earth's shadow the simulated beacon falls silent.",
  noFrequency: 'No documented downlink frequency',
  noOrbitData: 'No orbit data at this instant',
  audioUnavailable:
    'Audio is not available in this browser, so the session runs without the simulated beacon.',
  enableSound: 'Enable sound for the simulated beacon',
  demoNote: 'Demo mode plays the next complete real pass at 60× speed.',
  autoPointNote:
    'Auto-point aims for you with a small, hand-like wobble. Switch to manual to drag the view yourself.',
  joinNote: 'This pass is already overhead, so the session joins it now.',
  utcNote: 'All times are UTC.',
  statusLabels: Object.freeze({
    'still-transmitting': 'Still transmitting',
    'semi-operational': 'Semi-operational',
    'silent-again': 'Silent again since 2018',
    unconfirmed: 'Unconfirmed',
    historical: 'Historical',
  } satisfies Record<EntryStatus, string>),
});
