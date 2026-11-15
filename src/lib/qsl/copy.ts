import type { EntryStatus } from '../catalog/index';
import type { CardKind } from './types';

export const QSL_COPY = Object.freeze({
  cardTitle: 'zombieSatellite · simulated QSL',
  simulatedNoticeLine1: 'Confirms a simulated session, not a real reception.',
  simulatedNoticeLine2: 'Beacon tone synthesized from public orbital data.',
  noradLabel: 'NORAD',
  demoMark: 'DEMO 60×',
  autoPointMark: 'AUTO-POINT',
  realTimeMark: 'REAL TIME',
  noFrequency: 'No documented downlink frequency',
  labels: Object.freeze({
    frequency: 'Frequency',
    aos: 'AOS',
    los: 'LOS',
    maxElevation: 'Max elevation',
    locked: 'Locked',
    lockedRatio: 'Locked ratio',
    bestPointingError: 'Best pointing error',
    passNumber: 'Pass No.',
    status: 'Catalog status',
    kind: 'Session',
  }),
  kindLabels: Object.freeze({
    'real-manual': 'Real time, manual pointing',
    'demo-manual': 'Demo at 60×, manual pointing',
    'demo-auto-point': 'Demo at 60×, auto-point',
    'real-auto-point': 'Real time, auto-point',
  } satisfies Record<CardKind, string>),
  statusLabels: Object.freeze({
    'still-transmitting': 'Still transmitting',
    'semi-operational': 'Semi-operational',
    'silent-again': 'Silent again since 2018',
    unconfirmed: 'Unconfirmed',
    historical: 'Historical',
  } satisfies Record<EntryStatus, string>),
  collectionTitle: 'Your QSL cards',
  collectionIntro:
    'Each card records one simulated session that you followed to LOS. All times are UTC.',
  loading: 'Reading your cards…',
  emptyState:
    'No cards yet. Follow a pass to LOS in a session, real time or demo, and its card appears here.',
  startSession: 'Pick a satellite',
  notFound: 'This card is not in the collection on this device.',
  backToCollection: 'Back to your cards',
  downloadSvg: 'Download SVG',
  downloadPng: 'Download PNG',
  pngFailed: 'This browser could not make the PNG. The SVG download still works.',
});
