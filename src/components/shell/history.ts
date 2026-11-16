// Presentation data for the lifelines on the home page (S6 task 7C). Years only, taken from
// docs/reference/POSITIONING_AND_STORY.md and approved by the project owner on 2026-11-17.
// This module adds no claim beyond the catalog stories, which the home page shows next to it.

export interface Lifeline {
  /** Launch year, or null where the story library gives none. */
  readonly launched: number | null;
  /** The year the satellite went silent or was switched off; null when it never stopped. */
  readonly silent: number | null;
  /** The year amateurs reported it again; null when there is no confirmed report. */
  readonly rediscovered: number | null;
  /** The year it went silent again after the rediscovery (IMAGE, 2018). */
  readonly silentAgain: number | null;
  /** A later report exists but is unconfirmed (Prospero). */
  readonly unconfirmed: boolean;
  /** A single event year for an entry whose story is one episode (Galaxy 15, 2010). */
  readonly episode: number | null;
}

const LIFELINES: Readonly<Record<number, Lifeline>> = Object.freeze({
  1002: { launched: 1965, silent: 1967, rediscovered: 2012, silentAgain: null, unconfirmed: false, episode: null },
  965: { launched: 1964, silent: null, rediscovered: null, silentAgain: null, unconfirmed: false, episode: null },
  7530: { launched: 1974, silent: 1981, rediscovered: 2002, silentAgain: null, unconfirmed: false, episode: null },
  5580: { launched: 1971, silent: 1996, rediscovered: null, silentAgain: null, unconfirmed: true, episode: null },
  26113: { launched: 2000, silent: 2005, rediscovered: 2018, silentAgain: 2018, unconfirmed: false, episode: null },
  28884: { launched: null, silent: null, rediscovered: null, silentAgain: null, unconfirmed: false, episode: 2010 },
  2866: { launched: 1967, silent: 1971, rediscovered: 2020, silentAgain: null, unconfirmed: false, episode: null },
});

/** The lifeline of a catalog entry, or null for an entry without one. */
export function lifelineFor(noradId: number): Lifeline | null {
  return LIFELINES[noradId] ?? null;
}

/** The axis of every lifeline: 1960 to 2030. */
export const LIFELINE_START_YEAR = 1960;
export const LIFELINE_END_YEAR = 2030;
/** Where the present is drawn on the axis (the hackathon year). */
export const LIFELINE_NOW_YEAR = 2026;