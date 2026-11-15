import type { NoradId } from '../catalog/index';

export type CardKind = 'real-manual' | 'demo-manual' | 'demo-auto-point' | 'real-auto-point';

export interface CardModel {
  readonly satelliteName: string;
  readonly noradId: NoradId;
  readonly frequencyText: string;
  readonly aosUtc: string;
  readonly losUtc: string;
  readonly maxElevationDeg: number;
  readonly lockedSeconds: number;
  readonly lockedRatio: number;
  readonly bestPointingErrorDeg: number | null;
  readonly passNumber: string;
  readonly demoMark: boolean;
  readonly autoPointMark: boolean;
  readonly kind: CardKind;
  readonly simulatedNotice: readonly [string, string];
}

export interface CardField {
  readonly label: string;
  readonly value: string;
}

export interface CardAddress {
  readonly noradId: NoradId;
  readonly aosMs: number;
  readonly ordinal: number;
}

export interface CollectionCard {
  readonly model: CardModel;
  readonly address: CardAddress;
  readonly href: string;
  readonly statusLabel: string;
  readonly fileBaseName: string;
}
