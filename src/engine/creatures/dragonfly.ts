import { cloudBuilder, seeded, TAU } from './types.ts';
import type { CreatureCloud } from './types.ts';

/** Anax-inspired anatomy. Parts: 0 thorax, 1 head, 2 compound eyes,
 * 3 ten-segment abdomen/rings, 4 forewings/veins, 5 hindwings/veins,
 * 6 folded legs, 7 pterostigma, 8 thoracic stripes, 9 face, 10 dark abdomen tip.
 * local: u=body/span phase, v=wing reach. Part 7: u=0 fore / 1 hind. */
export function dragonfly(count: number, seed = 2): CreatureCloud {
  const r = seeded(seed), b = cloudBuilder('dragonfly', count);
  for (let i = 0; i < count; i++) {
    const kind = (i + 0.5) / count;
    if (kind < 0.105) {
      const stripe = kind > 0.075;
      if (!stripe) b.ellipsoid(r, 0.12, 0, 0, 0.18, 0.102, 0.095, 0);
      else {
        const xu = r() * 1.7 - 0.85, radial = Math.sqrt(1 - xu * xu);
        const a = (Math.floor(r() * 5) + 0.3) * TAU / 5 + (r() - 0.5) * 0.055;
        b.add(0.12 + 0.182 * xu, 0.103 * radial * Math.cos(a), 0.096 * radial * Math.sin(a),
          xu / 0.18, radial * Math.cos(a) / 0.102, radial * Math.sin(a) / 0.095, 8);
      }
    } else if (kind < 0.133) {
      const face = kind > 0.12;
      b.ellipsoid(r, face ? 0.405 : 0.32, face ? -0.018 : 0.02, 0,
        face ? 0.035 : 0.092, face ? 0.052 : 0.07, face ? 0.085 : 0.11, face ? 9 : 1);
    } else if (kind < 0.205) {
      const side = r() < 0.5 ? -1 : 1;
      let a = r() * TAU, sy = r();
      if (r() < 0.25) { a = Math.round(a * 72 / TAU) * TAU / 72; sy = Math.round(sy * 26) / 26; }
      const ring = Math.sqrt(1 - sy * sy), sx = ring * Math.cos(a), sz = ring * Math.sin(a);
      b.add(0.345 + 0.095 * sx, 0.025 + 0.115 * sy, side * (0.058 + 0.090 * sz),
        sx / 0.095, sy / 0.115, side * sz / 0.090, 2);
    } else if (kind < 0.395) {
      let u = r();
      const ring = r() < 0.48;
      if (ring) u = Math.min(1, Math.round(u * 10) / 10 + 0.002 * r());
      if (kind > 0.37) u = 0.86 + 0.14 * r();
      const a = r() * TAU, rad = (0.040 - 0.023 * u) * (ring ? 1.24 : 1);
      b.add(-0.02 - 0.89 * u, -0.01 + 0.024 * Math.sin(u * 3) + rad * Math.cos(a),
        rad * Math.sin(a), -0.025, Math.cos(a), Math.sin(a), u > 0.86 ? 10 : 3, u);
    } else if (kind < 0.96) {
      const fore = r() < 0.5, side = r() < 0.5 ? -1 : 1, spot = kind > 0.94;
      let span = Math.sqrt(r()), chord = 2 * r() - 1;
      const mode = r();
      if (mode < 0.18) chord = mode < 0.12 ? 0.99 : -0.99; // costa + trailing edge
      else if (mode < 0.48) {
        chord = -0.82 + Math.floor(r() * 6) * 0.33 + 0.055 * Math.sin(span * 9) + (r() - 0.5) * 0.006;
      } else if (mode < 0.69) {
        // Cross veins slant slightly between the longitudinal supports.
        span = Math.round(span * 23) / 23 + chord * 0.007 + (r() - 0.5) * 0.002;
      } else if (mode < 0.75) span = 0.53 + 0.012 * chord; // reinforced nodus
      if (spot) { span = 0.80 + 0.09 * r(); chord = 0.58 + 0.38 * r(); }
      span = Math.max(0.002, Math.min(0.998, span));
      const width = (fore ? 0.13 : 0.155 + 0.065 * (1 - span) ** 2) * Math.sin(Math.PI * span) ** 0.65;
      const center = (fore ? 0.18 : 0.015) + (fore ? 0.15 : -0.25) * span;
      b.add(center + width * chord, 0.032 + 0.026 * Math.sin(Math.PI * span) - 0.015 * chord * chord,
        side * (0.055 + (fore ? 0.98 : 0.91) * span),
        0.03 * chord, 1, -side * 0.026 * Math.PI * Math.cos(Math.PI * span),
        spot ? 7 : fore ? 4 : 5, spot ? (fore ? 0 : 1) : span, span);
    } else {
      const side = r() < 0.5 ? -1 : 1, leg = Math.floor(r() * 3), u = r(), a = r() * TAU;
      const x0 = 0.035 + leg * 0.075, bend = Math.min(1, u * 2), foot = Math.max(0, u * 2 - 1);
      b.add(x0 + 0.09 * bend - 0.15 * foot, -0.04 - 0.13 * bend - 0.065 * foot + 0.003 * Math.cos(a),
        side * (0.05 + 0.17 * bend - 0.08 * foot) + 0.003 * Math.sin(a),
        0, Math.cos(a), Math.sin(a), 6, leg / 2, u);
    }
  }
  return b.finish();
}
