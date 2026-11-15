// Feature: qsl-card, Property 1: QSL source modules stay inside their boundary
// **Validates: Requirements 1.2, 1.4**
import { describe, expect, it } from 'vitest';
import { listQslSourceFiles, scanQslSources } from '../helpers/qsl-source-scan';

describe('source boundary of src/lib/qsl', () => {
  it('finds index.ts among the QSL source files', () => {
    expect(listQslSourceFiles()).toContain('index.ts');
  });

  it('has no specifier that leaves the QSL boundary', () => {
    expect(scanQslSources()).toEqual([]);
  });
});
