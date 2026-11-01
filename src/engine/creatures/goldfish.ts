import { cloudBuilder, seeded, rib, TAU } from './types.ts';
import type { CreatureCloud } from './types.ts';

/** Fancy veiltail. Parts: 0 body, 1 double veil tail, 2 dorsal, 3 pectoral,
 * 4 pelvic, 5 anal, 6 eye bulges, 7 lips, 8 operculum, 9 scales,
 * 10 iris rings, 11 pupils. local: u=head-to-peduncle phase, v=fin reach.
 * Tail encodes its normalized hinge X as u=(hingeX+1)/2, v=root-to-edge.
 * This keeps the sweep pivot correct after centroid/radius normalization. */
export function goldfish(count: number, seed = 1): CreatureCloud {
  const r = seeded(seed), b = cloudBuilder('goldfish', count);
  for (let i = 0; i < count; i++) {
    const kind = (i + 0.5) / count;
    if (kind < 0.33) {
      let a = TAU * r(), xu = r() * 2 - 1;
      const scale = kind > 0.245;
      if (scale) {
        // Staggered C-shaped scale rims follow the same ellipsoid as the skin.
        const row = Math.floor(r() * 16), sector = Math.floor(r() * 24);
        const arc = (r() * 1.35 - 0.675) * Math.PI;
        xu = -0.91 + (row + 0.44 * Math.cos(arc)) * 1.63 / 16;
        a = (sector + (row % 2) * 0.5 + 0.44 * Math.sin(arc)) * TAU / 24;
      }
      const ring = Math.sqrt(Math.max(0, 1 - xu * xu)), taper = 0.86 + 0.14 * xu;
      const y = 0.30 * ring * Math.cos(a) * taper, z = 0.185 * ring * Math.sin(a) * taper;
      b.add(0.15 + 0.54 * xu, y, z, xu / 0.54, y / 0.09, z / 0.0342, scale ? 9 : 0, (1 - xu) / 2);
    } else if (kind < 0.655) {
      const side = r() < 0.5 ? -1 : 1;
      const ray = 2 * rib(r, 22, 0.64) - 1;
      const s = r() < 0.22 ? 0.988 + 0.012 * r() : Math.sqrt(r());
      const fan = 0.46 + 0.27 * Math.abs(ray) ** 0.65;
      const fold = 0.045 * Math.sin(16 * ray + 9 * s) * s ** 2;
      const edge = 0.022 * Math.sin(ray * 45) * s ** 6;
      const x = -0.34 - fan * s + edge;
      const y = 0.54 * ray * s + 0.035 * Math.sin(9 * s + ray * 5) * s ** 2;
      const z = side * (0.025 + 0.20 * s * (1 - 0.25 * Math.abs(ray))) + fold;
      // Fold slope changes the normal, giving the veil a readable Lambert/rim rhythm.
      b.add(x, y, z, side * (0.12 + 0.32 * Math.cos(16 * ray + 9 * s) * s),
        -side * 0.35 * Math.cos(16 * ray + 9 * s) * s, side, 1, 1, s);
    } else if (kind < 0.755) {
      const u = rib(r, 16, 0.70), v = r() < 0.18 ? 1 : r();
      const base = 0.22 * Math.sin(Math.PI * (0.12 + u * 0.82));
      const height = 0.30 * Math.sin(Math.PI * u) ** 0.65;
      b.add(0.39 - 0.74 * u, base + height * v, 0.016 * Math.sin(u * 24 + v * 7) * v,
        0.16 * Math.cos(u * 24), 0.12, r() < 0.5 ? 1 : -1, 2, 0.28 + 0.68 * u, v);
    } else if (kind < 0.85) {
      const side = r() < 0.5 ? -1 : 1, ray = rib(r, 12, 0.70), s = Math.sqrt(r());
      b.add(0.33 - (0.20 + 0.30 * ray) * s, -0.10 - 0.17 * s * Math.sin(Math.PI * ray),
        side * (0.13 + 0.29 * s * Math.sin(Math.PI * (0.12 + 0.75 * ray))),
        0, 0.8, side * 0.4, 3, 0.34, s);
    } else if (kind < 0.91) {
      const side = r() < 0.5 ? -1 : 1, ray = rib(r, 10, 0.70), s = Math.sqrt(r());
      const anal = kind > 0.885;
      b.add((anal ? -0.17 : 0.03) - (0.1 + 0.18 * ray) * s, -0.23 - 0.24 * s * Math.sin(Math.PI * ray),
        anal ? 0.015 * Math.sin(ray * 12) : side * (0.045 + 0.13 * s),
        0, -0.3, side, anal ? 5 : 4, anal ? 0.85 : 0.65, s);
    } else if (kind < 0.94) {
      const side = r() < 0.5 ? -1 : 1, a = 0.17 + r() * (Math.PI - 0.34);
      const xu = 0.42 - 0.12 * Math.cos(a), ring = Math.sqrt(1 - xu * xu), taper = 0.86 + 0.14 * xu;
      const y = 0.302 * ring * Math.cos(a) * taper, z = side * 0.188 * ring * Math.sin(a) * taper;
      b.add(0.15 + 0.54 * xu, y, z, xu / 0.54, y / 0.09, z / 0.0342, 8, (1 - xu) / 2);
    } else if (kind < 0.963) {
      const side = r() < 0.5 ? -1 : 1;
      b.ellipsoid(r, 0.49, 0.095, side * 0.143, 0.066, 0.069, 0.044, 6, 0.14);
    } else if (kind < 0.986) {
      const side = r() < 0.5 ? -1 : 1, a = TAU * r(), pupil = kind > 0.978;
      const rad = pupil ? 0.022 * Math.sqrt(r()) : 0.038 + 0.005 * r();
      b.add(0.505 + rad * Math.cos(a), 0.10 + rad * Math.sin(a), side * (pupil ? 0.188 : 0.184),
        0.12, 0.08, side, pupil ? 11 : 10, 0.14);
    } else {
      const a = r() * TAU, tube = r() * TAU;
      b.add(0.686 + 0.018 * Math.cos(tube), -0.035 + (0.043 + 0.008 * Math.sin(tube)) * Math.cos(a),
        (0.035 + 0.008 * Math.sin(tube)) * Math.sin(a), 0.9, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 7, 0.02);
    }
  }
  // Recover finish()'s affine X transform from two separated raw samples.
  // A per-cloud encoded hinge avoids a hard-coded pivot drifting between seeds/counts.
  const raw0 = b.cloud.position[0] ?? 0;
  let anchor = 0;
  for (let i = 3; i < b.cloud.position.length; i += 3) {
    if (Math.abs(b.cloud.position[i]! - raw0) > 0.1) { anchor = i; break; }
  }
  const raw1 = b.cloud.position[anchor] ?? 0, cloud = b.finish();
  const scale = anchor ? (cloud.position[anchor]! - cloud.position[0]!) / (raw1 - raw0) : 0;
  const hinge = (cloud.position[0] ?? 0) + (-0.34 - raw0) * scale;
  for (let i = 0; i < count; i++) if (cloud.part[i] === 1) {
    cloud.local[i * 2] = Math.max(0, Math.min(1, (hinge + 1) / 2));
  }
  return cloud;
}
