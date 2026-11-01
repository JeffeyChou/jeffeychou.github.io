import { cloudBuilder, seeded, TAU } from './types.ts';
import type { CreatureCloud } from './types.ts';

/** Aurelia-inspired shallow bell. Parts unchanged: 0 bell membrane, 1 scalloped
 * rim, 2 branching radial canals, 3 four horseshoe gonads, 4 oral arms,
 * 5 marginal tentacles (64). local: u=azimuth/arm phase; v=radial bell reach
 * or attachment-to-tip on arms/tentacles. Density, not opaque fill, suggests translucency. */
export function jellyfish(count: number, seed = 3): CreatureCloud {
  const r = seeded(seed), b = cloudBuilder('jellyfish', count);
  const radius = 0.78, height = 0.28;
  for (let i = 0; i < count; i++) {
    const kind = (i + 0.5) / count;
    if (kind < 0.35) {
      let a = r() * TAU, rho = Math.sqrt(r());
      const canal = kind > 0.235;
      if (canal) {
        const branch = Math.floor(r() * 16), fork = r() < 0.5 ? -1 : 1;
        a = branch * TAU / 16 + fork * 0.12 * Math.max(0, (rho - 0.55) / 0.45) + (r() - 0.5) * 0.006;
      }
      const cap = Math.sqrt(Math.max(0, 1 - rho * rho));
      const x = radius * rho * Math.cos(a), z = radius * rho * Math.sin(a);
      b.add(x, 0.30 + height * cap + 0.012 * Math.cos(32 * a) * rho ** 10, z,
        x / (radius * radius), cap / height, z / (radius * radius), canal ? 2 : 0,
        (a / TAU + 1) % 1, rho);
    } else if (kind < 0.44) {
      const a = r() * TAU, tube = r() * TAU, rr = radius + 0.009 * Math.cos(tube);
      b.add(rr * Math.cos(a), 0.30 + 0.020 * Math.cos(32 * a) + 0.010 * Math.sin(tube),
        rr * Math.sin(a), Math.cos(a), 0.15, Math.sin(a), 1, a / TAU, 1);
    } else if (kind < 0.515) {
      const lobe = Math.floor(r() * 4) * TAU / 4, a = (r() * 2 - 1) * 2.38;
      const rad = 0.10 + 0.012 * r(), radial = 0.235 + rad * Math.cos(a), tangent = rad * 0.82 * Math.sin(a);
      const x = radial * Math.cos(lobe) - tangent * Math.sin(lobe);
      const z = radial * Math.sin(lobe) + tangent * Math.cos(lobe);
      const rho = Math.hypot(x, z) / radius, cap = Math.sqrt(1 - rho * rho);
      b.add(x, 0.309 + height * cap, z, x / (radius * radius), cap / height, z / (radius * radius),
        3, lobe / TAU, rho);
    } else if (kind < 0.79) {
      const arm = Math.floor(r() * 4), a = arm * TAU / 4 + 0.4;
      const u = r(), edge = r() < 0.60 ? (r() < 0.5 ? -1 : 1) : 2 * r() - 1;
      const center = 0.115 + 0.07 * Math.sin(u * 6 + arm) + 0.07 * u;
      const width = 0.105 * (1 - 0.55 * u) * edge;
      const twist = a + 2.0 * u, phase = u * 85 + arm;
      const frill = Math.sin(phase) * 0.035 * Math.abs(edge);
      b.add(center * Math.cos(a) + width * Math.cos(twist), 0.24 - (1.30 + 0.08 * Math.sin(arm)) * u + frill,
        center * Math.sin(a) + width * Math.sin(twist),
        -Math.sin(twist), 0.45 * Math.cos(phase) * Math.abs(edge), Math.cos(twist), 4, arm / 4, u);
    } else {
      const strand = Math.floor(r() * 64), a = strand * TAU / 64;
      const u = r(), long = strand % 8 === 0;
      const length = 0.16 + 0.32 * (0.5 + 0.5 * Math.sin(strand * 8.31)) + (long ? 0.62 : 0);
      const drift = 0.07 * Math.sin(u * 7 + strand * 1.7) * u;
      const rr = radius + 0.05 * Math.sin(u * 5 + strand) * u;
      const tube = TAU * r(), thickness = long ? 0.0035 : 0.0025;
      b.add(rr * Math.cos(a) + drift + thickness * Math.cos(tube), 0.29 - length * u,
        rr * Math.sin(a) + 0.07 * Math.sin(u * 8 + strand) * u + thickness * Math.sin(tube),
        Math.cos(tube), 0.02, Math.sin(tube), 5, strand / 64, u);
    }
  }
  return b.finish();
}
