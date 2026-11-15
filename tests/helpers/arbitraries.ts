// fast-check generators for the orbit-engine tests (design.md, "Generators"). This part holds the
// TLE generators of Properties 1 to 3, the fetcher generators of Properties 13 and 14, the Observer and
// instant generators of Properties 9, 11, 20 and 23, the unimodal score functions of Property 19 and the invalid
// pass parameters of Property 6; later tasks add the other generators to this file.
import fc from 'fast-check';
import type { EngineErrorCategory } from '../../src/lib/orbit/index';
import { celestrakBody, createMockCelestrakFetch, recordingFetch, type MockCelestrakFetch } from './mock-celestrak';
import type { Observer } from './oracles';

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

/** Length of a TLE line without terminator (C18). */
const LINE_LENGTH = 69;

/** A column range `[start, end)` of line 1 or line 2 (C18; Requirement 4, criterion 4). */
interface ColumnRange {
  /** Index into `[name, line1, line2]`. */
  readonly line: 1 | 2;
  readonly start: number;
  readonly end: number;
}

/** One column of line 1 or line 2. */
interface Column {
  readonly line: 1 | 2;
  readonly column: number;
}

/** Fields that must consist of the digits 0 to 9 (Requirement 4, criterion 14). */
const DIGIT_FIELDS: readonly ColumnRange[] = [
  { line: 1, start: 2, end: 7 }, // NORAD number
  { line: 2, start: 2, end: 7 }, // NORAD number
  { line: 1, start: 18, end: 20 }, // epoch year
  { line: 2, start: 26, end: 33 }, // eccentricity
];

/** Fields that must hold a decimal number once their spaces are trimmed (Requirement 4, criterion 21). */
const DECIMAL_FIELDS: readonly ColumnRange[] = [
  { line: 1, start: 20, end: 32 }, // epoch day
  { line: 2, start: 8, end: 16 }, // inclination
  { line: 2, start: 17, end: 25 }, // right ascension of the ascending node
  { line: 2, start: 34, end: 42 }, // argument of perigee
  { line: 2, start: 43, end: 51 }, // mean anomaly
  { line: 2, start: 52, end: 63 }, // mean motion
];

/** A column inside one of `fields`. */
function columnArb(fields: readonly ColumnRange[]): fc.Arbitrary<Column> {
  return fc
    .constantFrom(...fields)
    .chain(({ line, start, end }) => fc.integer({ min: start, max: end - 1 }).map((column) => ({ line, column })));
}

/** A mutated three-line text and the Property 3 operator that produced it. */
export interface Mutation {
  /** Name of the mutation operator, so that a failure report shows which mutation the parser accepted. */
  readonly operator: string;
  /** The mutated text, its lines joined with LF. The TLE_Parser must reject it with category `invalid-tle`. */
  readonly text: string;
}

/**
 * Mutations of the three-line text of `tle` by the operators of Property 3. Each mutated text breaks a
 * rule of Requirement 4 (criteria 11 to 15, 21 and 22), so `parseTle` rejects it with category
 * `invalid-tle`, and so does `fetchTle` when a status-200 Fetch_Function returns it as the body.
 * `tle` has the layout of `formatTle` or of a Baseline_TLE_Snapshot: two 69-character lines whose
 * decimal fields each hold one decimal point.
 */
export function mutationArb(tle: TleLines): fc.Arbitrary<Mutation> {
  const lines = [tle.name, tle.line1, tle.line2];

  /** The text with the columns [start, end) of line 1 or line 2 replaced by `replacement`. */
  const replaceColumns = (index: 1 | 2, start: number, end: number, replacement: string): string =>
    lines.map((line, i) => (i === index ? line.slice(0, start) + replacement + line.slice(end) : line)).join('\n');

  /** The text with one generated column replaced by a generated character. */
  const replaceOne = (columns: fc.Arbitrary<Column>, chars: fc.Arbitrary<string>): fc.Arbitrary<string> =>
    fc.tuple(columns, chars).map(([{ line, column }, char]) => replaceColumns(line, column, column + 1, char));

  const lineIndex = fc.constantFrom(1, 2);
  const decimalColumn = columnArb(DECIMAL_FIELDS);
  // A second decimal point replaces a digit, because each decimal field of such a TLE holds one point already.
  const decimalDigitColumn = decimalColumn.filter(({ line, column }) => /[0-9]/.test(lines[line][column]));

  const operators: Record<string, fc.Arbitrary<string>> = {
    // Criterion 11: the text has more or fewer than three non-empty lines.
    removeName: fc.constant([tle.line1, tle.line2].join('\n')),
    extraLine: fc
      .tuple(fc.integer({ min: 0, max: 3 }), fc.stringMatching(/^[A-Z0-9]{1,24}$/))
      .map(([at, extra]) => lines.toSpliced(at, 0, extra).join('\n')),
    secondTle: tleFieldsArb
      .map(formatTle)
      .map((second) => [...lines, second.name, second.line1, second.line2].join('\n')),
    // Criterion 12: line 1 does not begin with `1 ` or line 2 does not begin with `2 `.
    prefix: fc
      .tuple(lineIndex, fc.string({ unit: fc.constantFrom(...'0123456789ABXYZ .+-'), minLength: 2, maxLength: 2 }))
      .filter(([index, prefix]) => prefix !== `${index} `)
      .map(([index, prefix]) => replaceColumns(index, 0, 2, prefix)),
    // Criterion 13: a line of 68 or 70 characters. The inserted character is a digit, because trailing
    // whitespace would be removed again.
    shorterLine: fc
      .tuple(lineIndex, fc.integer({ min: 0, max: LINE_LENGTH - 1 }))
      .map(([index, at]) => replaceColumns(index, at, at + 1, '')),
    longerLine: fc
      .tuple(lineIndex, fc.integer({ min: 0, max: LINE_LENGTH }), fc.constantFrom(...'0123456789'))
      .map(([index, at, digit]) => replaceColumns(index, at, at, digit)),
    // Criterion 14: a non-digit or a space in a NORAD number, the epoch year or the eccentricity.
    nonDigit: replaceOne(columnArb(DIGIT_FIELDS), fc.constantFrom(...' ABCXYZabcxyz+-._')),
    // Criterion 15: line 2 carries another NORAD number than line 1.
    differentNorad: fc
      .integer({ min: 0, max: 99_999 })
      .filter((id) => id !== Number(tle.line2.slice(2, 7)))
      .map((id) => replaceColumns(2, 2, 7, String(id).padStart(5, '0'))),
    // Criterion 21: a decimal field that is blank, or holds a sign, an exponent, a letter or a second decimal point.
    blankField: fc
      .constantFrom(...DECIMAL_FIELDS)
      .map(({ line, start, end }) => replaceColumns(line, start, end, ' '.repeat(end - start))),
    sign: replaceOne(decimalColumn, fc.constantFrom('+', '-')),
    exponent: replaceOne(decimalColumn, fc.constantFrom('e', 'E')),
    letter: replaceOne(decimalColumn, fc.constantFrom('A', 'Z', 'a', 'z')),
    secondDecimalPoint: replaceOne(decimalDigitColumn, fc.constant('.')),
    // Criterion 22: a mean motion of zero (line 2 columns [52:63]).
    zeroMeanMotion: fc
      .constantFrom('00.00000000', ' 0.00000000', '0.00000000 ')
      .map((zero) => replaceColumns(2, 52, 63, zero)),
  };

  return fc.oneof(
    ...Object.entries(operators).map(([operator, texts]) => texts.map((text): Mutation => ({ operator, text }))),
  );
}

/** NORAD catalog numbers that a request can name (Requirement 3, criterion 7). */
const noradIdArb = fc.integer({ min: 1, max: 99_999 });

/**
 * Values that are not a number with an integer value from 1 to 99999 (Property 13): 0 and negative
 * integers, integers from 100 000 up, fractional numbers, NaN, the infinities, numeric strings and
 * bigints with a valid value, null, undefined and other values such as objects.
 */
export const invalidNoradArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.integer({ max: 0 }),
  fc.integer({ min: 100_000, max: Number.MAX_SAFE_INTEGER }),
  fc.double({ min: 1, max: 99_999, noNaN: true }).filter((value) => !Number.isInteger(value)),
  fc.constantFrom(NaN, Infinity, -Infinity),
  noradIdArb.map(String),
  noradIdArb.map(BigInt),
  fc.constantFrom(null, undefined),
  // `anything` also yields numbers, and some of them are valid catalog numbers, so only other values pass.
  fc.anything({ withBoxedValues: true }).filter((value) => typeof value !== 'number'),
);

/** The six failure scenarios of Property 14. */
export type FailureKind =
  | 'throws' // the Fetch_Function throws a generated value synchronously
  | 'rejects' // it returns a promise rejected with a generated value
  | 'non-response' // it resolves with a value that is not a response
  | 'http-status' // it resolves with a status from 100 to 599 other than 200 and any body
  | 'unreadable-body' // it resolves with status 200 and a response whose `text()` throws, rejects or returns a non-string
  | 'catalog-mismatch'; // it resolves with status 200 and an accepted TLE for a number M other than N

/**
 * One failure scenario of Property 14 for the requested NORAD catalog number N (`noradId`). A test makes
 * `createFetch()` the Fetch_Function of a fetcher (or routes the requests for N to it), requests N and
 * expects `fetchTle(noradId)` to reject with an EngineError that matches `expected`.
 */
export interface FailureScenario {
  readonly kind: FailureKind;
  /** The requested NORAD catalog number N, from 1 to 99999. */
  readonly noradId: number;
  /** Kind `catalog-mismatch` only: the number M other than N of the TLE that the Fetch_Function answers with. */
  readonly answeredNoradId?: number;
  /** Creates a new Fetch_Function that applies the scenario to every request and records its calls in `calls`. */
  readonly createFetch: () => MockCelestrakFetch;
  readonly expected: {
    readonly category: EngineErrorCategory;
    /** Kind `http-status` only: the HTTP status that the error must carry. */
    readonly status?: number;
    /**
     * Present when the error must carry `value` as its `cause`: compare with `Object.is`, and also check
     * `'cause' in error`, because the value can be `undefined`. Absent when the engine builds the cause itself.
     */
    readonly cause?: { readonly value: unknown };
  };
}

/** Generated causes: an Error or any other value, `undefined` included (D4 records an undefined cause too). */
const causeArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string().map((message) => new Error(message)),
  fc.anything(),
);

/** HTTP statuses from 100 to 599 other than 200; 403, the rate-limit answer of CelesTrak, is drawn more often. */
const statusArb = fc.oneof(
  { weight: 1, arbitrary: fc.constant(403) },
  { weight: 4, arbitrary: fc.integer({ min: 100, max: 599 }).filter((status) => status !== 200) },
);

/** The ISS lines with NORAD catalog number `id` in both lines. No checksum is recomputed (D1). */
function issTleWithNorad(id: number): TleLines {
  const norad = String(id).padStart(5, '0');
  return {
    name: 'ISS (ZARYA)',
    line1: ISS_LINE1.slice(0, 2) + norad + ISS_LINE1.slice(7),
    line2: ISS_LINE2.slice(0, 2) + norad + ISS_LINE2.slice(7),
  };
}

/** A status-200 response whose `text()` is `text`; `new Response` cannot build a body that fails to read. */
function responseWithText(text: () => unknown): Response {
  return Object.defineProperty(new Response(null, { status: 200 }), 'text', { value: text });
}

/**
 * The failure scenarios of Property 14 with generated causes, statuses and catalog numbers N and M
 * (N and M differ). Scenario kind `unreadable-body` covers the three ways in which reading the body can
 * fail (Requirement 3, criterion 15): `text()` throws, `text()` rejects and `text()` returns a non-string.
 */
export const failureScenarioArb: fc.Arbitrary<FailureScenario> = fc
  .uniqueArray(noradIdArb, { minLength: 2, maxLength: 2 })
  .chain(([noradId, answeredNoradId]) => {
    const unreadableBody = (text: () => unknown, cause?: { readonly value: unknown }): FailureScenario => ({
      kind: 'unreadable-body',
      noradId,
      createFetch: () => recordingFetch(() => Promise.resolve(responseWithText(text))),
      expected: { category: 'network', cause },
    });

    return fc.oneof(
      causeArb.map(
        (thrown): FailureScenario => ({
          kind: 'throws',
          noradId,
          createFetch: () => createMockCelestrakFetch({ kind: 'throw', thrown }),
          expected: { category: 'network', cause: { value: thrown } },
        }),
      ),
      causeArb.map(
        (reason): FailureScenario => ({
          kind: 'rejects',
          noradId,
          createFetch: () => createMockCelestrakFetch({ kind: 'reject', reason }),
          expected: { category: 'network', cause: { value: reason } },
        }),
      ),
      // `anything` never yields a function, so no generated value has the `text()` method of a response.
      fc.anything().map(
        (value): FailureScenario => ({
          kind: 'non-response',
          noradId,
          createFetch: () => recordingFetch(() => Promise.resolve(value as Response)),
          expected: { category: 'network' },
        }),
      ),
      fc.tuple(statusArb, fc.oneof(fc.string(), fc.constant(celestrakBody(issTleWithNorad(noradId))))).map(
        ([status, body]): FailureScenario => ({
          kind: 'http-status',
          noradId,
          createFetch: () => createMockCelestrakFetch({ kind: 'answer', status, body }),
          expected: { category: 'http', status },
        }),
      ),
      fc.oneof(
        causeArb.map((thrown) =>
          unreadableBody(
            () => {
              throw thrown;
            },
            { value: thrown },
          ),
        ),
        causeArb.map((reason) => unreadableBody(() => Promise.reject(reason), { value: reason })),
        fc
          .anything()
          .filter((value) => typeof value !== 'string')
          .map((value) => unreadableBody(() => Promise.resolve(value))),
      ),
      fc.constant<FailureScenario>({
        kind: 'catalog-mismatch',
        noradId,
        answeredNoradId,
        createFetch: () =>
          createMockCelestrakFetch({ kind: 'answer', body: celestrakBody(issTleWithNorad(answeredNoradId)) }),
        expected: { category: 'catalog-mismatch' },
      }),
    );
  });

/** The altitude of generated Observers in km above the WGS84 ellipsoid: one fixed value or a closed range. */
export type AltitudeKm = number | { readonly min: number; readonly max: number };

/**
 * Observers with latitude in [−90°, 90°], longitude in [−180°, 180°] and the altitude of `altitudeKm`: a number
 * gives that altitude every time, `{ min, max }` a generated altitude in the closed range (Properties 9, 11, 20
 * and 23). Latitude and longitude are drawn uniformly on a 10⁻⁴° grid: an integer divided by 10⁴, ends included,
 * so mid-latitude Observers are as likely as polar ones (`fc.double` yields almost only values near 0° or at the
 * range ends). Every value is a finite number, so every Observer passes the checks of Requirement 7, criterion 4.
 */
export function observerArb(options: { readonly altitudeKm: AltitudeKm }): fc.Arbitrary<Observer> {
  const { altitudeKm } = options;
  return fc.record({
    // An integer divided by 10⁴ is uniform on the grid; `+ 0` turns a −0 into 0.
    latitudeDeg: fc.integer({ min: -900_000, max: 900_000 }).map((n) => n / 10_000 + 0),
    longitudeDeg: fc.integer({ min: -1_800_000, max: 1_800_000 }).map((n) => n / 10_000 + 0),
    altitudeKm:
      typeof altitudeKm === 'number'
        ? fc.constant(altitudeKm)
        : fc.double({ min: altitudeKm.min, max: altitudeKm.max, noNaN: true }),
  });
}

/** Integer instants, in ms since 1970-01-01T00:00:00Z, from `fromMs` to `toMs`, both included (integer bounds). */
export function instantArb(fromMs: number, toMs: number): fc.Arbitrary<number> {
  return fc.integer({ min: fromMs, max: toMs });
}

/**
 * The fractional variant of `instantArb`: instants from `fromMs` to `toMs` with a fractional millisecond part.
 * The engine truncates them toward zero like `new Date(t)` (D3).
 */
export function fractionalInstantArb(fromMs: number, toMs: number): fc.Arbitrary<number> {
  return fc.double({ min: fromMs, max: toMs, noNaN: true }).filter((instant) => !Number.isInteger(instant));
}

/** The longest bracket `b − a` of Property 19, in ms (design.md): ten minutes. */
const MAX_PEAK_BRACKET_MS = 600_000;

/** Largest absolute UTC_Instant: the ECMAScript Date range in ms (Requirement 2, criterion 9). */
const MAX_INSTANT_MS = 8.64e15;

/** The shapes of `unimodalArb`. */
export type UnimodalShape = 'bell' | 'cusp' | 'monotone';

/** One case of Property 19: an integer bracket [a, b] and a strictly unimodal score function on it. */
export interface UnimodalCase {
  /**
   * Shape of `score`, with x* = `xStar`: `bell` is `shift − scale · (t − x*)²` (the design's −((t − x*)/w)² with
   * scale = 1/w²), `cusp` is `shift − scale · |t − x*|`, and `monotone` is `shift − scale · (t − a)` for x* = a or
   * `shift + scale · (t − a)` for x* = b. `scale` and `shift` are listed too, because a failure report prints `score`
   * as source text without the values that it closes over.
   */
  readonly shape: UnimodalShape;
  /** The vertical scale: a power of two from 2⁻¹⁰ to 2¹⁰. */
  readonly scale: number;
  /** The vertical shift: an integer from −1024 to 1024. */
  readonly shift: number;
  /** Left end of the bracket, an integer. */
  readonly a: number;
  /** Right end of the bracket, an integer with 1 ≤ b − a ≤ 600 000. */
  readonly b: number;
  /** The integer in [a, b] where `score` has its maximum on [a, b]; `a` or `b` for the shape `monotone`. */
  readonly xStar: number;
  /**
   * Strictly increasing on [a, x*] and strictly decreasing on [x*, b]. On the integers of [a, b] every value is a
   * binary fraction of at most 49 significant bits (t − x* is an integer of at most 600 000, `scale` is a power of
   * two and `shift` a small integer), so `score` is computed without rounding and stays strictly unimodal as a
   * floating-point function. Other values of t are not part of the case.
   */
  readonly score: (t: number) => number;
}

/** The score function of one case, for the bracket that starts at `a` and the maximum at `xStar`. */
function unimodalScore(
  shape: UnimodalShape,
  a: number,
  xStar: number,
  scale: number,
  shift: number,
): (t: number) => number {
  switch (shape) {
    case 'bell':
      return (t) => {
        const distance = t - xStar;
        return shift - scale * (distance * distance);
      };
    case 'cusp':
      return (t) => shift - scale * Math.abs(t - xStar);
    case 'monotone':
      // Falling from a when x* = a, rising to b when x* = b.
      return xStar === a ? (t) => shift - scale * (t - a) : (t) => shift + scale * (t - a);
  }
}

/**
 * The width b − a of a bracket: short brackets, for which `maximizeOnGrid` runs few iterations or none, are drawn as
 * often as widths from 1 ms up to the ten minutes of Property 19.
 */
const bracketWidthArb = fc.oneof(fc.integer({ min: 1, max: 300 }), fc.integer({ min: 1, max: MAX_PEAK_BRACKET_MS }));

/** The distance from `a` to x* in a bracket of `width` ms: a bracket end in a third of the draws, else anywhere. */
function peakOffsetArb(width: number): fc.Arbitrary<number> {
  return fc.oneof(
    { weight: 1, arbitrary: fc.constant(0) },
    { weight: 1, arbitrary: fc.constant(width) },
    { weight: 4, arbitrary: fc.integer({ min: 0, max: width }) },
  );
}

/**
 * Cases for Property 19: an integer bracket [a, b] with b − a from 1 to 600 000 at any UTC_Instant, and a strictly
 * unimodal score function on it with its maximum at x*. The shape is a bell, a cusp or a monotone function, each
 * scaled and shifted. A bell or a cusp has x* anywhere in [a, b], at a bracket end in a third of the draws; a
 * monotone function has x* = a (falling) or x* = b (rising). x* is an integer. A bell and a cusp are symmetric about
 * x*, so two integers at equal distance from x* have equal scores.
 */
export const unimodalArb: fc.Arbitrary<UnimodalCase> = fc
  .tuple(bracketWidthArb, fc.constantFrom<UnimodalShape>('bell', 'cusp', 'monotone'))
  .chain(([width, shape]) =>
    fc
      .record({
        a: instantArb(-MAX_INSTANT_MS, MAX_INSTANT_MS - width),
        offset: shape === 'monotone' ? fc.constantFrom(0, width) : peakOffsetArb(width),
        scale: fc.integer({ min: -10, max: 10 }).map((exponent) => 2 ** exponent),
        shift: fc.integer({ min: -1024, max: 1024 }),
      })
      .map(({ a, offset, scale, shift }): UnimodalCase => {
        const xStar = a + offset;
        return { shape, scale, shift, a, b: a + width, xStar, score: unimodalScore(shape, a, xStar, scale, shift) };
      }),
  );

/** The largest `durationHours` that `predictPasses` accepts, in hours (Requirement 9, criterion 8). */
const MAX_DURATION_HOURS = 168;

/** The largest absolute `minElevationDeg` that `predictPasses` accepts, in degrees (Requirement 9, criterion 9). */
const MAX_ELEVATION_DEG = 90;

/** Valid `durationHours` values: finite numbers greater than 0 and at most 168. */
const validDurationArb = fc.oneof(
  fc.integer({ min: 1, max: MAX_DURATION_HOURS }),
  fc.double({ min: 0, max: MAX_DURATION_HOURS, minExcluded: true, noNaN: true }),
);

/** Valid `minElevationDeg` values: finite numbers from −90 to 90. */
const validMinElevationArb = fc.oneof(
  fc.integer({ min: -MAX_ELEVATION_DEG, max: MAX_ELEVATION_DEG }),
  fc.double({ min: -MAX_ELEVATION_DEG, max: MAX_ELEVATION_DEG, noNaN: true }),
);

/**
 * Generators for the values of a numeric pass parameter that are not primitive numbers: `null`, both booleans,
 * numeric strings written from `valid` numbers (a check that coerces its value would accept them), and other values
 * such as strings, arrays, objects and boxed numbers. `undefined` is not among them, because it selects the default.
 * One generator per kind, so that `fc.oneof` draws each kind equally often.
 */
function wrongTypeArms(valid: fc.Arbitrary<number>): fc.Arbitrary<unknown>[] {
  return [
    fc.constant(null),
    fc.constant(true),
    fc.constant(false),
    valid.map(String),
    fc.anything({ withBoxedValues: true }).filter((value) => typeof value !== 'number' && value !== undefined),
  ];
}

/**
 * Values of `durationHours` that `predictPasses` must reject (Property 6): anything other than `undefined` that is not
 * a finite `number` greater than 0 and at most 168. That is `null`, booleans, numeric strings, other strings, arrays,
 * objects and boxed numbers; NaN and the infinities; 0 and −0 hours; negative numbers; and numbers above 168, among
 * them the double just above 168. `undefined` and every number in (0, 168] are valid and never generated.
 */
export const invalidDurationArb: fc.Arbitrary<unknown> = fc.oneof(
  ...wrongTypeArms(validDurationArb),
  // Not finite.
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  // Zero hours: neither 0 nor −0 is greater than 0.
  fc.constant(0),
  fc.constant(-0),
  // Negative hours, from −1000 down to −Number.MAX_VALUE.
  fc.integer({ min: -1_000, max: -1 }),
  fc.double({ min: -Number.MAX_VALUE, max: -Number.MIN_VALUE, noNaN: true }),
  // More than 168 hours: the next double above 168 (doubles in [128, 256) are 2⁻⁴⁵ apart), whole hours, and any
  // larger number.
  fc.constant(MAX_DURATION_HOURS + 2 ** -45),
  fc.integer({ min: MAX_DURATION_HOURS + 1, max: 10_000 }),
  fc.double({ min: MAX_DURATION_HOURS, max: Number.MAX_VALUE, minExcluded: true, noNaN: true }),
);

/**
 * Values of `minElevationDeg` that `predictPasses` must reject (Property 6): anything other than `undefined` that is
 * not a finite `number` from −90 to 90. That is `null`, booleans, numeric strings, other strings, arrays, objects and
 * boxed numbers; NaN and the infinities; and numbers beyond ±90°, among them the doubles just beyond 90 and −90.
 * `undefined` and every number in [−90, 90] (0 and −0 included) are valid and never generated.
 */
export const invalidMinElevationArb: fc.Arbitrary<unknown> = fc.oneof(
  ...wrongTypeArms(validMinElevationArb),
  // Not finite.
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  // Above +90°: the next double above 90 (doubles in [64, 128) are 2⁻⁴⁶ apart), whole degrees, and any larger
  // number.
  fc.constant(MAX_ELEVATION_DEG + 2 ** -46),
  fc.integer({ min: MAX_ELEVATION_DEG + 1, max: 10_000 }),
  fc.double({ min: MAX_ELEVATION_DEG, max: Number.MAX_VALUE, minExcluded: true, noNaN: true }),
  // Below −90°: the mirror image.
  fc.constant(-MAX_ELEVATION_DEG - 2 ** -46),
  fc.integer({ min: -10_000, max: -MAX_ELEVATION_DEG - 1 }),
  fc.double({ min: -Number.MAX_VALUE, max: -MAX_ELEVATION_DEG, maxExcluded: true, noNaN: true }),
);
