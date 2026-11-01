// Natural locomotion (model proposed by agy, R142; body timing and thrust by astra).
// - speed surges with the body's thrust and decays with drag (jellyfish: squeeze → surge → glide)
// - the travel direction meanders slowly; creatures never turn around
// - they leave the screen and re-enter from the opposite edge on a fresh corridor
//   (or the stage swaps in another creature, which then enters from an edge: see enter())
// - depth drifts toward / away from the camera
// - every page load starts somewhere different
// Positions live in view-normalised units (x in half-widths, y in half-heights) so coverage of
// the screen does not depend on camera distance; they are mapped to world space each frame.
// Speeds are in units of the shorter half-extent: body sizes follow the screen height, so on a wide
// monitor a speed in half-widths would make crossers race (the owner found them too fast on a 27").
import { Matrix4, Vector3 } from 'three';
import * as anim from './creatures/animate.ts';

type Kind = 'cross' | 'rise';

interface Spec {
  kind: Kind;
  F: number; // thrust gain (view units / s²)
  drag: number; // default drag if the body model does not provide one
  minSpeed: number; // view units / s
  maxSpeed: number;
  wander: number; // heading wander rate, rad/s of the phase
  maxTheta: number; // max travel-direction deviation from the primary axis, rad
  tiltCap: number; // jellyfish: max bell tilt, rad
  yawCam: number; // crossers: heading turned toward the camera for a three-quarter view, rad
  zMax: number; // depth range, bounding radii
  zRate: number; // rad/s
  spin: number; // jellyfish: slow turn about its axis, rad/s
}

const D = Math.PI / 180;
// goldfish, dragonfly, jellyfish, butterfly
// Crossers travel ~1/4–1/2 body length per stroke cycle so the strokes visibly carry them
// (slower travel looked like swimming in place); the jellyfish is naturally slow.
const SPECS: Spec[] = [
  { kind: 'cross', F: 0.5, drag: 1.5, minSpeed: 0.12, maxSpeed: 0.32, wander: 0.12, maxTheta: 20 * D, tiltCap: 0, yawCam: 20 * D, zMax: 0.4, zRate: 0.18, spin: 0 },
  { kind: 'cross', F: 0.3, drag: 1.0, minSpeed: 0.1, maxSpeed: 0.3, wander: 0.1, maxTheta: 16 * D, tiltCap: 0, yawCam: 14 * D, zMax: 0.45, zRate: 0.16, spin: 0 },
  { kind: 'rise', F: 0.45, drag: 1.8, minSpeed: 0.03, maxSpeed: 0.16, wander: 0.08, maxTheta: 40 * D, tiltCap: 25 * D, yawCam: 0, zMax: 0.35, zRate: 0.14, spin: 0.05 },
  { kind: 'cross', F: 0.5, drag: 2.0, minSpeed: 0.09, maxSpeed: 0.28, wander: 0.24, maxTheta: 28 * D, tiltCap: 0, yawCam: 18 * D, zMax: 0.3, zRate: 0.25, spin: 0 },
];

/** Body-synced propulsion: astra's export when present, otherwise an equivalent stand-in. */
type ThrustFn = (id: number, t: number) => { thrust: number; drag: number };
const astraThrust = (anim as unknown as { thrust?: ThrustFn }).thrust;
const fallbackThrust: ThrustFn = (id, t) => {
  const frac = (x: number) => x - Math.floor(x);
  if (id === 2) {
    // jellyfish: fast contraction (~28% of a 1.8 s cycle), then coast and slow relaxation
    const ph = frac(t / 1.8);
    return { thrust: ph < 0.28 ? Math.sin((Math.PI * ph) / 0.28) ** 2 : 0, drag: 1.8 };
  }
  if (id === 0) {
    const ph = frac(t / 3.4); // 2–3 tail beats, then coast
    return { thrust: ph < 0.45 ? 0.7 + 0.3 * Math.sin(ph * 40) : 0, drag: 1.5 };
  }
  if (id === 3) {
    const ph = frac(t / 3.0); // flap bout, then glide
    return { thrust: ph < 0.6 ? 0.75 : 0.08, drag: 2.0 };
  }
  const ph = frac(t / 5.0); // dragonfly: steady, with a glide
  return { thrust: ph < 0.85 ? 0.65 : 0.1, drag: 1.0 };
};
const thrustOf: ThrustFn = astraThrust ?? fallbackThrust;

/** global calm factor on travel speed and wander (the owner found full speed attention-grabbing) */
const CALM = 0.6;

const UP = new Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + (b - a) * Math.random();

export class Traverse {
  private id: number;
  private spec: Spec;
  // view-normalised position: x in half-widths, y in half-heights
  private x: number;
  private y: number;
  private z: number;
  private speed: number;
  private heading = 0;
  private wTheta: number;
  private wZ: number;
  private spinA: number;
  private dir: 1 | -1;
  readonly position = new Vector3();
  readonly matrix = new Matrix4();

  constructor(index: number) {
    this.id = index;
    this.spec = SPECS[index];
    this.dir = Math.random() < 0.5 ? 1 : -1;
    const primary = rand(-0.4, 0.4); // visible right away, away from the edges
    const secondary = rand(-0.7, 0.7);
    if (this.spec.kind === 'cross') {
      this.x = primary;
      this.y = secondary;
    } else {
      this.x = secondary;
      this.y = primary;
    }
    this.z = rand(-this.spec.zMax, this.spec.zMax);
    this.speed = ((this.spec.minSpeed + this.spec.maxSpeed) / 2) * CALM;
    this.wTheta = rand(0, TAU);
    this.wZ = rand(0, TAU);
    this.spinA = rand(0, TAU);
  }

  /** Arrive from an edge as a fresh visitor (the stage swapped creatures while the screen was empty). */
  enter(edge: number): void {
    const s = this.spec;
    this.heading = 0;
    this.wTheta = rand(0, TAU);
    this.speed = ((s.minSpeed + s.maxSpeed) / 2) * CALM;
    if (s.kind === 'cross') {
      this.dir = Math.random() < 0.5 ? 1 : -1;
      this.x = -this.dir * (1 + edge);
      this.y = rand(-0.65, 0.65);
    } else {
      this.y = -(1 + edge);
      this.x = rand(-0.75, 0.75);
    }
  }

  /**
   * Advance by dt seconds. clock = the creature's animation clock (so surges match the strokes);
   * aspect = halfW / halfH; edge = how far past the screen edge it must go before wrapping.
   * Returns true when the creature left the screen and wrapped this step.
   */
  update(dt: number, clock: number, aspect: number, edge: number): boolean {
    if (dt <= 0) return false;
    const s = this.spec;
    const sig = thrustOf(this.id, clock);
    const drag = sig.drag || s.drag;
    const lo = s.minSpeed * CALM;
    const hi = s.maxSpeed * CALM;
    this.speed += (s.F * CALM * sig.thrust - drag * (this.speed - lo)) * dt;
    this.speed = Math.min(hi, Math.max(lo, this.speed));

    // slow two-harmonic meander of the travel direction
    this.wTheta += s.wander * CALM * dt;
    const target = s.maxTheta * (0.75 * Math.sin(this.wTheta) + 0.25 * Math.sin(this.wTheta * 1.618));
    this.heading += (target - this.heading) * Math.min(1, 2.5 * dt);
    // soft steering keeps the secondary coordinate on screen (no U-turn, just a gentle bend)
    const sec = s.kind === 'cross' ? this.y : this.x;
    if (Math.abs(sec) > 0.82) {
      const sign = s.kind === 'cross' ? Math.sign(sec) : Math.sign(sec);
      this.heading -= sign * 1.6 * (Math.abs(sec) - 0.82) * dt * (s.kind === 'cross' ? 1 : 1);
      this.heading = Math.max(-s.maxTheta * 1.3, Math.min(s.maxTheta * 1.3, this.heading));
    }

    this.wZ += s.zRate * CALM * dt;
    this.z = s.zMax * Math.sin(this.wZ);
    this.spinA += s.spin * dt;

    if (s.kind === 'cross') {
      const k = aspect > 1 ? 1 / aspect : 1; // speed in shorter half-extents
      this.x += this.dir * this.speed * Math.cos(this.heading) * k * dt;
      this.y += this.speed * Math.sin(this.heading) * aspect * k * dt;
      if (Math.abs(this.x) > 1 + edge) {
        this.x = -this.dir * (1 + edge);
        this.y = rand(-0.65, 0.65);
        return true;
      }
    } else {
      this.y += this.speed * Math.cos(this.heading) * dt;
      this.x += (this.speed * Math.sin(this.heading)) / aspect * dt;
      if (this.y > 1 + edge) {
        this.y = -(1 + edge);
        this.x = rand(-0.75, 0.75);
        return true;
      }
    }
    return false;
  }

  /** Map to world space for the current camera (axes + half extents) and creature scale. */
  place(right: Vector3, up: Vector3, toCam: Vector3, halfW: number, halfH: number, scale: number): void {
    const s = this.spec;
    this.position
      .copy(right)
      .multiplyScalar(this.x * halfW)
      .addScaledVector(up, this.y * halfH)
      .addScaledVector(toCam, this.z);

    if (s.kind === 'cross') {
      // along the on-screen travel direction, canted toward the camera; never rolled
      _v.copy(right).multiplyScalar(this.dir * Math.cos(this.heading)).addScaledVector(up, Math.sin(this.heading));
      _f.copy(_v).multiplyScalar(Math.cos(s.yawCam)).addScaledVector(toCam, Math.sin(s.yawCam)).normalize();
      _l.crossVectors(_f, UP).normalize();
      _u.crossVectors(_l, _f).normalize();
    } else {
      // bell axis leans into the travel direction (capped), slow spin about it
      const tilt = Math.max(-s.tiltCap, Math.min(s.tiltCap, this.heading));
      _u.copy(up).multiplyScalar(Math.cos(tilt)).addScaledVector(right, Math.sin(tilt)).normalize();
      _a.copy(toCam).addScaledVector(_u, -toCam.dot(_u)).normalize();
      _b.crossVectors(_u, _a);
      _f.copy(_a).multiplyScalar(Math.cos(this.spinA)).addScaledVector(_b, Math.sin(this.spinA)).normalize();
      _l.crossVectors(_f, _u).normalize();
    }
    this.matrix.makeBasis(_f, _u, _l).scale(_s.set(scale, scale, scale)).setPosition(this.position);
  }
}

const _f = new Vector3();
const _u = new Vector3();
const _l = new Vector3();
const _v = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _s = new Vector3();
