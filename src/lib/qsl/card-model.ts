import type { CatalogEntry } from '../catalog/index';
import { formatUtc } from '../session/index';
import type { ClockMode, SessionResult } from '../session/index';
import { QSL_COPY } from './copy';
import {
  formatElevation,
  formatLockedDuration,
  formatLockedRatio,
  formatPointingError,
} from './format';
import { passNumber } from './pass-number';
import type { CardField, CardKind, CardModel } from './types';

export function cardKind(mode: ClockMode, autoPointUsed: boolean): CardKind {
  if (mode === 'demo') return autoPointUsed ? 'demo-auto-point' : 'demo-manual';
  return autoPointUsed ? 'real-auto-point' : 'real-manual';
}

export function buildCardModel(result: SessionResult, entry: CatalogEntry): CardModel | null {
  if (!result.completed) return null;
  return Object.freeze({
    satelliteName: entry.name,
    noradId: entry.noradId,
    frequencyText: entry.beacon.displayFrequency ?? QSL_COPY.noFrequency,
    aosUtc: formatUtc(result.aosMs),
    losUtc: formatUtc(result.losMs),
    maxElevationDeg: result.maxElevationDeg,
    lockedSeconds: result.lockedSeconds,
    lockedRatio: result.lockedRatio,
    bestPointingErrorDeg: result.bestPointingErrorDeg,
    passNumber: passNumber(result.noradId, result.aosMs),
    demoMark: result.mode === 'demo',
    autoPointMark: result.autoPointUsed,
    kind: cardKind(result.mode, result.autoPointUsed),
    simulatedNotice: Object.freeze([
      QSL_COPY.simulatedNoticeLine1,
      QSL_COPY.simulatedNoticeLine2,
    ] as const),
  });
}

export function cardFields(model: CardModel): readonly CardField[] {
  const L = QSL_COPY.labels;
  return Object.freeze([
    { label: L.frequency, value: model.frequencyText },
    { label: L.aos, value: model.aosUtc },
    { label: L.los, value: model.losUtc },
    { label: L.maxElevation, value: formatElevation(model.maxElevationDeg) },
    { label: L.locked, value: formatLockedDuration(model.lockedSeconds) },
    { label: L.lockedRatio, value: formatLockedRatio(model.lockedRatio) },
    { label: L.bestPointingError, value: formatPointingError(model.bestPointingErrorDeg) },
    { label: L.passNumber, value: model.passNumber },
  ]);
}

export function describeCard(model: CardModel): string {
  return `${model.satelliteName}, ${QSL_COPY.kindLabels[model.kind]}, AOS ${model.aosUtc}`;
}
