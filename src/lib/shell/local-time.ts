function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Local_Time_Note text such as "2026-11-09 19:18 (UTC+8)". `offsetMinutes` is east-positive
 * (480 → UTC+8, -300 → UTC-5, 330 → UTC+5:30). Pure: shifts the instant and reads UTC fields.
 */
export function formatLocalTimeNote(instantMs: number, offsetMinutes: number): string {
  const local = new Date(instantMs + offsetMinutes * 60_000);
  const date = `${String(local.getUTCFullYear())}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`;
  const time = `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`;
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const offset = minutes === 0 ? String(hours) : `${String(hours)}:${pad2(minutes)}`;
  return `${date} ${time} (UTC${sign}${offset})`;
}
