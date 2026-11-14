// Source boundary of the Orbit_Engine (design.md, D24): Requirement 2, criteria 1, 2 and 10, and
// Requirement 14, criterion 12. The synthetic snippets are the self-check of the scanner.
import { describe, expect, it } from 'vitest';
import { scanEngineSources, scanSourceText, type SourceViolation } from '../helpers/source-scan';

// One snippet per violation kind of the design, with the kind of violation that must report it.
const VIOLATING_SNIPPETS: Array<[snippet: string, kind: SourceViolation['kind']]> = [
  ["import React from 'react'", 'import'],
  ["export * from '../../app/x'", 'import'],
  ["await import('node:fs')", 'import'],
  ["import type { X } from 'next'", 'import'],
  ['const w = window', 'global'],
  ["globalThis['document']", 'global'],
  ['process.env.X', 'global'],
];

describe('source boundary of src/lib/orbit', () => {
  it('has no violation in any Engine_Source_Module', () => {
    expect(scanEngineSources()).toEqual([]);
  });

  it.each(VIOLATING_SNIPPETS)('reports the snippet %s', (snippet, kind) => {
    expect(scanSourceText(snippet).map((violation) => violation.kind)).toEqual([kind]);
  });

  it('does not report window that appears only in a comment and a string', () => {
    expect(scanSourceText("// window\nconst label = 'window';")).toEqual([]);
  });
});
