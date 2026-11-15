// Feature: ar-pointing, Property 1: Pointing source modules stay inside src/lib/pointing
// Validates: Requirements 1.2, 1.5
import { describe, expect, it } from 'vitest';
import { listPointingSourceFiles, scanPointingSources } from '../helpers/pointing-source-scan';

describe('source boundary of src/lib/pointing', () => {
  it('finds index.ts among the pointing source files', () => {
    expect(listPointingSourceFiles()).toContain('index.ts');
  });

  it('has no specifier that leaves the pointing directory', () => {
    expect(scanPointingSources()).toEqual([]);
  });
});
