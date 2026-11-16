// Feature: field-companion, Testing Strategy: Field_Core modules stay inside their boundary
// **Validates: Requirements 1.3, 1.4**
import { describe, expect, it } from 'vitest';
import { listFieldSourceFiles, scanFieldSources } from '../helpers/field-source-scan';

describe('source boundary of src/lib/field', () => {
  it('finds index.ts among the field source files', () => {
    expect(listFieldSourceFiles()).toContain('index.ts');
  });

  it('has no specifier, identifier or call that leaves the field boundary', () => {
    expect(scanFieldSources()).toEqual([]);
  });
});
