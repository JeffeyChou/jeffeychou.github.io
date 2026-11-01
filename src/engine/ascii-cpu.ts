import { CREATURE_ID } from './creatures/types.ts';
import type { CreatureCloud } from './creatures/types.ts';
import { animatePoint } from './creatures/animate.ts';

export interface AsciiOpts {
  cols: number; rows: number;
  /** Degrees: az=0 views from +Z (profile); az=90 from +X; el=90 is dorsal. */
  az: number; el: number; dist: number; fov: number;
  t?: number; pose?: number; ramp?: string; cellAspect?: number;
}

/** Point splats with a soft depth buffer, bilinear coverage and directional Lambert light.
 * fov is vertical; cellAspect is glyph height/width, NOT the viewport aspect ratio.
 * No ambient DOM, canvas, Node imports or GPU dependency. */
export function renderAscii(cloud: CreatureCloud, opts: AsciiOpts): string {
  const { cols, rows } = opts, aspect = opts.cellAspect ?? 2;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1 || cols * rows > 4_000_000) {
    throw new RangeError('ASCII dimensions must be positive integers, at most 4 million cells');
  }
  if (![opts.az, opts.el, opts.dist, opts.fov, aspect].every(Number.isFinite) ||
    opts.dist <= 0 || opts.fov <= 0 || opts.fov >= 179 || aspect <= 0 ||
    (opts.t !== undefined && !Number.isFinite(opts.t)) || (opts.pose !== undefined && !Number.isFinite(opts.pose))) {
    throw new RangeError('Invalid camera, animation time or cell aspect');
  }
  const ramp = Array.from(opts.ramp ?? ' .,:;i!+*#@');
  if (!ramp.length) throw new RangeError('ASCII ramp must not be empty');
  const cells = cols * rows, n = cloud.count;
  const depth = new Float32Array(cells).fill(Infinity);
  const mass = new Float32Array(cells), luminance = new Float32Array(cells);
  const projected = new Float32Array(n * 4), point = new Float32Array(3);
  const az = opts.az * Math.PI / 180, el = opts.el * Math.PI / 180;
  const sa = Math.sin(az), ca = Math.cos(az), se = Math.sin(el), ce = Math.cos(el);
  const dx = sa * ce, dy = se, dz = ca * ce;
  const ux = -sa * se, uy = ce, uz = -ca * se;
  const focal = rows / (2 * Math.tan(opts.fov * Math.PI / 360));
  let lx = -0.45 * ca + 0.65 * ux + 0.65 * dx;
  let ly = 0.65 * uy + 0.65 * dy;
  let lz = 0.45 * sa + 0.65 * uz + 0.65 * dz;
  const lightLength = Math.hypot(lx, ly, lz); lx /= lightLength; ly /= lightLength; lz /= lightLength;
  const animate = opts.t !== undefined || opts.pose !== undefined;
  const id = CREATURE_ID[cloud.name];
  for (let i = 0; i < n; i++) {
    const j = i * 3, k = i * 4;
    let x = cloud.position[j]!, y = cloud.position[j + 1]!, z = cloud.position[j + 2]!;
    if (animate) {
      animatePoint(id, x, y, z, cloud.part[i]!, cloud.local[i * 2]!, cloud.local[i * 2 + 1]!,
        opts.t ?? 0, opts.pose ?? 1, opts.t === undefined ? 0 : 1, point, 0);
      x = point[0]!; y = point[1]!; z = point[2]!;
    }
    const d = opts.dist - (x * dx + y * dy + z * dz);
    if (d <= 0.05) { projected[k + 2] = -1; continue; }
    const px = cols / 2 - 0.5 + (x * ca - z * sa) * focal * aspect / d;
    const py = rows / 2 - 0.5 - (x * ux + y * uy + z * uz) * focal / d;
    projected[k] = px; projected[k + 1] = py; projected[k + 2] = d;
    const lambert = Math.max(0, cloud.normal[j]! * lx + cloud.normal[j + 1]! * ly + cloud.normal[j + 2]! * lz);
    projected[k + 3] = 0.26 + 0.74 * lambert;
    const x0 = Math.floor(px), y0 = Math.floor(py);
    for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) {
      const xx = x0 + u, yy = y0 + v;
      if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) {
        const w = (1 - Math.abs(px - xx)) * (1 - Math.abs(py - yy));
        if (w > 0.025) depth[yy * cols + xx] = Math.min(depth[yy * cols + xx]!, d);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const k = i * 4, px = projected[k]!, py = projected[k + 1]!, d = projected[k + 2]!;
    if (d < 0) continue;
    const x0 = Math.floor(px), y0 = Math.floor(py);
    for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) {
      const xx = x0 + u, yy = y0 + v;
      if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
      const cell = yy * cols + xx, delta = Math.max(0, d - depth[cell]!);
      if (delta > 0.20) continue;
      const w = (1 - Math.abs(px - xx)) * (1 - Math.abs(py - yy)) * Math.exp(-delta * 25);
      mass[cell] += w; luminance[cell] += w * projected[k + 3]!;
    }
  }
  // Scale exposure with sampling density; leave headroom for veins/scale rows at 60k
  // instead of saturating every membrane cell to the same glyph.
  const exposure = Math.max(0.8, n / cells * 1.15), lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x, m = mass[i]!;
      const coverage = 1 - Math.exp(-m / exposure);
      const light = m > 0 ? luminance[i]! / m : 0;
      const ink = Math.pow(coverage, 0.65) * (0.40 + 0.60 * light);
      line += ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(ink * (ramp.length - 1))))]!;
    }
    lines.push(line);
  }
  return lines.join('\n');
}
