import { box, merge, panel, prism, rod, translate } from './model-build';
import type { ModelGeometry } from './obj';

// Illustrative_Models: simplified shapes from approximate documented dimensions (metres).
// Only Prospero (1.2 m diameter, 0.7 m height, 4 antennas) has dimensions read from a page.
// The other six are schematic, dimensions not confirmed. Sources: docs/reference/MODELS.md, models.ts.

const les1 = merge(
  prism(8, 0.45, 0.35),
  translate(rod(0.6), 0, 0.47, 0),
  translate(panel(0.5, 0.2), 0.7, 0, 0),
  translate(panel(0.5, 0.2), -0.7, 0, 0),
);

const transit5b5 = merge(
  prism(8, 0.25, 0.25),
  translate(panel(0.7, 0.3), 0.5, 0.05, 0),
  translate(panel(0.7, 0.3), -0.5, 0.05, 0),
  translate(panel(0.3, 0.7), 0, 0.05, 0.5),
  translate(panel(0.3, 0.7), 0, 0.05, -0.5),
  translate(rod(1.8, 0.03), 0, -1.05, 0),
);

const ao7 = merge(
  prism(8, 0.2, 0.3),
  translate(panel(0.5, 0.35), 0.45, 0, 0),
  translate(panel(0.5, 0.35), -0.45, 0, 0),
  translate(rod(0.5, 0.01), 0, 0.4, 0),
  translate(rod(0.4, 0.01), 0.15, -0.35, 0.15),
);

const prospero = merge(
  prism(8, 0.6, 0.7),
  translate(rod(0.7, 0.02), 0.5, 0.5, 0),
  translate(rod(0.7, 0.02), -0.5, 0.5, 0),
  translate(rod(0.7, 0.02), 0, 0.5, 0.5),
  translate(rod(0.7, 0.02), 0, 0.5, -0.5),
);

const image = merge(
  prism(8, 1.1, 0.5),
  translate(box(0.5, 0.5, 0.5), 0, 0.5, 0),
  translate(rod(1.8, 0.03), 1.6, 0, 0),
  translate(rod(1.8, 0.03), -1.6, 0, 0),
  translate(panel(0.9, 0.6), 0, -0.3, 1.0),
);

const galaxy15 = merge(
  box(1.8, 1.6, 2.0),
  translate(panel(5.5, 1.8, 0.04), 3.6, 0, 0),
  translate(panel(5.5, 1.8, 0.04), -3.6, 0, 0),
  translate(rod(0.8), 0, 1.2, 0),
);

const les5 = merge(
  prism(8, 0.3, 0.5),
  translate(rod(0.8, 0.02), 0, 0.65, 0),
  translate(panel(0.4, 0.3), 0.55, 0, 0),
  translate(panel(0.4, 0.3), -0.55, 0, 0),
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
