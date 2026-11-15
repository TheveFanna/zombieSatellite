import { cardFields, describeCard } from './card-model';
import { QSL_COPY } from './copy';
import type { CardModel } from './types';

export const CARD_WIDTH = 600;
export const CARD_HEIGHT = 380;

const BACKGROUND = '#0d1117';
const GREEN = '#2ea043';
const ORANGE = '#f0883e';
const VIOLET = '#a371f7';
const AMBER = '#d29922';
const GREY = '#8b949e';
const WHITE = '#f0f6fc';
const SANS = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

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

export function buildCardSvg(model: CardModel): string {
  const description = escapeXml(describeCard(model));
  const accent = model.demoMark ? ORANGE : GREEN;
  const frameDash = model.autoPointMark ? ' stroke-dasharray="8 6"' : '';

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${description}">`,
  );
  parts.push(`<title>${description}</title>`);
  // 1. background and frame
  parts.push(
    `<rect x="3" y="3" width="${CARD_WIDTH - 6}" height="${CARD_HEIGHT - 6}" rx="16" ry="16" fill="${BACKGROUND}" stroke="${accent}" stroke-width="3"${frameDash}/>`,
  );
  // 2. title
  parts.push(
    `<text x="28" y="38" font-family="${SANS}" font-size="14" fill="${GREY}">${escapeXml(QSL_COPY.cardTitle)}</text>`,
  );
  // 3. main badge, then auto-point badge
  if (model.demoMark) {
    parts.push(
      `<rect x="392" y="16" width="184" height="40" rx="8" ry="8" fill="${ORANGE}"/>`,
      `<text x="484" y="44" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="700" fill="${BACKGROUND}">${escapeXml(QSL_COPY.demoMark)}</text>`,
    );
  } else {
    parts.push(
      `<rect x="456" y="20" width="120" height="26" rx="13" ry="13" fill="${GREEN}"/>`,
      `<text x="516" y="38" text-anchor="middle" font-family="${SANS}" font-size="13" font-weight="700" fill="${BACKGROUND}">${escapeXml(QSL_COPY.realTimeMark)}</text>`,
    );
  }
  if (model.autoPointMark) {
    parts.push(
      `<rect x="456" y="66" width="120" height="26" rx="13" ry="13" fill="none" stroke="${VIOLET}" stroke-width="2" stroke-dasharray="5 3"/>`,
      `<text x="516" y="84" text-anchor="middle" font-family="${SANS}" font-size="13" font-weight="700" fill="${VIOLET}">${escapeXml(QSL_COPY.autoPointMark)}</text>`,
    );
  }
  // 4. name and NORAD id
  parts.push(
    `<text x="28" y="116" font-family="${SANS}" font-size="30" font-weight="700" fill="${WHITE}">${escapeXml(model.satelliteName)}</text>`,
    `<text x="28" y="142" font-family="${SANS}" font-size="15" fill="${GREY}">${escapeXml(`${QSL_COPY.noradLabel} ${model.noradId}`)}</text>`,
  );
  // 5. field rows, two columns of four
  cardFields(model).forEach((field, i) => {
    const x = i < 4 ? 28 : 316;
    const y = 184 + (i % 4) * 36;
    parts.push(
      `<text x="${x}" y="${y}" font-family="${SANS}" font-size="12" fill="${GREY}">${escapeXml(field.label)}</text>`,
      `<text x="${x}" y="${y + 17}" font-family="${MONO}" font-size="13" fill="${WHITE}">${escapeXml(field.value)}</text>`,
    );
  });
  // 6. simulated notice
  parts.push(
    `<line x1="28" y1="326" x2="${CARD_WIDTH - 28}" y2="326" stroke="${AMBER}" stroke-width="1"/>`,
    `<text x="28" y="346" font-family="${SANS}" font-size="13" fill="${AMBER}">${escapeXml(model.simulatedNotice[0])}</text>`,
    `<text x="28" y="364" font-family="${SANS}" font-size="13" fill="${AMBER}">${escapeXml(model.simulatedNotice[1])}</text>`,
  );
  parts.push('</svg>');
  return parts.join('');
}
