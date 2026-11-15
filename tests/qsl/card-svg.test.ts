// Feature: qsl-card, Property 5
// **Validates: Requirements 3.1, 3.6, 5.2, 5.3, 5.4**
import { describe, expect, it } from 'vitest';
import { getCatalogEntry } from '../../src/lib/catalog/index';
import type { SessionResult } from '../../src/lib/session/index';
import {
  QSL_COPY,
  buildCardModel,
  buildCardSvg,
  cardFields,
} from '../../src/lib/qsl/index';

const AO7: SessionResult = {
  noradId: 7530,
  aosMs: Date.UTC(2026, 10, 9, 11, 18, 5),
  losMs: Date.UTC(2026, 10, 9, 11, 30, 39),
  maxElevationDeg: 47.26,
  lockedSeconds: 512.4,
  lockedRatio: 0.6789,
  bestPointingErrorDeg: 1.84,
  completed: true,
  mode: 'real',
  autoPointUsed: false,
};

function modelOf(overrides: Partial<SessionResult>) {
  const entry = getCatalogEntry(7530);
  if (!entry) throw new Error('missing catalog entry 7530');
  const model = buildCardModel({ ...AO7, ...overrides }, entry);
  if (!model) throw new Error('expected a card model');
  return model;
}

describe('Card face text (Property 5)', () => {
  it('a plain card shows every text and no marks', () => {
    const model = modelOf({});
    const svg = buildCardSvg(model);
    expect(svg).toContain('AMSAT-OSCAR 7 (AO-7)');
    expect(svg).toContain('NORAD 7530');
    expect(svg).toContain('2026-11-09 11:18:05 UTC');
    expect(svg).toContain('2026-11-09 11:30:39 UTC');
    for (const field of cardFields(model)) expect(svg).toContain(field.value);
    expect(svg).toContain('145.9775 MHz');
    expect(svg).toContain(QSL_COPY.simulatedNoticeLine1);
    expect(svg).toContain(QSL_COPY.simulatedNoticeLine2);
    expect(svg).not.toContain('DEMO 60×');
    expect(svg).not.toContain('AUTO-POINT');
  });

  it('mark texts appear exactly when the model carries the marks', () => {
    const demo = buildCardSvg(modelOf({ mode: 'demo' }));
    expect(demo).toContain('DEMO 60×');
    expect(demo).not.toContain('AUTO-POINT');

    const auto = buildCardSvg(modelOf({ autoPointUsed: true }));
    expect(auto).toContain('AUTO-POINT');
    expect(auto).not.toContain('DEMO 60×');

    const both = buildCardSvg(modelOf({ mode: 'demo', autoPointUsed: true }));
    expect(both).toContain('DEMO 60×');
    expect(both).toContain('AUTO-POINT');
  });

  it('a name with markup characters appears only escaped', () => {
    const svg = buildCardSvg({ ...modelOf({}), satelliteName: '<b>&"\'' });
    expect(svg).toContain('&lt;b&gt;&amp;&quot;&#39;');
    expect(svg).not.toContain('<b>');
  });

  it('two calls with one model give equal strings', () => {
    const model = modelOf({});
    expect(buildCardSvg(model)).toBe(buildCardSvg(model));
  });
});
