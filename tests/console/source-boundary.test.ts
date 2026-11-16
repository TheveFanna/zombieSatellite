// Feature: console-ui, Testing Strategy: Console_Lib modules stay inside their boundary
import { describe, expect, it } from 'vitest';
import { listConsoleSourceFiles, scanConsoleSources } from '../helpers/console-source-scan';

describe('source boundary of src/lib/console', () => {
  it('finds index.ts among the console source files', () => {
    expect(listConsoleSourceFiles()).toContain('index.ts');
  });

  it('has no specifier, identifier or call that leaves the console boundary', () => {
    expect(scanConsoleSources()).toEqual([]);
  });
});
