// Source-boundary scanner for the pointing module (design.md, Property 1 and "Testing Strategy").
// It checks Requirement 1, criteria 2 and 5 for every .ts file under src/lib/pointing.
// Files are parsed with the TypeScript compiler API, so comments and string contents cannot
// cause false matches. The node handling follows tests/helpers/catalog-source-scan.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every source file of the pointing module. */
const POINTING_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'pointing');

export interface PointingSourceViolation {
  /** Path relative to src/lib/pointing, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node. */
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(POINTING_ROOT, path).split(sep).join('/');
}

/** True when `path` is the pointing directory or lies below it. */
function isInsidePointing(path: string): boolean {
  const rel = relative(POINTING_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Only a "./" or "../" path that resolves inside src/lib/pointing is allowed. */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  return (specifier.startsWith('./') || specifier.startsWith('../')) && isInsidePointing(resolve(fromDir, specifier));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listPointingSourcePaths(): string[] {
  return listFiles(POINTING_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/pointing, as sorted names relative to it, with "/" separators. */
export function listPointingSourceFiles(): string[] {
  return listPointingSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): PointingSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: PointingSourceViolation[] = [];

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    let detail: string | undefined;
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      detail = 'the module specifier is not a string literal';
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      detail = `'${specifier.text}' is not a relative path inside src/lib/pointing`;
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

/** Scans every .ts file under src/lib/pointing. An empty result means that the pointing module keeps its boundary. */
export function scanPointingSources(): PointingSourceViolation[] {
  return listPointingSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
