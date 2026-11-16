import { cardFields, describeCard } from './card-model';
import { QSL_COPY } from './copy';
import type { CardModel } from './types';

export const CARD_WIDTH = 600;
export const CARD_HEIGHT = 380;

const INK_TOP = '#0c1528';
const INK_BOTTOM = '#05070d';
const BONE = '#f0ead8';
const GREY = '#9aa3b2';
const REAL_ACCENT = '#7ee7b0';
const DEMO_ACCENT = '#e3a982';
const AMBER = '#d29922';
const VIOLET = '#b994f5';
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const SANS = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Engraving centre, right of the text column. */
const ART_CX = 470;
const ART_CY = 200;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Seeded generator (mulberry32): the same seed always gives the same artwork. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Engraved rosette curves: sine-modulated rings drawn as thin lines. */
function rosettes(rnd: () => number): string {
  const paths: string[] = [];
  for (let k = 0; k < 11; k += 1) {
    const petals = 5 + Math.floor(rnd() * 5);
    const base = 34 + k * 13;
    const amp = 5 + rnd() * 9;
    const phase = rnd() * Math.PI * 2;
    const points: string[] = [];
    for (let t = 0; t <= 360; t += 5) {
      const rad = (t * Math.PI) / 180;
      const r = base + amp * Math.sin(petals * rad + phase);
      const x = ART_CX + r * Math.cos(rad);
      const y = ART_CY + r * 0.58 * Math.sin(rad);
      points.push(`${points.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    paths.push(`<path d="${points.join(' ')}" fill="none" stroke="rgba(233,228,216,0.075)" stroke-width="0.7"/>`);
  }
  return paths.join('');
}

/** A tilted orbit ellipse with a satellite on it, drawn in the accent colour. */
function orbit(rnd: () => number, accent: string): string {
  const tilt = -22;
  const rx = 168;
  const ry = 58;
  const phi = (tilt * Math.PI) / 180;
  const theta = rnd() * Math.PI * 2;
  const x = ART_CX + rx * Math.cos(theta) * Math.cos(phi) - ry * Math.sin(theta) * Math.sin(phi);
  const y = ART_CY + rx * Math.cos(theta) * Math.sin(phi) + ry * Math.sin(theta) * Math.cos(phi);
  return [
    `<ellipse cx="${ART_CX}" cy="${ART_CY}" rx="${rx}" ry="${ry}" transform="rotate(${tilt} ${ART_CX} ${ART_CY})" fill="none" stroke="${accent}" stroke-opacity="0.32" stroke-width="1"/>`,
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${accent}" fill-opacity="0.18"/>`,
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${accent}"/>`,
  ].join('');
}

/** Fixed star field: small dots at seeded positions. */
function stars(rnd: () => number): string {
  const out: string[] = [];
  for (let i = 0; i < 70; i += 1) {
    const x = (rnd() * CARD_WIDTH).toFixed(1);
    const y = (rnd() * CARD_HEIGHT).toFixed(1);
    const r = (0.3 + rnd() * 0.9).toFixed(2);
    const o = (0.15 + rnd() * 0.5).toFixed(2);
    out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${BONE}" fill-opacity="${o}"/>`);
  }
  return out.join('');
}

export function buildCardSvg(model: CardModel): string {
  const description = escapeXml(describeCard(model));
  const accent = model.demoMark ? DEMO_ACCENT : REAL_ACCENT;
  const rnd = seededRandom(model.noradId);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${description}">`,
  );
  parts.push(`<title>${description}</title>`);

  // 1. background: ink gradient, a soft glow in the accent colour, the generated artwork
  parts.push(
    `<defs>` +
      `<linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${INK_TOP}"/><stop offset="1" stop-color="${INK_BOTTOM}"/></linearGradient>` +
      `<radialGradient id="glow" cx="${ART_CX}" cy="${ART_CY}" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${accent}" stop-opacity="0.16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>` +
      `</defs>`,
  );
  parts.push(`<rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" fill="url(#ink)"/>`);
  parts.push(`<rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" fill="url(#glow)"/>`);
  parts.push(stars(rnd));
  parts.push(rosettes(rnd));
  parts.push(orbit(rnd, accent));

  // 2. frame: an outer accent line, an inner hairline and corner jewels
  parts.push(
    `<rect x="10" y="10" width="${CARD_WIDTH - 20}" height="${CARD_HEIGHT - 20}" rx="12" fill="none" stroke="${accent}" stroke-width="1.2"/>`,
    `<rect x="17" y="17" width="${CARD_WIDTH - 34}" height="${CARD_HEIGHT - 34}" rx="8" fill="none" stroke="rgba(233,228,216,0.16)" stroke-width="0.8"/>`,
  );
  for (const [x, y] of [
    [17, 17],
    [CARD_WIDTH - 17, 17],
    [17, CARD_HEIGHT - 17],
    [CARD_WIDTH - 17, CARD_HEIGHT - 17],
  ]) {
    parts.push(`<circle cx="${x}" cy="${y}" r="2.2" fill="${accent}"/>`);
  }

  // 3. title and mark badges
  parts.push(
    `<text x="28" y="40" font-family="${SANS}" font-size="12" letter-spacing="2.4" fill="${GREY}">${escapeXml(QSL_COPY.cardTitle)}</text>`,
  );
  if (model.demoMark) {
    parts.push(
      `<rect x="392" y="18" width="184" height="36" rx="18" ry="18" fill="${DEMO_ACCENT}"/>`,
      `<text x="484" y="42" text-anchor="middle" font-family="${SANS}" font-size="20" font-weight="700" fill="${INK_BOTTOM}">${escapeXml(QSL_COPY.demoMark)}</text>`,
    );
  } else {
    parts.push(
      `<rect x="456" y="22" width="120" height="26" rx="13" ry="13" fill="${REAL_ACCENT}"/>`,
      `<text x="516" y="40" text-anchor="middle" font-family="${SANS}" font-size="13" font-weight="700" fill="${INK_BOTTOM}">${escapeXml(QSL_COPY.realTimeMark)}</text>`,
    );
  }
  if (model.autoPointMark) {
    parts.push(
      `<rect x="456" y="60" width="120" height="26" rx="13" ry="13" fill="none" stroke="${VIOLET}" stroke-width="1.4"/>`,
      `<text x="516" y="78" text-anchor="middle" font-family="${SANS}" font-size="13" font-weight="700" fill="${VIOLET}">${escapeXml(QSL_COPY.autoPointMark)}</text>`,
    );
  }

  // 4. name, NORAD id and a divider
  parts.push(
    `<text x="28" y="118" font-family="${SERIF}" font-size="31" font-weight="600" fill="${BONE}">${escapeXml(model.satelliteName)}</text>`,
    `<text x="28" y="142" font-family="${MONO}" font-size="13" letter-spacing="1.2" fill="${accent}">${escapeXml(`${QSL_COPY.noradLabel} ${model.noradId}`)}</text>`,
    `<line x1="28" y1="158" x2="330" y2="158" stroke="${accent}" stroke-opacity="0.45" stroke-width="0.8"/>`,
  );

  // 5. field rows, two columns of four
  cardFields(model).forEach((field, i) => {
    const x = i < 4 ? 28 : 316;
    const y = 186 + (i % 4) * 34;
    parts.push(
      `<text x="${x}" y="${y}" font-family="${SANS}" font-size="11" letter-spacing="1" fill="${GREY}">${escapeXml(field.label)}</text>`,
      `<text x="${x}" y="${y + 17}" font-family="${MONO}" font-size="13" fill="${BONE}">${escapeXml(field.value)}</text>`,
    );
  });

  // 6. simulated notice in a band
  parts.push(
    `<rect x="28" y="318" width="544" height="40" rx="8" ry="8" fill="${AMBER}" fill-opacity="0.08" stroke="${AMBER}" stroke-opacity="0.35" stroke-width="0.8"/>`,
    `<text x="40" y="336" font-family="${SANS}" font-size="12" fill="${AMBER}">${escapeXml(model.simulatedNotice[0])}</text>`,
    `<text x="40" y="351" font-family="${SANS}" font-size="12" fill="${AMBER}">${escapeXml(model.simulatedNotice[1])}</text>`,
  );
  parts.push('</svg>');
  return parts.join('');
}
