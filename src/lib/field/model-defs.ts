import { box, merge, panel, prism, rod, sphere, translate } from './model-build';
import type { ModelGeometry } from './obj';

// Illustrative_Models: vector sketches drawn from public descriptions (docs/reference/MODELS.md, "Shape sources").
// Where no description gave a shape, the model is a sphere (the owner's fallback). Metres, Y is the axis.
//   AO-7: octagonal prism 0.424 m across, 0.36 m high; four radio masts at the base (documented).
//   Prospero: ten-sided body 1.2 m across, 0.7 m high, four antennas (documented).
//   LES-1: 26-face bus of 0.61 m diameter, approximated by a twelve-sided prism, eight horns on top (documented).
//   LES-5: cylinder with a platform near the centre and antenna elements around the surface (documented).
//   IMAGE: spin-stabilised drum with two long horizontal booms (documented 2.25 m x 1.52 m; booms not to scale).
//   Galaxy 15: GEOStar-2 bus (octagonal approximation) with two solar wings and a reflector dish (documented).
//   Transit 5B-5: no shape found in the sources read; drawn as a sphere.
const ao7 = merge(
  prism(8, 0.212, 0.36),
  translate(rod(0.3, 0.012), 0.15, -0.33, 0),
  translate(rod(0.3, 0.012), -0.15, -0.33, 0),
  translate(rod(0.3, 0.012), 0, -0.33, 0.15),
  translate(rod(0.3, 0.012), 0, -0.33, -0.15),
  translate(box(0.5, 0.01, 0.01), 0, 0.22, 0),
  translate(box(0.01, 0.01, 0.5), 0, 0.22, 0),
);

const prospero = merge(
  prism(10, 0.6, 0.7),
  translate(rod(0.7, 0.02), 0.5, 0.5, 0),
  translate(rod(0.7, 0.02), -0.5, 0.5, 0),
  translate(rod(0.7, 0.02), 0, 0.5, 0.5),
  translate(rod(0.7, 0.02), 0, 0.5, -0.5),
);

const les1 = merge(
  prism(12, 0.305, 0.42),
  translate(rod(0.12, 0.02), 0.2, 0.27, 0),
  translate(rod(0.12, 0.02), -0.2, 0.27, 0),
  translate(rod(0.12, 0.02), 0, 0.27, 0.2),
  translate(rod(0.12, 0.02), 0, 0.27, -0.2),
);

const transit5b5 = sphere(0.3, 6, 12);

const image = merge(
  prism(8, 0.76, 1.1),
  translate(box(3.0, 0.03, 0.03), 0, 0, 0),
  translate(box(0.03, 0.03, 3.0), 0, 0, 0),
  translate(panel(0.9, 0.6), 0, 0.6, 0.76),
);

const galaxy15 = merge(
  prism(8, 1.1, 1.6),
  translate(panel(5.5, 1.8, 0.04), 3.6, 0, 0),
  translate(panel(5.5, 1.8, 0.04), -3.6, 0, 0),
  translate(prism(16, 0.7, 0.05), 0, 0.85, 0),
  translate(rod(0.6, 0.03), 0, 1.15, 0),
);

const les5 = merge(
  prism(16, 0.45, 0.8),
  translate(prism(16, 0.5, 0.03), 0, 0.42, 0),
  ...[0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return translate(box(0.04, 0.3, 0.12), 0.47 * Math.cos(a), 0, 0.47 * Math.sin(a));
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