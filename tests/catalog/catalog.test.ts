import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getCatalogEntry,
  listCatalogEntries,
  listPlayableEntries,
} from '../../src/lib/catalog/index';
import type { CatalogEntry } from '../../src/lib/catalog/index';

/** Entry_Text: the non-null copy fields of an entry joined with a space. */
function entryText(entry: CatalogEntry): string {
  return [
    entry.name,
    entry.operatorOrigin,
    entry.statusNote,
    entry.beacon.displayFrequency,
    entry.hook,
    entry.story,
    entry.orbitLabel,
  ]
    .filter((value): value is string => value !== null)
    .join(' ');
}

function entryById(noradId: number): CatalogEntry {
  const entry = getCatalogEntry(noradId);
  if (entry === undefined) throw new Error(`catalog entry ${noradId} missing`);
  return entry;
}

describe('Req 1: catalog membership and playability', () => {
  it('1.1 lists exactly the 7 NORAD_IDs in overview order', () => {
    expect(listCatalogEntries().map((e) => e.noradId)).toEqual([
      1002, 965, 7530, 5580, 26113, 28884, 2866,
    ]);
  });

  it('1.2 marks 1002, 965, 7530, 5580 and 26113 as playable', () => {
    const playableIds = listCatalogEntries()
      .filter((e) => e.playable)
      .map((e) => e.noradId);
    expect(playableIds).toEqual([1002, 965, 7530, 5580, 26113]);
  });

  it('1.3 marks 28884 and 2866 as not playable', () => {
    expect([entryById(28884).playable, entryById(2866).playable]).toEqual([false, false]);
  });

  it('1.4 sets the unplayable reason of 28884 and 2866', () => {
    expect([entryById(28884).unplayableReason, entryById(2866).unplayableReason]).toEqual([
      'geo-slot-not-visible-from-china',
      'graveyard-orbit-drift',
    ]);
  });

  it('1.5 sets the difficulty of the playable entries', () => {
    expect(
      [26113, 1002, 965, 7530, 5580].map((id) => entryById(id).difficulty),
    ).toEqual(['hard', 'hard', 'standard', 'standard', 'standard']);
  });
});

describe('Req 5: mandatory fact corrections', () => {
  it('5.1 Transit 5B-5 launch year is 1964', () => {
    expect(entryById(965).launchDate?.slice(0, 4)).toBe('1964');
  });

  it('5.2 Transit 5B-5 text says disputed and names 5E-5', () => {
    const text = entryText(entryById(965)).toLowerCase();
    expect([text.includes('disputed'), text.includes('5e-5')]).toEqual([true, true]);
  });

  it('5.4 IMAGE status is silent-again', () => {
    expect(entryById(26113).status).toBe('silent-again');
  });

  it('5.5 IMAGE text claims no current transmission', () => {
    const text = entryText(entryById(26113)).toLowerCase();
    expect(
      ['still transmitting', 'is transmitting', 'currently transmitting'].filter((p) =>
        text.includes(p),
      ),
    ).toEqual([]);
  });

  it('5.6 Prospero status is unconfirmed', () => {
    expect(entryById(5580).status).toBe('unconfirmed');
  });

  it('5.7 Prospero story contains 1996 and unconfirmed', () => {
    const story = entryById(5580).story.toLowerCase();
    expect([story.includes('1996'), story.includes('unconfirmed')]).toEqual([true, true]);
  });

  it('5.8 LES-1 display frequency is "about 237 MHz"', () => {
    expect(entryById(1002).beacon.displayFrequency).toBe('about 237 MHz');
  });

  it('5.9 LES-1 tumble period is 4 s', () => {
    expect(entryById(1002).beacon.tumblePeriodS).toBe(4);
  });
});

describe('Req 6: beacon spot checks', () => {
  it('6.1 AO-7 beacon is 145.9775 MHz CW, sunlit only', () => {
    const { downlinkMhz, beaconMode, sunlitOnly } = entryById(7530).beacon;
    expect({ downlinkMhz, beaconMode, sunlitOnly }).toEqual({
      downlinkMhz: 145.9775,
      beaconMode: 'cw-beacon',
      sunlitOnly: true,
    });
  });

  it('6.2 Transit 5B-5 downlink is 136.65 MHz', () => {
    expect(entryById(965).beacon.downlinkMhz).toBe(136.65);
  });

  it('6.3 LES-5 downlink is 236.7487 MHz', () => {
    expect(entryById(2866).beacon.downlinkMhz).toBe(236.7487);
  });

  it('6.4 IMAGE has no downlink or display frequency', () => {
    const { downlinkMhz, displayFrequency } = entryById(26113).beacon;
    expect({ downlinkMhz, displayFrequency }).toEqual({
      downlinkMhz: null,
      displayFrequency: null,
    });
  });
});

describe('Req 7: access interface', () => {
  it('7.1 listCatalogEntries returns the 7 entries in overview order', () => {
    expect(listCatalogEntries().map((e) => e.noradId)).toEqual([
      1002, 965, 7530, 5580, 26113, 28884, 2866,
    ]);
  });

  it('7.3 listPlayableEntries returns the 5 playable entries', () => {
    expect(listPlayableEntries().map((e) => e.noradId)).toEqual([
      1002, 965, 7530, 5580, 26113,
    ]);
  });
});

describe('Req 4.3: source URLs', () => {
  // Feature: zombie-catalog, Property 1: Every source URL is verbatim in the Fact_Source
  it('every source URL is a verbatim substring of the Fact_Source', () => {
    const factSource = readFileSync(
      path.resolve(process.cwd(), 'docs/reference/POSITIONING_AND_STORY.md'),
      'utf8',
    );
    for (const entry of listCatalogEntries()) {
      expect(entry.sourceUrls.length).toBeGreaterThan(0);
      for (const url of entry.sourceUrls) {
        expect(factSource.includes(url), `${entry.noradId}: ${url}`).toBe(true);
      }
    }
  });
});

describe('Req 5.3: no nuclear-powered claim', () => {
  // Feature: zombie-catalog, Property 2: No entry is described as nuclear-powered
  it('no Entry_Text contains "nuclear"', () => {
    for (const entry of listCatalogEntries()) {
      expect(entryText(entry).toLowerCase().includes('nuclear'), `${entry.noradId}`).toBe(false);
    }
  });
});

describe('Req 7.2: lookup by NORAD_ID', () => {
  // Feature: zombie-catalog, Property 3: Lookup returns the listed entry for every catalog NORAD_ID
  it('getCatalogEntry returns the same listed entry for every catalog NORAD_ID', () => {
    for (const e of listCatalogEntries()) {
      const found = getCatalogEntry(e.noradId);
      expect(found, `${e.noradId}`).toBe(e);
      expect(found?.noradId).toBe(e.noradId);
    }
  });
});
