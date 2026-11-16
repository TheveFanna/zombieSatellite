import type { ModelGeometry } from './obj';

// Primitive builders. Metres, Y up, centred on the origin.

/** Axis-aligned box of width w (x), height h (y), depth d (z). */
export function box(w: number, h: number, d: number): ModelGeometry {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  return {
    vertices: [-x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z, -x, -y, z, x, -y, z, x, y, z, -x, y, z],
    faces: [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [3, 7, 6, 2],
      [0, 4, 7, 3],
      [1, 2, 6, 5],
    ],
  };
}

/** Regular n-gon prism along Y. */
export function prism(n: number, radius: number, height: number): ModelGeometry {
  const vertices: number[] = [];
  for (const y of [-height / 2, height / 2]) {
    for (let i = 0; i < n; i += 1) {
      const a = (2 * Math.PI * i) / n;
      vertices.push(radius * Math.cos(a), y, radius * Math.sin(a));
    }
  }
  const faces: number[][] = [
    Array.from({ length: n }, (_, i) => n - 1 - i),
    Array.from({ length: n }, (_, i) => n + i),
  ];
  for (let i = 0; i < n; i += 1) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  return { vertices, faces };
}

/** Thin flat panel: width w (x), depth d (z), thickness t (y). */
export function panel(w: number, d: number, t = 0.02): ModelGeometry {
  return box(w, t, d);
}

/** Thin square rod of the given length along Y. */
export function rod(length: number, thickness = 0.02): ModelGeometry {
  return box(thickness, length, thickness);
}

export function translate(model: ModelGeometry, dx: number, dy: number, dz: number): ModelGeometry {
  const vertices = model.vertices.map((value, i) => value + [dx, dy, dz][i % 3]);
  return { vertices, faces: model.faces };
}

export function merge(...models: readonly ModelGeometry[]): ModelGeometry {
  const vertices: number[] = [];
  const faces: number[][] = [];
  for (const model of models) {
    const base = vertices.length / 3;
    vertices.push(...model.vertices);
    for (const face of model.faces) faces.push(face.map((i) => i + base));
  }
  return { vertices, faces };
}
