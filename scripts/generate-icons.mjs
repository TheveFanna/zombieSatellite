// Generates the App_Icons of zombieSatellite (S6 design "App icons") with Node built-ins only.
// Run: node scripts/generate-icons.mjs   Output: public/icons/icon-192.png, icon-512.png, apple-touch-icon.png
// Drawing, in units of the icon side s, centre (0.5, 0.5): background #05070d (night); orbit ring of radius
// 0.30s and width 0.035s in #c9a66b (brass); planet disk of radius 0.12s in #e9e4d8 (bone); satellite disk of radius
// 0.07s in #a8f0cf (phosphor) on the ring at 45 degrees (upper right). Everything lies inside the 0.40s maskable
// safe zone. Edges use 4x4 supersampling.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const BACKGROUND = [0x05, 0x07, 0x0d];
const GREY = [0xc9, 0xa6, 0x6b];
const WHITE = [0xe9, 0xe4, 0xd8];
const GREEN = [0xa8, 0xf0, 0xcf];

const RING_RADIUS = 0.3;
const RING_WIDTH = 0.035;
const PLANET_RADIUS = 0.12;
const SATELLITE_RADIUS = 0.07;
const SATELLITE_ANGLE = Math.PI / 4;
const SATELLITE_X = 0.5 + RING_RADIUS * Math.cos(SATELLITE_ANGLE);
const SATELLITE_Y = 0.5 - RING_RADIUS * Math.sin(SATELLITE_ANGLE);
const SAMPLES = 4;

/** Colour of one point in unit coordinates, topmost shape first. */
function colourAt(x, y) {
  if (Math.hypot(x - SATELLITE_X, y - SATELLITE_Y) <= SATELLITE_RADIUS) return GREEN;
  const r = Math.hypot(x - 0.5, y - 0.5);
  if (r <= PLANET_RADIUS) return WHITE;
  if (Math.abs(r - RING_RADIUS) <= RING_WIDTH / 2) return GREY;
  return BACKGROUND;
}

/** RGB pixel rows, each prefixed with PNG filter byte 0. */
function render(size) {
  const rowLength = 1 + size * 3;
  const raw = Buffer.alloc(rowLength * size);
  for (let py = 0; py < size; py++) {
    raw[py * rowLength] = 0;
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const c = colourAt((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
        }
      }
      const offset = py * rowLength + 1 + px * 3;
      for (let i = 0; i < 3; i++) raw[offset + i] = Math.round(sum[i] / (SAMPLES * SAMPLES));
    }
  }
  return raw;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type RGB
  header[10] = 0; // compression
  header[11] = 0; // filter
  header[12] = 0; // no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(render(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), png(size));
  console.log(`wrote public/icons/${name} (${size}x${size})`);
}
