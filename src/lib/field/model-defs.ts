import { box, merge, paint, panel, prism, rod, sphere, translate } from './model-build';
import type { ModelGeometry } from './obj';

// Illustrative_Models: vector sketches drawn from public descriptions (docs/reference/MODELS.md, "Shape sources").
// Where no description gave a shape, the model is a sphere (the owner's fallback). Metres, Y is the axis.
// Colours follow the parts: gold foil, silver structure, blue solar cells, white reflector.
const FOIL = '#d4b06a';
const SILVER = '#c9d1db';
const LIGHT = '#eef2f7';
const SOLAR = '#2b4f8c';
const DISH = '#f4f6f9';

const ao7 = merge(
  paint(prism(8, 0.212, 0.36), FOIL),
  translate(paint(rod(0.3, 0.012), LIGHT), 0.15, -0.33, 0),
  translate(paint(rod(0.3, 0.012), LIGHT), -0.15, -0.33, 0),
  translate(paint(rod(0.3, 0.012), LIGHT), 0, -0.33, 0.15),
  translate(paint(rod(0.3, 0.012), LIGHT), 0, -0.33, -0.15),
  translate(paint(box(0.5, 0.01, 0.01), LIGHT), 0, 0.22, 0),
  translate(paint(box(0.01, 0.01, 0.5), LIGHT), 0, 0.22, 0),
);

const prospero = merge(
  paint(prism(10, 0.6, 0.7), SILVER),
  translate(paint(rod(0.7, 0.02), LIGHT), 0.5, 0.5, 0),
  translate(paint(rod(0.7, 0.02), LIGHT), -0.5, 0.5, 0),
  translate(paint(rod(0.7, 0.02), LIGHT), 0, 0.5, 0.5),
  translate(paint(rod(0.7, 0.02), LIGHT), 0, 0.5, -0.5),
);

const les1 = merge(
  paint(prism(12, 0.305, 0.42), SOLAR),
  translate(paint(rod(0.12, 0.02), LIGHT), 0.2, 0.27, 0),
  translate(paint(rod(0.12, 0.02), LIGHT), -0.2, 0.27, 0),
  translate(paint(rod(0.12, 0.02), LIGHT), 0, 0.27, 0.2),
  translate(paint(rod(0.12, 0.02), LIGHT), 0, 0.27, -0.2),
);

const transit5b5 = paint(sphere(0.3, 6, 12), SILVER);

const image = merge(
  paint(prism(8, 0.76, 1.1), SILVER),
  translate(paint(box(3.0, 0.03, 0.03), LIGHT), 0, 0, 0),
  translate(paint(box(0.03, 0.03, 3.0), LIGHT), 0, 0, 0),
  translate(paint(panel(0.9, 0.6), SOLAR), 0, 0.6, 0.76),
);

const galaxy15 = merge(
  paint(prism(8, 1.1, 1.6), SILVER),
  translate(paint(panel(5.5, 1.8, 0.04), SOLAR), 3.6, 0, 0),
  translate(paint(panel(5.5, 1.8, 0.04), SOLAR), -3.6, 0, 0),
  translate(paint(prism(16, 0.7, 0.05), DISH), 0, 0.85, 0),
  translate(paint(rod(0.6, 0.03), LIGHT), 0, 1.15, 0),
);

const les5 = merge(
  paint(prism(16, 0.45, 0.8), SILVER),
  translate(paint(prism(16, 0.5, 0.03), LIGHT), 0, 0.42, 0),
  ...[0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return translate(paint(box(0.04, 0.3, 0.12), FOIL), 0.47 * Math.cos(a), 0, 0.47 * Math.sin(a));
  }),
);

export const ILLUSTRATIVE_MODELS: Readonly<Record<string, ModelGeometry>> = {
  'les-1': les1,
  'transit-5b-5': transit5b5,
  'ao-7': ao7,
  prospero,
  image,
  'galaxy-15': galaxy15,
  'les-5': les5,
};
