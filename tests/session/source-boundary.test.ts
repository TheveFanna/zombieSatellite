// Feature: seance-session, Property 1: Session source modules stay inside their boundary
// **Validates: Requirements 1.2, 1.5**
import { describe, expect, it } from 'vitest';
import { listSessionSourceFiles, scanSessionSources } from '../helpers/session-source-scan';

describe('source boundary of src/lib/session', () => {
  it('finds index.ts among the session source files', () => {
    expect(listSessionSourceFiles()).toContain('index.ts');
  });

  it('has no specifier that leaves the session boundary', () => {
    expect(scanSessionSources()).toEqual([]);
  });
});
