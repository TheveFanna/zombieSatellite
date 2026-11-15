// Feature: qsl-card, Properties 2, 3 and the null case of 4
// **Validates: Requirements 2.10, 3.3, 3.4, 4.1, 10.1, 10.2**
import { describe, expect, it } from 'vitest';
import { getCatalogEntry } from '../../src/lib/catalog/index';
import type { SessionResult } from '../../src/lib/session/index';
import {
  QSL_COPY,
  buildCardModel,
  cardFields,
  formatElevation,
  formatLockedDuration,
  formatLockedRatio,
  formatPointingError,
} from '../../src/lib/qsl/index';

function entryOf(noradId: number) {
  const entry = getCatalogEntry(noradId);
  if (!entry) throw new Error(`missing catalog entry ${noradId}`);
  return entry;
}

const AOS_MS = Date.UTC(2026, 10, 9, 11, 18, 5);
const LOS_MS = Date.UTC(2026, 10, 9, 11, 30, 39);

const AO7: SessionResult = {
  noradId: 7530,
  aosMs: AOS_MS,
  losMs: LOS_MS,
  maxElevationDeg: 47.26,
  lockedSeconds: 512.4,
  lockedRatio: 0.6789,
  bestPointingErrorDeg: 1.84,
  completed: true,
  mode: 'real',
  autoPointUsed: false,
};

describe('Card_Model fixture (Property 2)', () => {
  it('AO-7 model equals the hand-written values', () => {
    const model = buildCardModel(AO7, entryOf(7530));
    expect(model).not.toBeNull();
    expect(model).toMatchObject({
      satelliteName: 'AMSAT-OSCAR 7 (AO-7)',
      noradId: 7530,
      frequencyText: '145.9775 MHz',
      aosUtc: '2026-11-09 11:18:05 UTC',
      losUtc: '2026-11-09 11:30:39 UTC',
      maxElevationDeg: 47.26,
      lockedSeconds: 512.4,
      lockedRatio: 0.6789,
      bestPointingErrorDeg: 1.84,
      passNumber: 'ZS-07530-MW963KQW',
      demoMark: false,
      autoPointMark: false,
      kind: 'real-manual',
      simulatedNotice: [QSL_COPY.simulatedNoticeLine1, QSL_COPY.simulatedNoticeLine2],
    });
  });

  it('AO-7 rows equal the hand-written values in order', () => {
    const model = buildCardModel(AO7, entryOf(7530));
    expect(cardFields(model!)).toEqual([
      { label: 'Frequency', value: '145.9775 MHz' },
      { label: 'AOS', value: '2026-11-09 11:18:05 UTC' },
      { label: 'LOS', value: '2026-11-09 11:30:39 UTC' },
      { label: 'Max elevation', value: '47.3°' },
      { label: 'Locked', value: '8 min 32 s' },
      { label: 'Locked ratio', value: '67.9 %' },
      { label: 'Best pointing error', value: '1.8°' },
      { label: 'Pass No.', value: 'ZS-07530-MW963KQW' },
    ]);
  });

  it('IMAGE without a documented frequency shows the no-frequency note', () => {
    const model = buildCardModel({ ...AO7, noradId: 26113 }, entryOf(26113));
    expect(model!.frequencyText).toBe('No documented downlink frequency');
  });

  it('a null best pointing error shows an em dash', () => {
    const model = buildCardModel({ ...AO7, bestPointingErrorDeg: null }, entryOf(7530));
    expect(cardFields(model!)[6]).toEqual({ label: 'Best pointing error', value: '—' });
  });

  it('pins the display rule examples', () => {
    expect(formatElevation(47.26)).toBe('47.3°');
    expect(formatLockedDuration(42.4)).toBe('42 s');
    expect(formatLockedDuration(59.6)).toBe('1 min 00 s');
    expect(formatLockedDuration(512.4)).toBe('8 min 32 s');
    expect(formatLockedRatio(0.6789)).toBe('67.9 %');
    expect(formatPointingError(1.84)).toBe('1.8°');
    expect(formatPointingError(null)).toBe('—');
  });
});

describe('Marks (Property 3)', () => {
  const cases = [
    { mode: 'real', autoPointUsed: false, demoMark: false, autoPointMark: false, kind: 'real-manual' },
    { mode: 'demo', autoPointUsed: false, demoMark: true, autoPointMark: false, kind: 'demo-manual' },
    { mode: 'demo', autoPointUsed: true, demoMark: true, autoPointMark: true, kind: 'demo-auto-point' },
    { mode: 'real', autoPointUsed: true, demoMark: false, autoPointMark: true, kind: 'real-auto-point' },
  ] as const;

  for (const c of cases) {
    it(`${c.mode} / autoPointUsed ${c.autoPointUsed} gives ${c.kind}`, () => {
      const model = buildCardModel(
        { ...AO7, mode: c.mode, autoPointUsed: c.autoPointUsed },
        entryOf(7530),
      );
      expect(model!.demoMark).toBe(c.demoMark);
      expect(model!.autoPointMark).toBe(c.autoPointMark);
      expect(model!.kind).toBe(c.kind);
    });
  }
});

describe('Eligibility (Property 4, null case)', () => {
  it('returns null for an aborted result', () => {
    expect(buildCardModel({ ...AO7, completed: false }, entryOf(7530))).toBeNull();
  });
});
