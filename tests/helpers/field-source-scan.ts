// Source-boundary scanner for the Field_Core (design.md, F1). It checks Requirement 1, criteria 3 and 4
// for every .ts file under src/lib/field. Files are parsed with the TypeScript compiler API, so
// comments and string contents cannot cause false matches. Copied from tests/helpers/shell-source-scan.ts,
// with the identifier and call checks of tests/helpers/source-scan.ts added.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every source file of the Field_Core. */
const FIELD_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'field');

/** The only files outside src/lib/field that the Field_Core may import (resolved, without extension). */
const ALLOWED_OUTSIDE = ['orbit', 'pointing', 'session', 'catalog'].map((name) =>
  join(import.meta.dirname, '..', '..', 'src', 'lib', name, 'index'),
);

/** Browser and timing globals that the Field_Core must not reference (design F1). `TextEncoder` is allowed. */
const FORBIDDEN_IDENTIFIERS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'Blob',
  'URL',
  'Image',
  'HTMLCanvasElement',
  'fetch',
  'XMLHttpRequest',
  'performance',
]);

export interface FieldSourceViolation {
  /** Path relative to src/lib/field, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node. */
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(FIELD_ROOT, path).split(sep).join('/');
}

/** True when `path` is the field directory or lies below it. */
function isInsideField(path: string): boolean {
  const rel = relative(FIELD_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Only a "./" or "../" path is allowed, and it must resolve inside src/lib/field or exactly
 * to the index of src/lib/orbit, pointing, session or catalog.
 */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;
  const resolved = resolve(fromDir, specifier);
  return isInsideField(resolved) || ALLOWED_OUTSIDE.includes(resolved.replace(/\.(?:[cm]?[jt]s|tsx)$/, ''));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listFieldSourcePaths(): string[] {
  return listFiles(FIELD_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/field, as sorted names relative to it, with "/" separators. */
export function listFieldSourceFiles(): string[] {
  return listFieldSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): FieldSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: FieldSourceViolation[] = [];

  const report = (node: ts.Node, detail: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    violations.push({ file, line, detail });
  };

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      report(node, 'the module specifier is not a string literal');
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      report(
        node,
        `'${specifier.text}' is not a relative path inside src/lib/field or the index of orbit, pointing, session or catalog`,
      );
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
    } else if (ts.isIdentifier(node)) {
      if (FORBIDDEN_IDENTIFIERS.has(node.text)) report(node, `forbidden identifier '${node.text}'`);
    }

    // Forbidden calls: `Date.now()` and `new Date()` without arguments.
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Date' &&
      node.expression.name.text === 'now'
    ) {
      report(node, 'forbidden call Date.now()');
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Date' &&
      (node.arguments === undefined || node.arguments.length === 0)
    ) {
      report(node, 'forbidden call new Date() without arguments');
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return violations;
}

/** Scans every .ts file under src/lib/field. An empty result means that the Field_Core keeps its boundary. */
export function scanFieldSources(): FieldSourceViolation[] {
  return listFieldSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
