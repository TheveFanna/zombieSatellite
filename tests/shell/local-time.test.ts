// Feature: shell-pwa-deploy, Testing Strategy item 7: the Local_Time_Note
// **Validates: Requirement 10.3**
import { describe, expect, it } from 'vitest';
import { formatLocalTimeNote } from '../../src/lib/shell/index';

describe('formatLocalTimeNote', () => {
  it('shifts to UTC+8 across a date rollover', () => {
    expect(formatLocalTimeNote(Date.UTC(2026, 10, 9, 20, 5, 30), 480)).toBe('2026-11-10 04:05 (UTC+8)');
  });

  it('formats a negative offset', () => {
    expect(formatLocalTimeNote(Date.UTC(2026, 10, 9, 11, 18, 5), -300)).toBe('2026-11-09 06:18 (UTC-5)');
  });

  it('formats a half-hour offset', () => {
    expect(formatLocalTimeNote(Date.UTC(2026, 10, 9, 11, 18, 5), 330)).toBe('2026-11-09 16:48 (UTC+5:30)');
  });
});
