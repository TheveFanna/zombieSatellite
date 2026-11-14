// Source-boundary scanner (design.md, D24 and "Source boundary scan"). It checks Requirement 2,
// criteria 1, 2 and 10 and Requirement 14, criterion 12 for every file under src/lib/orbit.
// Files are parsed with the TypeScript compiler API, so comments and string contents cannot
// cause false matches.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every Engine_Source_Module (Requirement 2, criterion 1). */
const ENGINE_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'orbit');

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

/** The DOM and Node.js globals that an Engine_Source_Module must not reference (Requirement 2, criterion 10). */
const FORBIDDEN_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'indexedDB',
  'process',
  'Buffer',
  'global',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'setImmediate',
  'clearImmediate',
]);

export interface SourceViolation {
  /** Path relative to src/lib/orbit, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node, or 0 for a violation of the file as a whole. */
  readonly line: number;
  /** 'file': extension or missing index.ts; 'import': module specifier; 'global': forbidden global. */
  readonly kind: 'file' | 'import' | 'global';
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(ENGINE_ROOT, path).split(sep).join('/');
}

/** True when `path` is the engine directory or lies below it. */
function isInsideEngine(path: string): boolean {
  const rel = relative(ENGINE_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** `satellite.js` itself, or a "./" or "../" path that resolves inside src/lib/orbit. */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  if (specifier === 'satellite.js') return true;
  return (specifier.startsWith('./') || specifier.startsWith('../')) && isInsideEngine(resolve(fromDir, specifier));
}

/**
 * Scans one source text. Relative specifiers are resolved from the directory of `filePath`, which
 * defaults to a file name inside src/lib/orbit; nothing is read from or written to that path.
 */
export function scanSourceText(text: string, filePath: string = join(ENGINE_ROOT, 'snippet.ts')): SourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: SourceViolation[] = [];

  const report = (node: ts.Node, kind: 'import' | 'global', detail: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    violations.push({ file, line, kind, detail });
  };

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      report(node, 'import', 'the module specifier is not a string literal');
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      report(node, 'import', `'${specifier.text}' is neither satellite.js nor a relative path inside src/lib/orbit`);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      // Includes `import type` and `export type ... from`; `export { a }` has no specifier.
      if (node.moduleSpecifier !== undefined) checkSpecifier(node, node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node)) {
      // `import x = require('...')`; `import x = Namespace.Name` imports no module.
      if (ts.isExternalModuleReference(node.moduleReference)) checkSpecifier(node, node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      // Dynamic `import(...)`.
      checkSpecifier(node, node.arguments[0]);
    } else if (ts.isImportTypeNode(node)) {
      // The `import('...')` type.
      checkSpecifier(node, ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    } else if (ts.isIdentifier(node)) {
      if (FORBIDDEN_GLOBALS.has(node.text)) report(node, 'global', node.text);
    } else if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'globalThis') {
      const key = node.argumentExpression;
      if (!ts.isStringLiteralLike(key)) {
        report(node, 'global', 'globalThis[...] with a key that is not a string literal');
      } else if (FORBIDDEN_GLOBALS.has(key.text)) {
        report(node, 'global', `globalThis['${key.text}']`);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return violations;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** Scans every file under src/lib/orbit. An empty result means that the engine keeps its boundary. */
export function scanEngineSources(): SourceViolation[] {
  const files = listFiles(ENGINE_ROOT).sort();
  const violations: SourceViolation[] = [];
  // Without index.ts an empty or moved directory would pass.
  if (!files.some((path) => relativeName(path) === 'index.ts')) {
    violations.push({ file: 'index.ts', line: 0, kind: 'file', detail: 'the entry module index.ts is missing' });
  }
  for (const path of files) {
    if (SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension))) {
      violations.push(...scanSourceText(readFileSync(path, 'utf8'), path));
    } else {
      violations.push({
        file: relativeName(path),
        line: 0,
        kind: 'file',
        detail: `not a source file (allowed extensions: ${SOURCE_EXTENSIONS.join(', ')})`,
      });
    }
  }
  return violations;
}
