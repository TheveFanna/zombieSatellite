import type { NoradId } from '../catalog/index';

export function passNumber(noradId: NoradId, aosMs: number): string {
  return `ZS-${String(noradId).padStart(5, '0')}-${aosMs.toString(36).toUpperCase()}`;
}
