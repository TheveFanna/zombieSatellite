/** NORAD catalog number, an integer from 1 to 99,999; the same key and type as TleRecord.NORAD_CAT_ID. */
export type NoradId = number;

export type EntryStatus =
  | 'still-transmitting'
  | 'semi-operational'
  | 'silent-again'
  | 'unconfirmed'
  | 'historical';

export type Difficulty = 'standard' | 'hard';

export type UnplayableReason =
  | 'geo-slot-not-visible-from-china'   // Galaxy 15
  | 'graveyard-orbit-drift';            // LES-5: near-geostationary graveyard drift, no regular passes

export type BeaconMode =
  | 'cw-beacon'    // CW (Morse) beacon
  | 'telemetry';   // telemetry transmitter or telemetry carrier

export interface BeaconBlock {
  /** Downlink_Frequency in MHz, or null where the Fact_Source documents none. */
  readonly downlinkMhz: number | null;
  /** Display_Frequency, e.g. "about 237 MHz"; null exactly when downlinkMhz is null. */
  readonly displayFrequency: string | null;
  /** Beacon_Mode code, or null where the Fact_Source documents no signal type. */
  readonly beaconMode: BeaconMode | null;
  /** Tumble_Period in seconds, or null. */
  readonly tumblePeriodS: number | null;
  /** true where the Fact_Source documents sunlight-only transmission, otherwise null. */
  readonly sunlitOnly: true | null;
}

interface CatalogEntryBase {
  readonly slug: string;               // [a-z0-9]+(-[a-z0-9]+)*, unique
  readonly name: string;               // display name
  readonly noradId: NoradId;
  readonly operatorOrigin: string;     // operator and origin text
  readonly launchDate: string | null;  // ISO 8601 calendar date YYYY-MM-DD, or null (D1)
  readonly status: EntryStatus;
  readonly statusNote: string;
  readonly beacon: BeaconBlock;
  readonly hook: string;               // one English sentence
  readonly story: string;              // one English paragraph, no line breaks
  readonly orbitLabel: string | null;
  readonly sourceUrls: readonly string[]; // at least one, each verbatim in the Fact_Source
}

export interface PlayableEntry extends CatalogEntryBase {
  readonly playable: true;
  readonly difficulty: Difficulty;
  readonly unplayableReason: null;
}

export interface StoryOnlyEntry extends CatalogEntryBase {
  readonly playable: false;
  readonly difficulty: null;
  readonly unplayableReason: UnplayableReason;
}

export type CatalogEntry = PlayableEntry | StoryOnlyEntry;
