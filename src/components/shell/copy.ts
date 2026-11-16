// Shell copy (S6, design "Shell copy"). Every new string of the App_Shell, the Home_Page and the S6
// additions to the session pages comes from here.
// Honesty_Scan rules (tests/scaffold/scaffold.test.ts, checks 1.24 and 1.25) apply to each string:
//   1.24: a string that contains a radio term must also contain "simulated" or "synthesized".
//   1.25: no single sentence may contain both a reception word and a radio term.
// Keep every property value a plain string literal (the scan reads property-assignment strings).
import type { UnplayableReason } from '../../lib/catalog/index';

export const SHELL_COPY = Object.freeze({
  appStatement:
    'A finding, pointing and Doppler aid for amateur radio and satellite hobbyists. Its beacon sound is simulated, synthesized from public orbital data, and only that orbital data is real.',
  honestyFooter: 'zombieSatellite has no radio hardware. Every beacon tone in it is simulated from public TLE data.',
  demoHint: 'New to satellites? Every session has a 60× demo mode that plays the next real pass in minutes.',
  navLabel: 'Main',
  navHome: 'Home',
  navSession: 'Passes',
  navCards: 'QSL cards',
  navAr: 'AR',
  entryArTitle: 'Live AR view',
  entryArBody: 'Point the phone at the sky and follow a satellite in real time.',
  entryPassesTitle: 'Passes',
  entryPassesBody: 'The next visible pass of each satellite for your location.',
  entryArchiveTitle: 'Archive',
  entryArchiveBody: 'Stories, lifelines and 3D models of each satellite.',
  entryCardsBody: 'Cards from the sessions you finished.',
  entryLogBody: 'Your logged observations.',
  storyLink: 'Story',
  contestHeading: 'Built for Kiroween 2026',
  contestBody: 'zombieSatellite is an entry in the Kiroween 2026 hackathon. It was written during the submission period, from October 30 to December 4, 2026, with Kiro, spec by spec.',
  contestProvenance: 'The coordinate conventions and numeric acceptance baselines come from the author\'s earlier personal project SatAware AR. All code in this repository was newly written during the Kiroween 2026 submission period.',
  contestSource: 'Source code (MIT licence)',
  contestSpecs: 'Specs for every feature',
  closeLabel: 'Close',
  startSession: 'Find a pass',
  openCards: 'Your QSL cards',
  openSession: 'Open session',
  catalogHeading: 'The zombie satellites',
  playableLabel: 'Playable',
  storyOnlyLabel: 'Story only',
  historyLabel: 'Documented history',
  sourceLabel: 'Source',
  unplayableReasons: Object.freeze({
    'geo-slot-not-visible-from-china':
      'Story only: its geostationary slot is not visible from China, so it has no passes to play.',
    'graveyard-orbit-drift': 'Story only: it drifts in a near-geostationary graveyard orbit and has no regular passes.',
  } satisfies Record<UnplayableReason, string>),
  useMyLocation: 'Use my location',
  locating: 'Locating…',
  locationFailed: 'Location not available. Your coordinates stay as they are.',
  cameraToggle: 'Camera backdrop',
  skyViewHeading: 'Sky view',
  markerOutOfView: 'Target outside the view. Follow the azimuth and elevation figures.',
  noPointingYet: 'Enable motion sensors or the drag compass to see the marker.',
  localTimeLabel: 'Local start:',
  heroLine1: 'They died decades ago.',
  heroLine2: 'A few are still talking.',
  domeHeading: 'Sky dome',
  dialCaption: 'Simulated tone · real Doppler figure',
});
