export type CreatureName = 'goldfish' | 'dragonfly' | 'jellyfish' | 'butterfly';
export const CREATURES: CreatureName[] = ['goldfish', 'dragonfly', 'jellyfish', 'butterfly'];
export const CREATURE_ID: Record<CreatureName, number> = { goldfish: 0, dragonfly: 1, jellyfish: 2, butterfly: 3 };

/** +Y is up, +X is forward, +Z is the animal's left. */
export interface CreatureCloud {
  name: CreatureName;
  count: number;
  /** Rest pose: centroid centered, maximum distance from origin = 1 (count > 1). */
  position: Float32Array;
  normal: Float32Array;
  part: Float32Array;
  /** Per-part coordinates, each in [0, 1]; definitions live in each sampler. */
  local: Float32Array;
}

export type Random = () => number;
export const TAU = Math.PI * 2;
export function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

/** Allocation and scalar writes shared by the dependency-free samplers. */
export function cloudBuilder(name: CreatureName, count: number) {
  if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000) {
    throw new RangeError('count must be an integer between 0 and 1,000,000');
  }
  const cloud: CreatureCloud = {
    name, count, position: new Float32Array(count * 3), normal: new Float32Array(count * 3),
    part: new Float32Array(count), local: new Float32Array(count * 2),
  };
  let index = 0;
  function add(x: number, y: number, z: number, nx: number, ny: number, nz: number,
    part: number, u = 0, v = 0) {
    const p = index * 3;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    cloud.position[p] = x; cloud.position[p + 1] = y; cloud.position[p + 2] = z;
    cloud.normal[p] = nx / length; cloud.normal[p + 1] = ny / length; cloud.normal[p + 2] = nz / length;
    cloud.part[index] = part;
    cloud.local[index * 2] = Math.max(0, Math.min(1, u));
    cloud.local[index * 2 + 1] = Math.max(0, Math.min(1, v));
    index++;
  }
  function ellipsoid(rng: Random, cx: number, cy: number, cz: number,
    rx: number, ry: number, rz: number, part: number, u = 0, v = 0) {
    const a = rng() * TAU, sy = rng() * 2 - 1, radial = Math.sqrt(1 - sy * sy);
    const sx = radial * Math.cos(a), sz = radial * Math.sin(a);
    add(cx + rx * sx, cy + ry * sy, cz + rz * sz, sx / rx, sy / ry, sz / rz, part, u, v);
  }
  function finish(): CreatureCloud {
    if (index !== count) throw new Error(`${name}: wrote ${index} of ${count} points`);
    if (!count) return cloud;
    // Align centers of mass, rather than extrema of an unusually long tentacle/tail.
    let sx = 0, sy = 0, sz = 0;
    const p = cloud.position;
    for (let i = 0; i < p.length; i += 3) {
      sx += p[i]!; sy += p[i + 1]!; sz += p[i + 2]!;
    }
    const cx = sx / count, cy = sy / count, cz = sz / count;
    let radius2 = 0;
    for (let i = 0; i < p.length; i += 3) {
      p[i] -= cx; p[i + 1] -= cy; p[i + 2] -= cz;
      radius2 = Math.max(radius2, p[i]! ** 2 + p[i + 1]! ** 2 + p[i + 2]! ** 2);
    }
    const scale = 1 / (Math.sqrt(radius2) || 1);
    for (let i = 0; i < p.length; i++) p[i] *= scale;
    return cloud;
  }
  return { cloud, add, ellipsoid, finish };
}

/** Bias a sheet coordinate onto its supporting ribs, without losing its membrane. */
export function rib(rng: Random, ribs: number, probability = 0.48): number {
  const u = rng();
  return rng() < probability ? Math.max(0, Math.min(1, Math.round(u * ribs) / ribs + (rng() - 0.5) * 0.006)) : u;
}
