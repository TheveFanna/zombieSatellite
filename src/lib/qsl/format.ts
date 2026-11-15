const EM_DASH = '\u2014';

export function formatElevation(deg: number): string {
  return `${deg.toFixed(1)}°`;
}

export function formatLockedDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes} min ${rest} s`;
}

export function formatLockedRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)} %`;
}

export function formatPointingError(deg: number | null): string {
  return deg === null ? EM_DASH : `${deg.toFixed(1)}°`;
}
