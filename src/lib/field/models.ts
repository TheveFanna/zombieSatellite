// Model_Records of the register and Attribution_File text builders.
// Plain string literals as direct property values (Honesty_Scan reads property strings).
// Reconciled with docs/reference/MODELS.md (task 13.3).
export interface ModelRecord {
  readonly slug: string;
  readonly decision: 'Original' | 'Illustrative';
  readonly sourceUrl: string;
  readonly author: string;
  readonly licence: string;
  readonly format: string;
  readonly redistribution: 'yes' | 'no';
  /** True only when the dimensions were read from a cited page. */
  readonly dimensionsConfirmed: boolean;
  /** Pages the dimensions of an Illustrative_Model were taken from. */
  readonly dimensionSources: readonly string[];
}

const ILLUSTRATIVE_AUTHOR = 'zombieSatellite project';
const ILLUSTRATIVE_LICENCE = 'Authored for this project, simplified from public dimensions';

// Pages read for each shape (docs/reference/MODELS.md, "Shape sources"). dimensionsConfirmed is true only when
// the cited page gives the dimensions; the other shapes are sketches from the described form.
const LES1_PAGES = [
  'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-008C',
  'https://space.skyrocket.de/doc_sdat/les-1.htm',
] as const;
const TRANSIT_PAGES = ['https://en.wikipedia.org/wiki/Transit_(satellite)'] as const;
const AO7_PAGES = ['https://en.wikipedia.org/wiki/AMSAT-OSCAR_7'] as const;
const PROSPERO_PAGES = [
  'https://space.skyrocket.de/doc_sdat/prospero.htm',
  'https://en.wikipedia.org/wiki/Prospero_X-3',
] as const;
const IMAGE_PAGES = [
  'https://en.wikipedia.org/wiki/Imager_for_Magnetopause-to-Aurora_Global_Exploration',
] as const;
const GALAXY_PAGES = ['https://en.wikipedia.org/wiki/Galaxy_15'] as const;
const LES5_PAGES = ['https://space.skyrocket.de/doc_sdat/les-5.htm'] as const;

function illustrative(slug: string, pages: readonly string[], dimensionsConfirmed: boolean): ModelRecord {
  return {
    slug,
    decision: 'Illustrative',
    sourceUrl: 'none',
    author: ILLUSTRATIVE_AUTHOR,
    licence: ILLUSTRATIVE_LICENCE,
    format: 'obj',
    redistribution: 'yes',
    dimensionsConfirmed,
    dimensionSources: pages,
  };
}

export const MODEL_RECORDS: readonly ModelRecord[] = [
  illustrative('les-1', LES1_PAGES, false),
  illustrative('transit-5b-5', TRANSIT_PAGES, false),
  illustrative('ao-7', AO7_PAGES, true),
  illustrative('prospero', PROSPERO_PAGES, true),
  illustrative('image', IMAGE_PAGES, false),
  illustrative('galaxy-15', GALAXY_PAGES, false),
  illustrative('les-5', LES5_PAGES, false),];
export const MODEL_TEXT = {
  title: 'zombieSatellite model attribution',
  slugLabel: 'Entry',
  sourceLabel: 'Source',
  authorLabel: 'Author',
  licenceLabel: 'Licence',
  retrievedLabel: 'Retrieved',
  illustrativeStatement:
    'This model is illustrative. It is a vector sketch drawn from public descriptions, not an engineering model. Where no description gave a shape, it is a sphere.',
  dimensionSourcesLabel: 'Dimensions drawn from',
  schematicStatement: 'Schematic, dimensions not confirmed. The shape does not imply measured sizes.',
  confirmedStatement: 'Dimensions read from the cited page: 1.2 m equatorial diameter, 0.7 m height, 4 antennas.',
  originalHeader: 'Original model, redistributed under the licence above.',
  objHeaderFirst: 'zombieSatellite illustrative model',
  objHeaderSecond: 'Simplified shape, not an engineering model. Units are metres, Y is up.',
} as const;

export function getModelRecord(slug: string): ModelRecord | undefined {
  return MODEL_RECORDS.find((record) => record.slug === slug);
}

/** Comment lines for serializeObj of an Illustrative_Model. */
export function illustrativeObjHeader(record: ModelRecord): string[] {
  return [`${MODEL_TEXT.objHeaderFirst}: ${record.slug}`, MODEL_TEXT.objHeaderSecond];
}

/** Attribution_File text. retrievedDate (YYYY-MM-DD) is used for an Original_Model. */
export function buildAttributionText(record: ModelRecord, retrievedDate: string): string {
  const lines = [MODEL_TEXT.title, '', `${MODEL_TEXT.slugLabel}: ${record.slug}`];
  if (record.decision === 'Original') {
    lines.push(
      `${MODEL_TEXT.sourceLabel}: ${record.sourceUrl}`,
      `${MODEL_TEXT.authorLabel}: ${record.author}`,
      `${MODEL_TEXT.licenceLabel}: ${record.licence}`,
      `${MODEL_TEXT.retrievedLabel}: ${retrievedDate}`,
      '',
      MODEL_TEXT.originalHeader,
    );
  } else {
    lines.push(
      `${MODEL_TEXT.authorLabel}: ${record.author}`,
      '',
      MODEL_TEXT.illustrativeStatement,
      record.dimensionsConfirmed ? MODEL_TEXT.confirmedStatement : MODEL_TEXT.schematicStatement,
      `${MODEL_TEXT.dimensionSourcesLabel}:`,
      ...record.dimensionSources.map((url) => `- ${url}`),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function modelZipName(slug: string): string {
  return `zombiesatellite-${slug}-model.zip`;
}

export function modelObjName(slug: string): string {
  return `${slug}.obj`;
}

export function modelAttributionName(slug: string): string {
  return `${slug}-ATTRIBUTION.txt`;
}
