// Feature: ar-pointing, Property 12: Permission transitions
// **Validates: Requirements 11.12, 11.13**
import { describe, expect, it } from 'vitest';
import {
  permissionTransition,
  type PermissionEvent,
  type PermissionState,
} from '../../src/lib/pointing/index';

const rows: ReadonlyArray<[PermissionState, PermissionEvent, PermissionState]> = [
  ['unknown', 'request-started', 'requesting'],
  ['denied', 'request-started', 'requesting'],
  ['requesting', 'permission-granted', 'granted'],
  ['requesting', 'permission-denied', 'denied'],
  ['requesting', 'permission-error', 'unknown'],
  ['unknown', 'no-permission-api', 'granted'],
  ['granted', 'no-sample-timeout', 'unavailable'],
  ['unavailable', 'valid-sample-arrived', 'granted'],
  ['granted', 'request-started', 'granted'],
];

describe('Property 12: Permission transitions', () => {
  it.each(rows)('%s + %s -> %s', (state, event, expected) => {
    expect(permissionTransition(state, event)).toBe(expected);
  });
});
