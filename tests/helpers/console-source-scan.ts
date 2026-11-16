// Source-boundary scanner for the Console_Lib (design.md, C1). Copied from tests/helpers/field-source-scan.ts
// with root src/lib/console and an allow-list of the pointing and orbit barrels only.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const CONSOLE_ROOT = join(import.meta.dirname, '..', '..', 'src', 'lib', 'console');

/** The only files outside src/lib/console that the Console_Lib may import (resolved, without extension). */
const ALLOWED_OUTSIDE = ['orbit', 'pointing'].map((name) =>
  join(import.meta.dirname, '..', '..', 'src', 'lib', name, 'index'),
);

const FORBIDDEN_IDENTIFIERS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Blob',
  'URL',
  'Image',
  'HTMLCanvasElement',
  'fetch',
  'XMLHttpRequest',
  'performance',
]);

export interface ConsoleSourceViolation {
  readonly file: string;
  readonly line: number;
  readonly detail: string;
}

function relativeName(path: string): string {
  return relative(CONSOLE_ROOT, path).split(sep).join('/');
}

function isInsideConsole(path: string): boolean {
  const rel = relative(CONSOLE_ROOT, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function isAllowedSpecifier(specifier: string, fromDir: string): boolean {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;
  const resolved = resolve(fromDir, specifier);
  return isInsideConsole(resolved) || ALLOWED_OUTSIDE.includes(resolved.replace(/\.(?:[cm]?[jt]s|tsx)$/, ''));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function listConsoleSourcePaths(): string[] {
  return listFiles(CONSOLE_ROOT)
    .filter((path) => path.endsWith('.ts'))
    .sort();
}

/** Every .ts file under src/lib/console, as sorted names relative to it, with "/" separators. */
export function listConsoleSourceFiles(): string[] {
  return listConsoleSourcePaths().map(relativeName);
}

function scanSourceText(text: string, filePath: string): ConsoleSourceViolation[] {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const file = relativeName(filePath);
  const fromDir = dirname(filePath);
  const violations: ConsoleSourceViolation[] = [];

  const report = (node: ts.Node, detail: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    violations.push({ file, line, detail });
  };

  const checkSpecifier = (node: ts.Node, specifier: ts.Node | undefined): void => {
    if (specifier === undefined || !ts.isStringLiteralLike(specifier)) {
      report(node, 'the module specifier is not a string literal');
    } else if (!isAllowedSpecifier(specifier.text, fromDir)) {
      report(
        node,
        `'${specifier.text}' is not a relative path inside src/lib/console or the index of orbit or pointing`,
      );
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined) checkSpecifier(node, node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) checkSpecifier(node, node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      checkSpecifier(node, node.arguments[0]);
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      checkSpecifier(node, node.arguments[0]);
    } else if (ts.isImportTypeNode(node)) {
      checkSpecifier(node, ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    } else if (ts.isIdentifier(node)) {
      if (FORBIDDEN_IDENTIFIERS.has(node.text)) report(node, `forbidden identifier '${node.text}'`);
    }

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

/** Scans every .ts file under src/lib/console. An empty result means that the Console_Lib keeps its boundary. */
export function scanConsoleSources(): ConsoleSourceViolation[] {
  return listConsoleSourcePaths().flatMap((path) => scanSourceText(readFileSync(path, 'utf8'), path));
}
