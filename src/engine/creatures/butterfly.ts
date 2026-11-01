import { cloudBuilder, seeded, rib, TAU } from './types.ts';
import type { CreatureCloud } from './types.ts';

/** Papilio glaucus-inspired. Parts: 0 segmented body, 1 head, 2 forewing,
 * 3 hindwing/tail, 4 antennae, 5 orange hindwing spot, 6 antenna clubs,
 * 7 legs, 8 blue hindwing spot, 9 forewing tiger bands, 10 hindwing tiger bands,
 * 11 forewing margin, 12 hindwing margin. Color names are semantic part IDs;
 * this API is monochrome unless the renderer adds a per-part tint.
 * local: u=fan ray/body phase, v=hinge/attachment-to-tip. */
export function butterfly(count: number, seed = 4): CreatureCloud {
  const r = seeded(seed), b = cloudBuilder('butterfly', count);
  for (let i = 0; i < count; i++) {
    const kind = (i + 0.5) / count;
    if (kind < 0.085) {
      let xu = 2 * r() - 1;
      if (r() < 0.4) xu = Math.round(xu * 8) / 8;
      const a = TAU * r(), ring = Math.sqrt(Math.max(0, 1 - xu * xu));
      b.add(-0.07 + 0.39 * xu, 0.053 * ring * Math.cos(a), 0.050 * ring * Math.sin(a),
        xu / 0.39, ring * Math.cos(a) / 0.053, ring * Math.sin(a) / 0.050, 0, (1 - xu) / 2);
    } else if (kind < 0.11) {
      b.ellipsoid(r, 0.32, 0.02, 0, 0.075, 0.065, 0.069, 1);
    } else if (kind < 0.93) {
      const side = r() < 0.5 ? -1 : 1, fore = kind < 0.56;
      const orange = kind > 0.905 && kind <= 0.918, blue = kind > 0.918;
      let u = r(), s = Math.sqrt(r()), part = fore ? 2 : 3;
      const mode = r();
      if (mode < 0.22) u = rib(r, fore ? 12 : 10, 0.95); // branching fan veins
      else if (mode < 0.48) {
        const stripe = Math.floor(r() * 4);
        s = 0.23 + stripe * 0.17 + 0.065 * Math.sin(4.5 * u + stripe) + (r() - 0.5) * 0.040;
        part = fore ? 9 : 10;
      } else if (mode < 0.70) {
        s = 0.88 + 0.12 * r();
        // Leave a regular row of low-density windows inside the dark scalloped border.
        const spotPhase = (u * (fore ? 10 : 8)) % 1;
        if (spotPhase > 0.29 && spotPhase < 0.71 && s < 0.966) s = 0.985 + 0.015 * r();
        part = fore ? 11 : 12;
      }
      if (orange || blue) {
        const a = r() * TAU, rad = Math.sqrt(r());
        u = (blue ? 0.73 : 0.84) + (blue ? 0.042 : 0.028) * rad * Math.cos(a);
        s = (blue ? 0.81 : 0.73) + 0.055 * rad * Math.sin(a);
        part = blue ? 8 : 5;
      }
      const theta = fore ? 0.18 + 2.02 * u : 1.64 + 1.30 * u;
      let edge = fore ? 0.20 + 0.82 * Math.sin(Math.PI * u) ** 0.65 : 0.20 + 0.55 * Math.sin(Math.PI * u) ** 0.55;
      if (!fore) edge += 0.31 * Math.exp(-(((u - 0.71) / 0.045) ** 2));
      edge *= 1 - 0.032 * Math.cos(u * (fore ? 10 : 8) * TAU);
      b.add((fore ? 0.12 : -0.06) + s * edge * Math.cos(theta),
        0.015 + 0.035 * Math.sin(Math.PI * s) + 0.009 * Math.sin(u * 17) * s,
        side * (0.035 + s * edge * Math.sin(theta)),
        -0.07 * Math.cos(Math.PI * s) * Math.cos(theta), 1,
        -side * 0.07 * Math.cos(Math.PI * s) * Math.sin(theta), part, u, s);
    } else if (kind < 0.97) {
      const side = r() < 0.5 ? -1 : 1, u = r(), a = TAU * r();
      b.add(0.35 + 0.33 * u, 0.025 + 0.07 * u, side * (0.036 + 0.13 * u * u) + 0.003 * Math.sin(a),
        0, Math.cos(a), Math.sin(a), 4, u, u);
    } else if (kind < 0.985) {
      const side = r() < 0.5 ? -1 : 1;
      b.ellipsoid(r, 0.68, 0.095, side * 0.166, 0.025, 0.014, 0.016, 6, 1, 1);
    } else {
      const side = r() < 0.5 ? -1 : 1, leg = Math.floor(r() * 3), u = r(), a = TAU * r();
      const knee = Math.min(1, 2 * u), foot = Math.max(0, 2 * u - 1);
      b.add(0.02 + 0.09 * leg - 0.06 * knee + 0.10 * foot,
        -0.03 - 0.10 * knee - 0.08 * foot + 0.003 * Math.cos(a),
        side * (0.03 + 0.10 * knee - 0.025 * foot) + 0.003 * Math.sin(a),
        0, Math.cos(a), Math.sin(a), 7, leg / 2, u);
    }
  }
  return b.finish();
}
