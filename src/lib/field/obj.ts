// Wavefront OBJ subset: v and f lines only. Faces hold 0-based vertex indices.
export interface ModelGeometry {
  readonly vertices: readonly number[];
  readonly faces: readonly (readonly number[])[];
  /** Optional colour per face (hex). The OBJ file does not carry it; the viewer uses it. */
  readonly colors?: readonly string[];
}

/** Parses v and f lines; returns null when the text holds no usable face. */
export function parseObj(text: string): ModelGeometry | null {
  const vertices: number[] = [];
  const faces: number[][] = [];
  for (const raw of text.split(/\r?\n/)) {
    const parts = raw.trim().split(/\s+/);
    if (parts[0] === 'v' && parts.length >= 4) {
      const xyz = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
      if (xyz.some((n) => !Number.isFinite(n))) return null;
      vertices.push(...xyz);
    } else if (parts[0] === 'f' && parts.length >= 4) {
      const count = vertices.length / 3;
      const face: number[] = [];
      for (const token of parts.slice(1)) {
        const raw = Number.parseInt(token.split('/')[0], 10);
        if (!Number.isInteger(raw) || raw === 0) return null;
        const index = raw > 0 ? raw - 1 : count + raw;
        if (index < 0 || index >= count) return null;
        face.push(index);
      }
      faces.push(face);
    }
  }
  return faces.length === 0 ? null : { vertices, faces };
}

/** Writes comment header lines, then v and f lines with 1-based indices. */
export function serializeObj(model: ModelGeometry, headerLines: readonly string[]): string {
  const lines = headerLines.map((line) => `# ${line}`);
  for (let i = 0; i < model.vertices.length; i += 3) {
    const [x, y, z] = [model.vertices[i], model.vertices[i + 1], model.vertices[i + 2]];
    lines.push(`v ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`);
  }
  for (const face of model.faces) lines.push(`f ${face.map((i) => i + 1).join(' ')}`);
  return `${lines.join('\n')}\n`;
}
