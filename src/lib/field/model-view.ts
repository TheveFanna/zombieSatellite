import type { ModelGeometry } from './obj';
import { DEFAULT_FACE_COLOR } from './model-build';

export interface ModelLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
}

/** A front-facing face ready to fill: screen points, shaded colour and depth (0 far, 1 near). */
export interface ShadedFace {
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly fill: string;
  readonly depth: number;
}

/** Unique edges of the faces, as ordered vertex index pairs. */
export function modelEdges(model: ModelGeometry): readonly (readonly [number, number])[] {
  const seen = new Set<number>();
  const count = model.vertices.length / 3;
  const edges: [number, number][] = [];
  for (const face of model.faces) {
    for (let i = 0; i < face.length; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const key = lo * count + hi;
      if (lo === hi || seen.has(key)) continue;
      seen.add(key);
      edges.push([lo, hi]);
    }
  }
  return edges;
}

/**
 * Rotation about the vertical axis by yawRad, fixed tilt pitchRad, perspective divide with a
 * camera distance of three model radii. depth is 0 (far) to 1 (near). Canvas y points down.
 */
export function projectModel(
  model: ModelGeometry,
  yawRad: number,
  pitchRad: number,
  viewHalfSize: number,
): ModelLine[] {
  const v = model.vertices;
  let radius = 0;
  for (let i = 0; i < v.length; i += 3) radius = Math.max(radius, Math.hypot(v[i], v[i + 1], v[i + 2]));
  if (radius === 0) return [];
  const cy = Math.cos(yawRad);
  const sy = Math.sin(yawRad);
  const cp = Math.cos(pitchRad);
  const sp = Math.sin(pitchRad);
  const camera = 3 * radius;
  const unit = viewHalfSize / (radius * 1.5);
  const pts: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < v.length; i += 3) {
    const x1 = v[i] * cy + v[i + 2] * sy;
    const z1 = -v[i] * sy + v[i + 2] * cy;
    const y2 = v[i + 1] * cp - z1 * sp;
    const z2 = v[i + 1] * sp + z1 * cp;
    const k = camera / (camera - z2);
    pts.push({ x: x1 * k * unit, y: -y2 * k * unit, d: (z2 / radius + 1) / 2 });
  }
  return modelEdges(model).map(([a, b]) => ({
    x1: pts[a].x,
    y1: pts[a].y,
    x2: pts[b].x,
    y2: pts[b].y,
    depth: Math.min(1, Math.max(0, (pts[a].d + pts[b].d) / 2)),
  }));
}

// Light from the upper left and the front; the half vector gives the highlight.
const LIGHT = normalize3(-0.45, 0.75, 0.55);
const HALF = normalize3(LIGHT[0], LIGHT[1], LIGHT[2] + 1);

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const n = Math.hypot(x, y, z) || 1;
  return [x / n, y / n, z / n];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Filled, lit faces of the model in the same view as projectModel. Only faces that point at the
 * viewer are returned (the models are closed or thin), sorted far to near for the painter's order.
 * A face normal is flipped when it points toward the origin, so the winding of the source does not matter.
 */
export function shadeModel(
  model: ModelGeometry,
  yawRad: number,
  pitchRad: number,
  viewHalfSize: number,
): ShadedFace[] {
  const v = model.vertices;
  let radius = 0;
  for (let i = 0; i < v.length; i += 3) radius = Math.max(radius, Math.hypot(v[i], v[i + 1], v[i + 2]));
  if (radius === 0) return [];
  const cy = Math.cos(yawRad);
  const sy = Math.sin(yawRad);
  const cp = Math.cos(pitchRad);
  const sp = Math.sin(pitchRad);
  const camera = 3 * radius;
  const unit = viewHalfSize / (radius * 1.5);

  // View-space coordinates before the perspective divide.
  const rot: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < v.length; i += 3) {
    const x1 = v[i] * cy + v[i + 2] * sy;
    const z1 = -v[i] * sy + v[i + 2] * cy;
    const y2 = v[i + 1] * cp - z1 * sp;
    const z2 = v[i + 1] * sp + z1 * cp;
    rot.push({ x: x1, y: y2, z: z2 });
  }

  const out: ShadedFace[] = [];
  model.faces.forEach((face, f) => {
    if (face.length < 3) return;
    const a = rot[face[0]];
    const b = rot[face[1]];
    const c = rot[face[2]];
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const uz = b.z - a.z;
    const wx = c.x - a.x;
    const wy = c.y - a.y;
    const wz = c.z - a.z;
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) return;
    nx /= len;
    ny /= len;
    nz /= len;
    // Outward: the normal and the face centre (both in view space) point the same way.
    let centreX = 0;
    let centreY = 0;
    let centreZ = 0;
    for (const i of face) {
      centreX += rot[i].x;
      centreY += rot[i].y;
      centreZ += rot[i].z;
    }
    centreX /= face.length;
    centreY /= face.length;
    centreZ /= face.length;
    if (nx * centreX + ny * centreY + nz * centreZ < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    if (nz <= 0) return;

    const lambert = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const specular = Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), 28) * 0.4;
    const shade = 0.32 + 0.68 * lambert;
    const [r, g, b2] = hexToRgb(model.colors?.[f] ?? DEFAULT_FACE_COLOR);
    const channel = (value: number) => Math.round(Math.min(255, value * shade + 255 * specular));
    const fill = `rgb(${channel(r)}, ${channel(g)}, ${channel(b2)})`;

    let depthSum = 0;
    const points = face.map((i) => {
      const p = rot[i];
      const k = camera / (camera - p.z);
      depthSum += (p.z / radius + 1) / 2;
      return { x: p.x * k * unit, y: -p.y * k * unit };
    });
    out.push({ points, fill, depth: depthSum / face.length });
  });
  out.sort((p, q) => p.depth - q.depth);
  return out;
}
