// Feature: shell-pwa-deploy, Testing Strategy item 1: shell core modules stay inside their boundary
// **Validates: Requirement 12.2**
import { describe, expect, it } from 'vitest';
import { listShellSourceFiles, scanShellSources } from '../helpers/shell-source-scan';

describe('source boundary of src/lib/shell', () => {
  it('finds index.ts among the shell source files', () => {
    expect(listShellSourceFiles()).toContain('index.ts');
  });

  it('has no specifier that leaves the shell boundary', () => {
    expect(scanShellSources()).toEqual([]);
  });
});
