// Source-boundary scanner for the Zombie_Catalog (design.md, D4, D20 and "tests/helpers/catalog-source-scan.ts").
// It checks Requirement 8, criteria 1 and 2 for every .ts file under src/lib/catalog.
// Files are parsed with the TypeScript compiler API, so comments and string contents cannot
// cause false matches. The node handling follows tests/helpers/source-scan.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every source file of the Zombie_Catalog. */
const CATALOG_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'catalog');

export interface CatalogSourceViolation {
  /** Path relative to src/lib/catalog, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node. */
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(CATALOG_ROOT, path).split(sep).join('/');
}

/** True when `path` is the catalog directory or lies below it. */
function isInsideCatalog(path: string): boolean {
  const rel = relative(CATALOG_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Only a "./" or "../" path that resolves inside src/lib/catalog is allowed. */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  return (specifier.startsWith('./') || specifier.startsWith('../')) && isInsideCatalog(resolve(fromDir, specifier));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listCatalogSourcePaths(): string[] {
  return listFiles(CATALOG_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/catalog, as sorted names relative to it, with "/" separators. */
export function listCatalogSourceFiles(): string[] {
  return listCatalogSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): CatalogSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: CatalogSourceViolation[] = [];

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    let detail: string | undefined;
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      detail = 'the module specifier is not a string literal';
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      detail = `'${specifier.text}' is not a relative path inside src/lib/catalog`;
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

/** Scans every .ts file under src/lib/catalog. An empty result means that the catalog keeps its boundary. */
export function scanCatalogSources(): CatalogSourceViolation[] {
  return listCatalogSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
