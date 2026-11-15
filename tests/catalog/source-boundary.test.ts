// Feature: zombie-catalog, Property 4: Every catalog specifier stays inside the catalog directory
// Validates: Requirements 8.1, 8.2
import { describe, expect, it } from 'vitest';
import { listCatalogSourceFiles, scanCatalogSources } from '../helpers/catalog-source-scan';

describe('source boundary of src/lib/catalog', () => {
  it('finds index.ts among the catalog source files', () => {
    expect(listCatalogSourceFiles()).toContain('index.ts');
  });

  it('has no specifier that leaves the catalog directory', () => {
    expect(scanCatalogSources()).toEqual([]);
  });
});
