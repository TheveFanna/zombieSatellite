// Source-boundary scanner for the QSL module (design.md, Property 1 and "Testing Strategy").
// It checks Requirement 1, criteria 2 and 4 for every .ts file under src/lib/qsl.
// Files are parsed with the TypeScript compiler API, so comments and string contents cannot
// cause false matches. Copied from tests/helpers/session-source-scan.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every source file of the QSL module. */
const QSL_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'qsl');

/** The only files outside src/lib/qsl that the QSL module may import (resolved, without extension). */
const ALLOWED_OUTSIDE = ['session', 'catalog'].map((name) =>
  join(import.meta.dirname, '..', '..', 'src', 'lib', name, 'index'),
);

export interface QslSourceViolation {
  /** Path relative to src/lib/qsl, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node. */
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(QSL_ROOT, path).split(sep).join('/');
}

/** True when `path` is the QSL directory or lies below it. */
function isInsideQsl(path: string): boolean {
  const rel = relative(QSL_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Only a "./" or "../" path is allowed, and it must resolve inside src/lib/qsl or exactly
 * to the index of src/lib/session or src/lib/catalog.
 */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;
  const resolved = resolve(fromDir, specifier);
  return isInsideQsl(resolved) || ALLOWED_OUTSIDE.includes(resolved.replace(/\.(?:[cm]?[jt]s|tsx)$/, ''));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listQslSourcePaths(): string[] {
  return listFiles(QSL_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/qsl, as sorted names relative to it, with "/" separators. */
export function listQslSourceFiles(): string[] {
  return listQslSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): QslSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: QslSourceViolation[] = [];

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    let detail: string | undefined;
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      detail = 'the module specifier is not a string literal';
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      detail = `'${specifier.text}' is not a relative path inside src/lib/qsl or the index of session or catalog`;
    }
    if (detail !== undefined) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      violations.push({ file, line, detail });
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
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      // `require(...)`.
      checkSpecifier(node, node.arguments[0]);
    } else if (ts.isImportTypeNode(node)) {
      // The `import('...')` type.
      checkSpecifier(node, ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return violations;
}

/** Scans every .ts file under src/lib/qsl. An empty result means that the QSL module keeps its boundary. */
export function scanQslSources(): QslSourceViolation[] {
  return listQslSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
