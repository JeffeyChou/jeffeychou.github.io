// Per-chapter camera keyframes and specimen metadata.
// Orientation (shared with creatures): +Y up, head toward +X, animal's left toward +Z.
// az = rotation of the camera around +Y measured from +Z toward +X; el = elevation above XZ.
import type { CreatureName } from './creatures/types.ts';

export interface CamPose {
  az: number; // degrees
  el: number; // degrees
  dist: number; // bounding radii
  fov: number; // vertical, degrees
}

export interface ChapterSpec {
  creature: CreatureName;
  species: string; // italic binomial for the specimen label
  common: string;
  start: CamPose;
  end: CamPose;
}

/** Species shown in the caption, indexed like CREATURE_ID (goldfish, dragonfly, jellyfish, butterfly). */
export const SPECIES = [
  { species: 'Carassius auratus', common: 'goldfish' },
  { species: 'Anax junius', common: 'green darner' },
  { species: 'Aurelia aurita', common: 'moon jelly' },
  { species: 'Papilio glaucus', common: 'tiger swallowtail' },
];

// Academic page: one goldfish; scrolling orbits the camera around it continuously
// (each chapter's end pose is the next chapter's start pose).
export const CHAPTERS: ChapterSpec[] = [
  {
    creature: 'goldfish',
    species: 'Carassius auratus',
    common: 'goldfish',
    start: { az: 25, el: 10, dist: 4.4, fov: 40 },
    end: { az: -35, el: 22, dist: 4.2, fov: 40 },
  },
  {
    creature: 'goldfish',
    species: 'Carassius auratus',
    common: 'goldfish',
    start: { az: -35, el: 22, dist: 4.2, fov: 40 },
    end: { az: -110, el: 48, dist: 4.4, fov: 40 }, // rises to look down on the fins
  },
  {
    creature: 'goldfish',
    species: 'Carassius auratus',
    common: 'goldfish',
    start: { az: -110, el: 48, dist: 4.4, fov: 40 },
    end: { az: -190, el: -8, dist: 4.1, fov: 40 }, // dips below
  },
  {
    creature: 'goldfish',
    species: 'Carassius auratus',
    common: 'goldfish',
    start: { az: -190, el: -8, dist: 4.1, fov: 40 },
    end: { az: -265, el: 16, dist: 4.4, fov: 40 },
  },
];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function lerpPose(a: CamPose, b: CamPose, t: number, out: CamPose = { az: 0, el: 0, dist: 0, fov: 0 }): CamPose {
  out.az = lerp(a.az, b.az, t);
  out.el = lerp(a.el, b.el, t);
  out.dist = lerp(a.dist, b.dist, t);
  out.fov = lerp(a.fov, b.fov, t);
  return out;
}

/** Target pose for chapter A at progress p, or the morph from A's end to B's start. */
export function targetPose(a: number, p: number, morph: number, out: CamPose): CamPose {
  const A = CHAPTERS[a];
  if (morph > 0 && a + 1 < CHAPTERS.length) {
    return lerpPose(A.end, CHAPTERS[a + 1].start, easeInOut(clamp01(morph)), out);
  }
  return lerpPose(A.start, A.end, smooth(clamp01(p)), out);
}

/** Exponential approach, frame-rate independent. */
export function damp(current: CamPose, target: CamPose, dt: number, rate = 4.5): void {
  const k = 1 - Math.exp(-dt * rate);
  current.az += (target.az - current.az) * k;
  current.el += (target.el - current.el) * k;
  current.dist += (target.dist - current.dist) * k;
  current.fov += (target.fov - current.fov) * k;
}
