// Listening_Guide data (S7 Requirement 14). Every fact carries its source; no audio is copied.
// URLs are constants (not scanned property strings); texts avoid radio terms by design (checks 1.24, 1.25).
// Sources N1 to N5 were opened once on the implementation date; facts a page does not state were dropped:
//   N1 confirmed (QFH setup, Transit CW or USB, LES-1 sound). N2 confirmed (Transit telemetry only while sunlit).
//   N3 confirmed (136.658 MHz, WFM, IQ file); its "identity dispute" is NOT on the page and was dropped.
//   N4 confirmed (AO-7 modes, frequencies, 1981 and 2002 history). N5 confirmed (AO-7 active only in sunlight).

export interface GuideLink {
  readonly label: string;
  readonly url: string;
}

export interface GuideFact {
  readonly text: string;
  readonly source: GuideLink;
}

export interface GuideFacts {
  readonly setup?: GuideFact;
  readonly illumination?: GuideFact;
  readonly status?: GuideFact;
  readonly frequency?: GuideFact;
  readonly identity?: GuideFact;
  readonly sound?: GuideFact;
  readonly modes?: GuideFact;
}

export interface GuideRecordings {
  readonly archive?: GuideLink;
  readonly iqFile?: GuideLink;
  readonly analysis?: GuideLink;
}

export interface GuideEntry {
  readonly facts: GuideFacts;
  readonly recordings: GuideRecordings;
}

const N1 = 'https://www.rtl-sdr.com/receiving-dead-satellites-rtl-sdr/';
const N2 = 'https://www.rtl-sdr.com/using-sdr-to-investigate-telemetry-still-broadcasting-from-1960s-satellite-transit-5b5/';
const N3 = 'https://www.sigidwiki.com/wiki/Transit_5B-5';
const N4 = 'https://www.amsat.org/two-way-satellites/ao-7/';
const N5 = 'https://www.amsat.org/live-linear-satellites-2/';
const DD1US = 'https://www.dd1us.de/spacesounds%204b.html';
const SIGID_IQ = 'https://www.sigidwiki.com/wiki/File:TransitIQ.zip';
const XERBO = 'https://xerbo.net/posts/investigating-transit-pt1/';
const AMSAT_ANS_299 = 'https://www.amsat.org/ans-299-amsat-news-service-bulletins/';
const SPACEDAILY =
  'https://spacedaily.com/b-there-is-a-single-satellite-launched-by-the-us-navy-in-1964-that-is-still-in-orbit-still-transmitting-and-still-being-used-by-amateur-radio-operators-around-the-world-and-nobody-at-the-nav/';
const PROSPERO_WIKI = 'https://en.wikipedia.org/wiki/Prospero_(spacecraft)';
const NASA_IMAGE_TIMELINE = 'https://www.nasa.gov/solar-system/a-detailed-timeline-of-the-image-mission-recovery/';

export const GUIDE_NONE = {
  setup: 'No simple setup is documented in the project sources.',
  illumination: 'No illumination condition is documented in the project sources.',
  frequency: 'No downlink frequency is documented in the project sources.',
  recordings: 'No recordings are linked for this satellite.',
} as const;

export const GUIDE_ENTRIES: Readonly<Record<string, GuideEntry>> = {
  'les-1': {
    facts: {
      setup: {
        text: 'A documented hobby setup for old satellite downlinks in the 136 to 138 MHz and 150 to 400 MHz ranges is an RTL-SDR dongle with a QFH antenna. The page names LES-1 among the old satellites to look for.',
        source: { label: 'RTL-SDR.com: Receiving dead satellites', url: N1 },
      },
      frequency: {
        text: 'The downlink frequency is about 237 MHz. The figure is approximate.',
        source: { label: 'AMSAT News Service bulletin 299', url: AMSAT_ANS_299 },
      },
      sound: {
        text: 'Listeners describe a spooky howling sound caused by voltage changes from the solar panels.',
        source: { label: 'RTL-SDR.com: Receiving dead satellites', url: N1 },
      },
    },
    recordings: {
      archive: { label: 'DD1US space sounds archive', url: DD1US },
    },
  },
  'transit-5b-5': {
    facts: {
      setup: {
        text: 'A documented hobby setup for old satellite downlinks in the 136 to 138 MHz and 150 to 400 MHz ranges is an RTL-SDR dongle with a QFH antenna. The same page says Transit 5B-5 can be tuned in either CW or USB mode.',
        source: { label: 'RTL-SDR.com: Receiving dead satellites', url: N1 },
      },
      illumination: {
        text: 'Its telemetry transmitter works only while sunlight reaches the satellite.',
        source: { label: 'RTL-SDR.com: Transit 5B-5 telemetry', url: N2 },
      },
      frequency: {
        text: 'The SigID Wiki lists 136.658 MHz, wideband FM mode and about 32 kHz of bandwidth.',
        source: { label: 'SigID Wiki: Transit 5B-5', url: N3 },
      },
      identity: {
        text: 'Its identity is disputed: listener analysis suggests the transmitter may be Transit 5E-5.',
        source: { label: 'SpaceDaily', url: SPACEDAILY },
      },
    },
    recordings: {
      iqFile: { label: 'Raw IQ recording (SigID Wiki)', url: SIGID_IQ },
      archive: { label: 'DD1US space sounds archive', url: DD1US },
      analysis: { label: 'Analysis of the telemetry by Xerbo', url: XERBO },
    },
  },
  'ao-7': {
    facts: {
      illumination: {
        text: 'Active only in sunlight.',
        source: { label: 'AMSAT: Live linear satellites', url: N5 },
      },
      modes: {
        text: 'The Mode A CW telemetry downlink is 29.502 MHz and the Mode B CW telemetry downlink is 145.9775 MHz.',
        source: { label: 'AMSAT: AO-7', url: N4 },
      },
      status: {
        text: 'AO-7 stopped working in mid 1981 after a battery failure. Since 2002 it runs from its solar panels, so it is not usable in eclipse.',
        source: { label: 'AMSAT: AO-7', url: N4 },
      },
    },
    recordings: {},
  },
  prospero: {
    facts: {
      status: {
        text: '137.56 MHz is the historical downlink of Prospero. Later reports of it being heard are unconfirmed.',
        source: { label: 'Wikipedia: Prospero', url: PROSPERO_WIKI },
      },
    },
    recordings: {},
  },
  image: {
    facts: {
      status: {
        text: 'IMAGE has been silent again since August 2018.',
        source: { label: 'NASA: IMAGE mission recovery timeline', url: NASA_IMAGE_TIMELINE },
      },
    },
    recordings: {},
  },
};

export function getGuideEntry(slug: string): GuideEntry | null {
  return GUIDE_ENTRIES[slug] ?? null;
}
