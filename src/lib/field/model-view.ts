import type { ModelGeometry } from './obj';

export interface ModelLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
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
