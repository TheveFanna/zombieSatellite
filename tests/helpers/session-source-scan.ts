// Source-boundary scanner for the session module (design.md, Property 1 and "Testing Strategy").
// It checks Requirement 1, criteria 2 and 5 for every .ts file under src/lib/session.
// Files are parsed with the TypeScript compiler API, so comments and string contents cannot
// cause false matches. The node handling follows tests/helpers/pointing-source-scan.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every source file of the session module. */
const SESSION_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'session');

/** The only files outside src/lib/session that the session module may import (resolved, without extension). */
const ALLOWED_OUTSIDE = ['orbit', 'catalog', 'pointing'].map((name) =>
  join(import.meta.dirname, '..', '..', 'src', 'lib', name, 'index'),
);

export interface SessionSourceViolation {
  /** Path relative to src/lib/session, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node. */
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(SESSION_ROOT, path).split(sep).join('/');
}

/** True when `path` is the session directory or lies below it. */
function isInsideSession(path: string): boolean {
  const rel = relative(SESSION_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Only a "./" or "../" path is allowed, and it must resolve inside src/lib/session or exactly
 * to the index of src/lib/orbit, src/lib/catalog or src/lib/pointing.
 */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;
  const resolved = resolve(fromDir, specifier);
  return isInsideSession(resolved) || ALLOWED_OUTSIDE.includes(resolved.replace(/\.(?:[cm]?[jt]s|tsx)$/, ''));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listSessionSourcePaths(): string[] {
  return listFiles(SESSION_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/session, as sorted names relative to it, with "/" separators. */
export function listSessionSourceFiles(): string[] {
  return listSessionSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): SessionSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: SessionSourceViolation[] = [];

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    let detail: string | undefined;
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      detail = 'the module specifier is not a string literal';
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      detail = `'${specifier.text}' is not a relative path inside src/lib/session or the index of orbit, catalog or pointing`;
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

/** Scans every .ts file under src/lib/session. An empty result means that the session module keeps its boundary. */
export function scanSessionSources(): SessionSourceViolation[] {
  return listSessionSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
