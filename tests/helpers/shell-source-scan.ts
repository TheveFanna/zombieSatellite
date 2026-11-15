// Source-boundary scanner for the shell core (design.md, "The src/lib/shell boundary").
// It checks Requirement 12, criterion 2 for every .ts file under src/lib/shell.
// Files are parsed with the TypeScript compiler API, so comments and string contents cannot
// cause false matches. Copied from tests/helpers/qsl-source-scan.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/** The directory that holds every source file of the shell core. */
const SHELL_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'shell');

/** The only files outside src/lib/shell that the shell core may import (resolved, without extension). */
const ALLOWED_OUTSIDE = ['orbit', 'pointing'].map((name) =>
  join(import.meta.dirname, '..', '..', 'src', 'lib', name, 'index'),
);

export interface ShellSourceViolation {
  /** Path relative to src/lib/shell, with "/" separators. */
  readonly file: string;
  /** 1-based line of the offending node. */
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(SHELL_ROOT, path).split(sep).join('/');
}

/** True when `path` is the shell directory or lies below it. */
function isInsideShell(path: string): boolean {
  const rel = relative(SHELL_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Only a "./" or "../" path is allowed, and it must resolve inside src/lib/shell or exactly
 * to the index of src/lib/orbit or src/lib/pointing.
 */
function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;
  const resolved = resolve(fromDir, specifier);
  return isInsideShell(resolved) || ALLOWED_OUTSIDE.includes(resolved.replace(/\.(?:[cm]?[jt]s|tsx)$/, ''));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listShellSourcePaths(): string[] {
  return listFiles(SHELL_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/shell, as sorted names relative to it, with "/" separators. */
export function listShellSourceFiles(): string[] {
  return listShellSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): ShellSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: ShellSourceViolation[] = [];

  // `specifier` is the module specifier of `node`; anything other than a string literal is a violation.
  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    let detail: string | undefined;
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      detail = 'the module specifier is not a string literal';
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      detail = `'${specifier.text}' is not a relative path inside src/lib/shell or the index of orbit or pointing`;
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

/** Scans every .ts file under src/lib/shell. An empty result means that the shell core keeps its boundary. */
export function scanShellSources(): ShellSourceViolation[] {
  return listShellSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
