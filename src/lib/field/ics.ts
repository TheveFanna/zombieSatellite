import type { Pass } from '../orbit/index';
import { formatUtc } from '../session/index';
import { CALENDAR_ALARM_MIN } from './constants';
import { FIELD_COPY } from './copy';
import type { IlluminationProfile } from './illumination';

const CRLF = '\r\n';
const encoder = new TextEncoder();

/** `YYYYMMDDTHHMMSSZ` from the formatUtc digits. */
function icsInstant(ms: number): string {
  const d = formatUtc(ms).replace(/\D/g, '');
  return `${d.slice(0, 8)}T${d.slice(8, 14)}Z`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold at 75 octets (UTF-8), never inside a code point; continuation lines start with one space. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(current);
      current = ' ';
      bytes = 1;
      limit = 75;
    }
    current += ch;
    bytes += n;
  }
  parts.push(current);
  return parts.join(CRLF);
}

function illuminationText(profile: IlluminationProfile): string[] {
  switch (profile.kind) {
    case 'sunlit':
      return [FIELD_COPY.illuminationSunlit];
    case 'shadowed':
      return [FIELD_COPY.illuminationShadowed];
    case 'unavailable':
      return [FIELD_COPY.illuminationUnknown];
    case 'partly':
      return [
        FIELD_COPY.illuminationPartly,
        ...profile.transitions.map(
          (t) =>
            `${t.kind === 'entry' ? FIELD_COPY.shadowEntryLabel : FIELD_COPY.shadowExitLabel}: ${formatUtc(t.atMs)}`,
        ),
      ];
  }
}

export function buildCalendarEvent(input: {
  entry: { slug: string; name: string; noradId: number; displayFrequency: string | null };
  pass: Pass;
  aosAzimuthDeg: number;
  losAzimuthDeg: number;
  profile: IlluminationProfile;
  stampMs: number;
}): string {
  const { entry, pass, aosAzimuthDeg, losAzimuthDeg, profile, stampMs } = input;
  const description = [
    `${FIELD_COPY.calendarMaxElevation}: ${pass.maxElevationDeg.toFixed(1)}°`,
    `${FIELD_COPY.calendarAosAzimuth}: ${aosAzimuthDeg.toFixed(0)}°`,
    `${FIELD_COPY.calendarLosAzimuth}: ${losAzimuthDeg.toFixed(0)}°`,
    entry.displayFrequency !== null
      ? `${FIELD_COPY.calendarFrequency}: ${entry.displayFrequency}`
      : FIELD_COPY.noFrequencyNote,
    ...illuminationText(profile).map((t, i) => (i === 0 ? `${FIELD_COPY.calendarIllumination}: ${t}` : t)),
    FIELD_COPY.calendarSimulatedNote,
  ]
    .map(escapeText)
    .join('\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//zombieSatellite//field-companion//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${entry.noradId}-${pass.riseMs}@zombiesatellite`,
    `DTSTAMP:${icsInstant(stampMs)}`,
    `DTSTART:${icsInstant(pass.riseMs)}`,
    `DTEND:${icsInstant(pass.setMs)}`,
    `SUMMARY:${escapeText(`${entry.name}${FIELD_COPY.calendarSummarySuffix}`)}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(FIELD_COPY.calendarAlarmText)}`,
    `TRIGGER:-PT${CALENDAR_ALARM_MIN}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}

/** `zombiesatellite-<slug>-<yyyymmddhhmm>.ics` from the AOS instant. */
export function calendarFileName(slug: string, riseMs: number): string {
  const stamp = formatUtc(riseMs).replace(/\D/g, '').slice(0, 12);
  return `zombiesatellite-${slug}-${stamp}.ics`;
}
