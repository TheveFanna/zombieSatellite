// fast-check generators for the orbit-engine tests (design.md, "Generators"). This part holds the
// TLE generators of Properties 1 to 3; later tasks add the other generators to this file.
import fc from 'fast-check';

// The ISS lines of Reference_Document section 4.2. Their tails fill the columns that C18 does not
// name. No checksum is recomputed (D1), so every generated TLE carries the ISS checksum digits.
const ISS_LINE1 = '1 25544U 98067A   26312.17541007  .00012511  00000+0  23266-3 0  9990';
const ISS_LINE2 = '2 25544  51.6320 307.5621 0007219   1.6306 358.4705 15.49256954594075';

/** Line 1 columns [33:69]: derivatives, BSTAR, ephemeris type, element-set number and checksum. */
const LINE1_TAIL = ISS_LINE1.slice(33);

/** Line 2 columns [63:69]: revolution number and checksum. */
const LINE2_TAIL = ISS_LINE2.slice(63);

/** The three lines of one TLE as CelesTrak returns them with FORMAT=tle, without padding or terminators. */
export interface TleLines {
  readonly name: string;
  readonly line1: string;
  readonly line2: string;
}

/**
 * The text of each column group that C18 names, already at its column width. A test derives the
 * expected record from these texts (for example `Number(noradText)`) instead of cutting columns
 * out of the formatted lines.
 */
export interface TleFields {
  /** Object name line without padding: 2 to 23 characters, no leading or trailing space. */
  readonly name: string;
  /** `%05d` of 1 to 99999; line 1 and line 2 columns [2:7]. */
  readonly noradText: string;
  /** Line 1 [9:17]: launch year, launch number and piece, right-padded to 8 characters (`98067A  `). */
  readonly designator: string;
  /** `yy`, 00 to 99; line 1 [18:20]. */
  readonly epochYearText: string;
  /** `ddd.dddddddd`, day 1.00000000 to 366.99999999; line 1 [20:32]. */
  readonly epochDayText: string;
  /** `%8.4f`, 0 to 180 degrees; line 2 [8:16]. */
  readonly inclinationText: string;
  /** `%8.4f`, 0 to 359.9999 degrees; line 2 [17:25]. */
  readonly raanText: string;
  /** Seven digits behind the implied `0.`, eccentricity below 0.25; line 2 [26:33]. */
  readonly eccentricityDigits: string;
  /** `%8.4f`, 0 to 359.9999 degrees; line 2 [34:42]. */
  readonly argOfPerigeeText: string;
  /** `%8.4f`, 0 to 359.9999 degrees; line 2 [43:51]. */
  readonly meanAnomalyText: string;
  /** `%11.8f`, 0.5 to 17 rev/day; line 2 [52:63]. */
  readonly meanMotionText: string;
}

/**
 * Writes `units / 10 ** decimals` like C `%<width>.<decimals>f`, padding on the left with `fill`.
 * It takes integer units, so nothing is rounded.
 */
function fixed(units: number, decimals: number, width: number, fill = ' '): string {
  const digits = String(units).padStart(decimals + 1, '0');
  const point = digits.length - decimals;
  return `${digits.slice(0, point)}.${digits.slice(point)}`.padStart(width, fill);
}

/** An angle from 0 up to `maxUnits` / 10 000 degrees, written `%8.4f`. */
function angleText(maxUnits: number): fc.Arbitrary<string> {
  return fc.integer({ min: 0, max: maxUnits }).map((units) => fixed(units, 4, 8));
}

/** Field texts of a TLE in the C18 columns. Whether satellite.js accepts the TLE is left to the test. */
export const tleFieldsArb: fc.Arbitrary<TleFields> = fc.record({
  name: fc.stringMatching(/^[A-Z0-9][A-Z0-9 ()-]{0,21}[A-Z0-9)]$/),
  noradText: fc.integer({ min: 1, max: 99_999 }).map((norad) => String(norad).padStart(5, '0')),
  designator: fc.stringMatching(/^[0-9]{5}[A-Z]{1,3}$/).map((id) => id.padEnd(8)),
  epochYearText: fc.integer({ min: 0, max: 99 }).map((yy) => String(yy).padStart(2, '0')),
  // Day 1.00000000 through 366.99999999, in units of 1e-8 day.
  epochDayText: fc.integer({ min: 100_000_000, max: 36_699_999_999 }).map((units) => fixed(units, 8, 12, '0')),
  inclinationText: angleText(1_800_000),
  raanText: angleText(3_599_999),
  // 0000000 through 2499999, so the eccentricity 0.0000000 through 0.2499999 stays below 0.25.
  eccentricityDigits: fc.integer({ min: 0, max: 2_499_999 }).map((digits) => String(digits).padStart(7, '0')),
  argOfPerigeeText: angleText(3_599_999),
  meanAnomalyText: angleText(3_599_999),
  // 0.5 through 17 rev/day, in units of 1e-8 rev/day.
  meanMotionText: fc.integer({ min: 50_000_000, max: 1_700_000_000 }).map((units) => fixed(units, 8, 11)),
});

/** Writes the field texts into the C18 columns of two 69-character lines; the other columns come from the ISS lines. */
export function formatTle(fields: TleFields): TleLines {
  return {
    name: fields.name,
    line1: `1 ${fields.noradText}U ${fields.designator} ${fields.epochYearText}${fields.epochDayText} ${LINE1_TAIL}`,
    line2:
      `2 ${fields.noradText} ${fields.inclinationText} ${fields.raanText} ${fields.eccentricityDigits} ` +
      `${fields.argOfPerigeeText} ${fields.meanAnomalyText} ${fields.meanMotionText}${LINE2_TAIL}`,
  };
}

/**
 * Renderings of `tle` that the TLE_Parser must treat alike (Property 1). The name line has leading
 * and trailing spaces or tabs, every line ends in any mix of spaces, tabs and `\r`, each line ends
 * with LF or CRLF, empty or whitespace-only lines may come before, between and after the three
 * lines, and the final line terminator is optional.
 */
export function renderingArb(tle: TleLines): fc.Arbitrary<string> {
  const leading = fc.string({ unit: fc.constantFrom(' ', '\t'), maxLength: 4 });
  const trailing = fc.string({ unit: fc.constantFrom(' ', '\t', '\r'), maxLength: 4 });
  const terminator = fc.constantFrom('\n', '\r\n');
  const noPadding = fc.constant('');

  /** One line: its leading padding, the text, its trailing whitespace and its own terminator. */
  const line = (text: string, padding: fc.Arbitrary<string>): fc.Arbitrary<string> =>
    fc.tuple(padding, trailing, terminator).map(([lead, tail, eol]) => lead + text + tail + eol);
  const blankLines = fc.array(line('', leading), { maxLength: 2 });

  return fc
    .tuple(
      blankLines,
      line(tle.name, leading),
      blankLines,
      line(tle.line1, noPadding),
      blankLines,
      line(tle.line2, noPadding),
      blankLines,
      fc.boolean(),
    )
    .map(([before, nameLine, gap1, line1, gap2, line2, after, endsWithTerminator]) => {
      const text = [...before, nameLine, ...gap1, line1, ...gap2, line2, ...after].join('');
      return endsWithTerminator ? text : text.replace(/\r?\n$/, '');
    });
}
