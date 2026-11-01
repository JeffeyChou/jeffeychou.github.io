import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
} from 'three';

/**
 * Glyphs the creatures are drawn with. Order does not matter: a cell whose coverage has an edge in it
 * picks the glyph whose ink sits in the same 2×3 regions (so outlines get / \\ | _ ( ) ' ,), and a
 * flat cell picks by tone among FILL only. Index 0 must stay the space.
 * Punctuation and symbols plus i and v. Capitals, digits and most letters (I, 8, x, c, o…) read as
 * text at this size, so runs of them made the creature look like a page of type.
 */
export const GLYPHS = " .,'`-_:;!~\"^=+*/\\|()[]{}<>iv#%@";
/** Glyphs allowed in flat (edge-free) cells: a tone ramp, as before, just finer. */
export const FILL = ' .,:;-=+*!#%@';
/** Glyphs of the medium: resting dot, ripple line, strong ripple crest. */
export const FIELD_GLYPHS = '·-~';

const GRID_COLS = 16;
const SLOT_W = 48;
const SLOT_H = 80;
const FONT_FAMILY = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export interface Atlas {
  texture: CanvasTexture;
  cols: number;
  rows: number;
  /** number of creature glyphs (the first entries of the atlas) */
  count: number;
  /** ink per region for each creature glyph: TL, TR, ML, MR, BL, BR (normalised to the densest region) */
  shapes: Float32Array;
  /** per creature glyph: (mean ink, 1 if allowed in flat cells) */
  info: Float32Array;
  /** atlas indices of the medium's glyphs */
  field: [number, number, number];
}

/** Grid atlas of white glyphs on black (read from the red channel), plus each glyph's shape vector. */
export async function buildAtlas(): Promise<Atlas> {
  await Promise.resolve();
  const all = [...GLYPHS];
  const field = [...FIELD_GLYPHS].map((g) => {
    const i = all.indexOf(g);
    if (i >= 0) return i;
    all.push(g);
    return all.length - 1;
  }) as [number, number, number];

  const rows = Math.ceil(all.length / GRID_COLS);
  const canvas = document.createElement('canvas');
  canvas.width = SLOT_W * GRID_COLS;
  canvas.height = SLOT_H * rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 62px ${FONT_FAMILY}`;
  all.forEach((g, i) => {
    const x = (i % GRID_COLS) * SLOT_W;
    const y = Math.floor(i / GRID_COLS) * SLOT_H;
    ctx.fillText(g, x + SLOT_W / 2, y + SLOT_H / 2 + 3);
  });

  // measure ink in 2 columns × 3 rows over the part of the slot the glyph pass samples
  const count = [...GLYPHS].length;
  const shapes = new Float32Array(count * 6);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const x0 = Math.round(SLOT_W * 0.04);
  const x1 = Math.round(SLOT_W * 0.96);
  const y0 = Math.round(SLOT_H * 0.02);
  const y1 = Math.round(SLOT_H * 0.98);
  for (let i = 0; i < count; i++) {
    const sx = (i % GRID_COLS) * SLOT_W;
    const sy = Math.floor(i / GRID_COLS) * SLOT_H;
    const sum = new Float64Array(6);
    const n = new Float64Array(6);
    for (let y = y0; y < y1; y++) {
      const r = Math.min(2, Math.floor(((y - y0) / (y1 - y0)) * 3));
      for (let x = x0; x < x1; x++) {
        const c = Math.min(1, Math.floor(((x - x0) / (x1 - x0)) * 2));
        const k = r * 2 + c;
        sum[k] += img[((sy + y) * canvas.width + sx + x) * 4] / 255;
        n[k]++;
      }
    }
    for (let k = 0; k < 6; k++) shapes[i * 6 + k] = sum[k] / n[k];
  }
  let max = 0;
  for (const v of shapes) max = Math.max(max, v);
  for (let i = 0; i < shapes.length; i++) shapes[i] /= max || 1;
  const info = new Float32Array(count * 2);
  [...GLYPHS].forEach((g, i) => {
    let m = 0;
    for (let k = 0; k < 6; k++) m += shapes[i * 6 + k] / 6;
    info[i * 2] = m;
    info[i * 2 + 1] = FILL.includes(g) ? 1 : 0;
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { texture, cols: GRID_COLS, rows, count, shapes, info, field };
}
