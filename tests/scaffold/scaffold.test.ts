// Static checks of Requirement 1 (design.md, Testing Strategy, row tests/scaffold/scaffold.test.ts).
// They read repository files as text and parse TypeScript with the compiler API. Nothing is
// installed, built or rendered here; the command-level checks belong to task 1.5.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  packageManager?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const root = join(import.meta.dirname, '..', '..');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json')) as PackageJson;

const APP_FILES = ['layout.tsx', 'page.tsx'];
const OTHER_LOCK_FILES = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

// The compiler options that `strict` enables (criterion 3).
const STRICT_FAMILY = [
  'noImplicitAny',
  'noImplicitThis',
  'alwaysStrict',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'strictPropertyInitialization',
  'strictBuiltinIteratorReturn',
  'useUnknownInCatchVariables',
] as const;

// Inline VAR=value assignments, $ and % expansion, rm, del and command chaining (criterion 13).
const OS_SPECIFIC_SYNTAX = /(^|\s)\w+=|\$|%|\brm\b|\bdel\b|&&|;/;

// Wording rules of criteria 24 and 25.
const RADIO_TERM = /\b(?:beacon|signal|radio|transmission)/i;
const SIMULATED = /\b(?:simulated|synthesized)\b/i;
const RECEPTION_WORD = /\b(?:receiv\w*|captur\w*|decod\w*|listen\w*|hear(?:s|d|ing)?)\b/i;

/** The text of one top-level section ("importers", "packages" or "snapshots") of pnpm-lock.yaml. */
const lockSection = (lock: string, name: string): string =>
  lock.split(/^(?=[A-Za-z]+:)/m).find((part) => part.startsWith(`${name}:`)) ?? '';

/** The paragraphs and list items of a Markdown text, each on one line; fenced code blocks are left out. */
const markdownBlocks = (markdown: string): string[] =>
  markdown
    .replace(/^```[\s\S]*?^```/gm, '')
    .split(/\n[ \t\r]*\n|\n(?=\s*(?:[-*+]|\d+\.)\s)/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block !== '');

/** Every string value of a parsed JSON document. */
function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  return typeof value === 'object' && value !== null ? Object.values(value).flatMap(stringValues) : [];
}

function parseApp(file: string): ts.SourceFile {
  return parseAppPath(file);
}

/** Parses a TSX file below src/app; the path may be nested, e.g. `session/[noradId]/page.tsx`. */
function parseAppPath(relativePath: string): ts.SourceFile {
  return ts.createSourceFile(relativePath, read(`src/app/${relativePath}`), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

const SESSION_PAGES = ['session/page.tsx', 'session/[noradId]/page.tsx'];
/** The field companion pages, listed by name. */
const FIELD_PAGES = ['planner/[noradId]/page.tsx', 'guide/[noradId]/page.tsx', 'log/page.tsx'];
const CARDS_PAGES = ['cards/page.tsx', 'cards/[noradId]/[aosMs]/[n]/page.tsx'];
const SHELL_REGISTRAR = 'src/components/shell/service-worker-registrar.tsx';
/** The presentational SVG components of task 7C, listed by name. */
const SHELL_VISUALS = [
  'src/components/shell/visuals/doppler-dial.tsx',
  'src/components/shell/visuals/lifeline.tsx',
  'src/components/shell/visuals/pass-profile.tsx',
  'src/components/shell/visuals/sky-dome.tsx',
];
/** The console components, listed by name. */
const CONSOLE_COMPONENTS = ['src/components/console/alignment-meter.tsx', 'src/components/console/console-sheet.tsx', 'src/components/console/console-tabs.tsx', 'src/components/console/countdown-ring.tsx', 'src/components/console/pass-timeline.tsx', 'src/components/console/radar-panel.tsx', 'src/components/console/session-console.tsx', 'src/components/console/story-panel.tsx'];
/** The field companion components, listed by name. */
const FIELD_COMPONENTS = [
  'src/components/field/ar-view.tsx',
  'src/components/field/first-run-guide.tsx',
  'src/components/field/ground-track-map.tsx',
  'src/components/field/model-viewer.tsx',
  'src/components/field/session-panel.tsx',
  'src/components/field/visuals/ar-overlay.tsx',
  'src/components/field/visuals/field-bits.tsx',
  'src/components/field/visuals/sky-track.tsx',
];

/** Parses a TSX file by its path relative to the repository root. */
function parseTsx(path: string): ts.SourceFile {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** The string values of every property assignment of a file, including nested objects. */
function propertyStrings(file: string): string[] {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const strings: string[] = [];
  walk(source, (node) => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteralLike(node.initializer)) strings.push(node.initializer.text);
  });
  return strings;
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

/** The string values of a `metadata` export (title, description, ...). */
function metadataStrings(source: ts.SourceFile): string[] {
  const strings: string[] = [];
  walk(source, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'metadata' && node.initializer) {
      walk(node.initializer, (inner) => {
        if (ts.isPropertyAssignment(inner) && ts.isStringLiteralLike(inner.initializer)) {
          strings.push(inner.initializer.text);
        }
      });
    }
  });
  return strings;
}

/** The text nodes of the JSX of a file, which is the text the page renders. */
function jsxTexts(source: ts.SourceFile): string[] {
  const texts: string[] = [];
  walk(source, (node) => {
    if (ts.isJsxText(node) && node.text.trim() !== '') texts.push(node.text.replace(/\s+/g, ' ').trim());
  });
  return texts;
}

/** What the placeholder UI must not contain (criteria 20 and 21). Comments and JSX text cannot match. */
function forbiddenConstructs(source: ts.SourceFile): string[] {
  const found: string[] = [];
  walk(source, (node) => {
    if (ts.isStringLiteralLike(node) && (node.text === 'use client' || /^next\/(?:font|image)\b/.test(node.text))) {
      found.push(node.text);
    }
    if (ts.isIdentifier(node) && node.text === 'fetch') found.push('fetch');
    if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      found.push('async function');
    }
  });
  return found;
}

/** The texts that criteria 24 and 25 cover, grouped by source. */
function checkedTexts(): Array<[string, string[]]> {
  return [
    ['README.md paragraphs and list items', markdownBlocks(read('README.md'))],
    ['package.json strings', stringValues(pkg)],
    ['page metadata strings', APP_FILES.flatMap((file) => metadataStrings(parseApp(file)))],
    [
      'rendered JSX text',
      [
        ...APP_FILES.flatMap((file) => jsxTexts(parseApp(file))),
        ...SESSION_PAGES.flatMap((file) => jsxTexts(parseAppPath(file))),
        ...CARDS_PAGES.flatMap((file) => jsxTexts(parseAppPath(file))),
        ...FIELD_PAGES.flatMap((file) => jsxTexts(parseAppPath(file))),
        ...jsxTexts(parseTsx(SHELL_REGISTRAR)),
        ...SHELL_VISUALS.flatMap((file) => jsxTexts(parseTsx(file))),
        ...FIELD_COMPONENTS.flatMap((file) => jsxTexts(parseTsx(file))),
        ...CONSOLE_COMPONENTS.flatMap((file) => jsxTexts(parseTsx(file))),
      ],
    ],
    ['session copy strings', propertyStrings('src/components/session/copy.ts')],
    ['qsl copy strings', propertyStrings('src/lib/qsl/copy.ts')],
    ['shell copy strings', propertyStrings('src/components/shell/copy.ts')],
    ['field copy strings', propertyStrings('src/lib/field/copy.ts')],
    ['console copy strings', propertyStrings('src/components/console/copy.ts')],
    ['listening guide strings', propertyStrings('src/lib/field/guide.ts')],
    ['model attribution strings', propertyStrings('src/lib/field/models.ts')],
    ['manifest strings', propertyStrings('src/app/manifest.ts')],
  ];
}

describe('Requirement 1: project scaffold', () => {
  it('1.1 next is declared in dependencies with a range that admits only major 16', () => {
    expect(pkg.dependencies?.next).toMatch(/^[\^~]?16\.\d+\.\d+$/);
  });

  it.each(['react', 'react-dom'])('1.2 %s is declared in dependencies with a range that admits only major 19', (name) => {
    expect(pkg.dependencies?.[name]).toMatch(/^[\^~]?19\.\d+\.\d+$/);
  });

  it('1.3 tsconfig.json sets strict to true and no strict-family option to false', () => {
    const host: ts.ParseConfigFileHost = {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    };
    const parsed = ts.getParsedCommandLineOfConfigFile(join(root, 'tsconfig.json'), undefined, host);
    expect(parsed?.options.strict).toBe(true);
    expect(STRICT_FAMILY.filter((option) => parsed?.options[option] === false)).toEqual([]);
  });

  it('1.4 satellite.js is declared in dependencies as exactly 6.0.2', () => {
    expect(pkg.dependencies?.['satellite.js']).toBe('6.0.2');
  });

  it('1.5 pnpm-lock.yaml records satellite.js 6.0.2 in the importer, packages and snapshots entries', () => {
    const lock = read('pnpm-lock.yaml');
    const importer = /^\s+satellite\.js:\s+specifier: (\S+)\s+version: (\S+)/m.exec(lockSection(lock, 'importers'));
    expect(importer?.slice(1)).toEqual(['6.0.2', '6.0.2']);
    for (const section of ['packages', 'snapshots']) {
      const keys = [...lockSection(lock, section).matchAll(/^ {2}'?(satellite\.js@[^:'\s]*)/gm)].map((match) => match[1]);
      expect(keys, section).toEqual(['satellite.js@6.0.2']);
    }
  });

  it('1.7 pnpm is the only package manager', () => {
    expect(existsSync(join(root, 'pnpm-lock.yaml'))).toBe(true);
    expect(OTHER_LOCK_FILES.filter((file) => existsSync(join(root, file)))).toEqual([]);
    expect(pkg.packageManager).toMatch(/^pnpm@/);
  });

  it('1.8 engines.node is >=22.12.0', () => {
    expect(pkg.engines?.node).toBe('>=22.12.0');
  });

  it.each(['vitest', 'fast-check'])('1.9, 1.10 %s is declared in devDependencies and not in dependencies', (name) => {
    expect(Object.keys(pkg.devDependencies ?? {})).toContain(name);
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain(name);
  });

  it('1.11 no test file carries a Vitest environment directive', () => {
    // Assembled from two parts so that this file does not contain the directive itself.
    const directive = ['@vitest', 'environment'].join('-');
    const testFiles = readdirSync(join(root, 'tests'), { encoding: 'utf8', recursive: true }).filter((file) =>
      file.endsWith('.test.ts'),
    );
    expect(testFiles.filter((file) => read(join('tests', file)).includes(directive))).toEqual([]);
  });

  it('1.13 no script uses operating-system-specific shell syntax', () => {
    expect(Object.entries(pkg.scripts ?? {}).filter(([, command]) => OS_SPECIFIC_SYNTAX.test(command))).toEqual([]);
  });

  it('1.19 src/app holds only layout.tsx, page.tsx, the approved api, cards, pointing and session routes, globals.css and the named .ts files, and no .tsx file other than these pages, the shell service-worker registrar and the named shell visuals and the named field components and the named console components exists under src', () => {
    expect(readdirSync(join(root, 'src', 'app')).sort()).toEqual([
      'api',
      'cards',
      'globals.css',
      'guide',
      'layout.tsx',
      'log',
      'manifest.ts',
      'page.tsx',
      'planner',
      'pointing',
      'session',
    ]);
    const appTsFiles = readdirSync(join(root, 'src', 'app'), { encoding: 'utf8', recursive: true })
      .filter((file) => file.endsWith('.ts'))
      .map((file) => file.split(sep).join('/'));
    expect(appTsFiles.sort()).toEqual(['api/tle/route.ts', 'manifest.ts']);
    const tsxFiles = readdirSync(join(root, 'src'), { encoding: 'utf8', recursive: true })
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => file.split(sep).join('/'));
    expect(tsxFiles.sort()).toEqual([
      'app/cards/[noradId]/[aosMs]/[n]/page.tsx',
      'app/cards/page.tsx',
      'app/guide/[noradId]/page.tsx',
      'app/layout.tsx',
      'app/log/page.tsx',
      'app/page.tsx',
      'app/planner/[noradId]/page.tsx',
      'app/pointing/page.tsx',
      'app/session/[noradId]/page.tsx',
      'app/session/page.tsx',
      'components/console/alignment-meter.tsx',
      'components/console/console-sheet.tsx',
      'components/console/console-tabs.tsx',
      'components/console/countdown-ring.tsx',
      'components/console/pass-timeline.tsx',
      'components/console/radar-panel.tsx',
      'components/console/session-console.tsx',
      'components/console/story-panel.tsx',
      'components/field/ar-view.tsx',
      'components/field/first-run-guide.tsx',
      'components/field/ground-track-map.tsx',
      'components/field/model-viewer.tsx',
      'components/field/session-panel.tsx',
      'components/field/visuals/ar-overlay.tsx',
      'components/field/visuals/field-bits.tsx',
      'components/field/visuals/sky-track.tsx',
      'components/shell/service-worker-registrar.tsx',
      'components/shell/visuals/doppler-dial.tsx',
      'components/shell/visuals/lifeline.tsx',
      'components/shell/visuals/pass-profile.tsx',
      'components/shell/visuals/sky-dome.tsx',
    ]);
  });

  it.each(APP_FILES)('1.20, 1.21 %s has no use client, fetch, async function, next/font or next/image', (file) => {
    expect(forbiddenConstructs(parseApp(file))).toEqual([]);
  });

  it.each([
    ['1.22', "The coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR."],
    ['1.23', 'All code in this repository was newly written during the Kiroween 2026 submission period.'],
  ])('%s README.md contains the required sentence verbatim', (_criterion, sentence) => {
    expect(read('README.md')).toContain(sentence);
  });

  it('1.24 a text that mentions a beacon, signal or radio transmission also says simulated or synthesized', () => {
    for (const [source, texts] of checkedTexts()) {
      expect(texts, `${source} found`).not.toHaveLength(0);
      expect(texts.filter((text) => RADIO_TERM.test(text) && !SIMULATED.test(text)), source).toEqual([]);
    }
  });

  it('1.25 no sentence pairs a reception word with a radio term', () => {
    for (const [source, texts] of checkedTexts()) {
      const sentences = texts.flatMap((text) => text.split(/(?<=[.!?])\s+/));
      expect(sentences.filter((sentence) => RECEPTION_WORD.test(sentence) && RADIO_TERM.test(sentence)), source).toEqual([]);
    }
  });
});
