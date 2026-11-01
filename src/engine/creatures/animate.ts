import type { CreatureName } from './types.ts';

/** World locomotion suggestions: radii/s, radians/s, vertical bob in radii.
 * Local deformation below does not translate the creature along a world path. */
export const GAIT: Record<CreatureName, { speed: number; turn: number; bob: number }> = {
  goldfish: { speed: 0.32, turn: 0.75, bob: 0.025 },
  dragonfly: { speed: 0.65, turn: 1.5, bob: 0.02 },
  jellyfish: { speed: 0.13, turn: 0.35, bob: 0.03 },
  butterfly: { speed: 0.40, turn: 1.1, bob: 0.06 },
};

/** Full effort/recovery cycles in real seconds, NOT individual wing/tail beats.
 * Pass the same unscaled per-creature clock to animatePoint/the shader and thrust. */
export const PULSE_PERIOD: Record<CreatureName, number> = {
  goldfish: 3.6, dragonfly: 4.8, jellyfish: 1.8, butterfly: 4,
};

// Keep these scalar helpers numerically identical to the GLSL helpers below.
function creatureCycle(t: number, period: number): number {
  return t - period * Math.floor(t / period);
}
function creatureSmooth(x: number): number {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}
function creatureEffort(s: number, end: number, ramp: number): number {
  return creatureSmooth(s / ramp) * (1 - creatureSmooth((s - end + ramp) / ramp));
}
function creatureFishRate(t: number): number {
  // Small exact integers avoid the CPU/GPU drift of sin-based hash functions.
  const k = creatureCycle(Math.floor(t / 3.6), 97);
  return 1.2 * (0.96 + 0.08 * creatureCycle(k * 37 + 17, 97) / 96);
}
function creatureJellyPulse(t: number): number {
  const p = creatureCycle(t, 1.8) / 1.8;
  if (p < 0.28) {
    const q = p / 0.28;
    return q * q * q * (4 - 3 * q);
  }
  if (p < 0.38) return 1;
  const r = (p - 0.38) / 0.62, a = 1 - r;
  const flare = Math.sin(3.141592653589793 * r);
  return a * a * a * (1 + 3 * r) - 0.12 * flare * flare;
}

/** Instantaneous propulsion [0,1], and drag in s^-1 for v'=thrust*gain-drag*v.
 * Phase matches full-amplitude body motion at every pose. Reduced-motion callers
 * must disable locomotion themselves: amp is intentionally not part of this API.
 * Unknown IDs produce no thrust. Non-finite clocks return a safe resting value. */
export function thrust(id: number, t: number): { thrust: number; drag: number } {
  if (!Number.isFinite(t)) return { thrust: 0, drag: 1 };
  if (id === 0) {
    const s = creatureCycle(t, 3.6), effort = creatureEffort(s, 2.3, 0.16);
    const beat = Math.cos(6.283185307179586 * creatureFishRate(t) * s - 3.5);
    return { thrust: effort * (0.35 + 0.65 * beat * beat), drag: 0.35 + 0.35 * effort };
  }
  if (id === 1) {
    const effort = creatureEffort(creatureCycle(t, 4.8), 4.3, 0.12);
    return { thrust: 0.08 + 0.72 * effort, drag: 0.30 + 0.35 * effort };
  }
  if (id === 2) {
    const p = creatureCycle(t, 1.8) / 1.8, q = p / 0.28;
    const pulse = Math.max(0, Math.min(1, creatureJellyPulse(t)));
    return { thrust: p < 0.28 ? 6.75 * q * q * (1 - q) : 0, drag: 1.2 - 0.75 * pulse };
  }
  if (id === 3) {
    const s = creatureCycle(t, 4), effort = creatureEffort(s, 3, 0.18);
    // Downstroke (decreasing wing angle) supplies the larger impulse.
    const down = 0.5 - 0.5 * Math.cos(6.283185307179586 * s);
    return { thrust: 0.06 + effort * (0.24 + 0.70 * down * down), drag: 0.25 + 0.45 * effort };
  }
  return { thrust: 0, drag: 1 };
}

/** TS mirror of ANIMATE_GLSL. amp=0 freezes time, but preserves scroll pose.
 * Fish: 2.65–2.87 beats near 1.2 Hz, then 1.3 s coast. Dragonfly: 2 Hz + glide.
 * Jellyfish: .556 Hz, 28% contraction / 10% hold / 62% recovery with overshoot.
 * Butterfly: three 1 Hz, ±55° flaps, then 1 s open-wing glide. */
export function animatePoint(id: number, x: number, y: number, z: number,
  part: number, u: number, v: number, t: number, pose: number, amp: number,
  out: Float32Array, o: number): void {
  pose = Math.max(0, Math.min(1, pose));
  amp = Math.max(0, Math.min(1, amp));
  if (id === 0) {
    const s = creatureCycle(t, 3.6), effort = creatureEffort(s, 2.3, 0.16);
    const phase = 6.283185307179586 * creatureFishRate(t) * s;
    if (part === 1) {
      const hinge = 2 * u - 1;
      const angle = 0.4363323129985824 * amp * (effort * Math.sin(phase - 3.5) + 0.035 * (1 - effort) * Math.sin(2 * t));
      const dx = x - hinge;
      x = hinge + dx * Math.cos(angle) - z * Math.sin(angle);
      z = dx * Math.sin(angle) + z * Math.cos(angle) + 0.07 * amp * effort * Math.sin(phase - 3);
      z += 0.026 * amp * v * v * (effort * Math.sin(1.8 * phase - 12 * v + 8 * y) + 0.12 * (1 - effort) * Math.sin(2 * t - 8 * v));
      y += 0.018 * amp * v * v * (effort * Math.cos(phase - 9 * v + 6 * y) + 0.12 * (1 - effort) * Math.cos(2 * t - 6 * v));
    } else {
      z += 0.07 * amp * effort * u * u * u * Math.sin(phase - 3 * u);
      if (part === 3) {
        const side = z < 0 ? -1 : 1, paddle = 4.71238898038469 * t + side * 1.5707963267948966;
        const scull = 1 - 0.65 * effort;
        z += side * 0.065 * amp * scull * v * Math.sin(paddle);
        y += 0.08 * amp * scull * v * Math.cos(paddle);
        x += 0.025 * amp * scull * v * Math.sin(paddle);
      } else if (part === 2 || part === 4 || part === 5) {
        z += 0.032 * amp * v * v * (effort * Math.sin(1.6 * phase - 5 * u) + 0.12 * (1 - effort) * Math.sin(2 * t - 5 * u));
        y += 0.018 * amp * v * (effort * Math.cos(phase - 4 * u) + 0.12 * (1 - effort) * Math.cos(2 * t - 4 * u));
      } else if (part === 7) {
        x += 0.006 * amp * Math.sin(4.084070449666731 * t);
        y += 0.004 * amp * Math.cos(4.084070449666731 * t);
      } else if (part === 8) {
        z += (z < 0 ? -1 : 1) * 0.008 * amp * Math.sin(4.084070449666731 * t - 0.4);
      }
    }
    const bend = 0.26 * (1 - pose), xx = x * Math.cos(bend) + z * Math.sin(bend);
    z = z * Math.cos(bend) - x * Math.sin(bend); x = xx;
  } else if (id === 1) {
    const s = creatureCycle(t, 4.8), effort = creatureEffort(s, 4.3, 0.12);
    if (part === 4 || part === 5 || part === 7) {
      const phase = part === 5 || (part === 7 && u > 0.5) ? 1.65 : 0;
      const angle = 0.20 * (1 - pose) * (1 - amp) + 0.5235987755982988 * amp * effort * Math.sin(12.566370614359172 * s + phase);
      const side = z < 0 ? -1 : 1, yy = y * Math.cos(angle) + Math.abs(z) * Math.sin(angle);
      z = z * Math.cos(angle) - side * y * Math.sin(angle); y = yy;
      x += 0.035 * (1 - pose) * v;
    } else if (part === 3 || part === 10) {
      y += 0.020 * amp * u * u * Math.sin(2.6 * t - 3 * u);
      z += 0.014 * amp * u * u * Math.sin(2 * t - 4 * u);
    } else if (part === 1 || part === 2 || part === 9) {
      const angle = 0.04 * amp * Math.sin(2.4 * t), dx = x - 0.25;
      x = 0.25 + dx * Math.cos(angle) - z * Math.sin(angle);
      z = dx * Math.sin(angle) + z * Math.cos(angle);
    }
    y += 0.010 * amp * Math.sin(2.6 * t);
  } else if (id === 2) {
    const pulse = creatureJellyPulse(t);
    if (part <= 3) {
      const scale = 1 - 0.28 * amp * pulse * (0.35 + 0.65 * v * v);
      x *= scale; z *= scale;
      // The pivot lies between the normalized rim and crown: rim down, crown up.
      y = 0.20 + (y - 0.20) * (1 + 0.13 * amp * pulse);
    } else {
      const attach = (1 - v) * (1 - v), lagPulse = creatureJellyPulse(t - 0.30 * v);
      const bundle = Math.max(0, Math.min(1, lagPulse));
      const scale = 1 - 0.28 * amp * (pulse * attach + lagPulse * (1 - attach) * (1 + 0.5 * v)) + 0.08 * amp * (1 - bundle) * v;
      const lag = 3.490658503988659 * t - 5 * v + 6.283185307179586 * u;
      const drift = 0.065 * amp * v * (1 - 0.75 * bundle);
      x = x * scale + drift * Math.sin(lag);
      z = z * scale + drift * Math.cos(lag);
      y += -0.0104 * amp * pulse * attach - 0.025 * amp * bundle * v + 0.025 * amp * v * (1 - bundle) * Math.cos(lag);
      if (part === 4) y += 0.018 * amp * v * Math.sin(24 * v - 6.981317007977318 * t + 8 * u);
    }
  } else if (id === 3) {
    const s = creatureCycle(t, 4), effort = creatureEffort(s, 3, 0.18);
    const phase = 6.283185307179586 * s;
    const wing = part === 2 || part === 3 || part === 5 || part === 8 || part >= 9;
    if (wing) {
      const angle = 1.38 * (1 - pose) * (1 - amp) + amp * (0.9599310885968813 * effort * Math.sin(phase) + 0.14 * (1 - effort));
      const side = z < 0 ? -1 : 1, yy = y * Math.cos(angle) + Math.abs(z) * Math.sin(angle);
      z = z * Math.cos(angle) - side * y * Math.sin(angle); y = yy;
    } else if (part === 4 || part === 6) {
      z += 0.020 * amp * v * Math.sin(2 * t + 5 * u);
      y += 0.012 * amp * v * Math.cos(2 * t);
    }
    y += 0.020 * amp * effort * Math.sin(phase + 0.4);
  }
  const radius2 = x * x + y * y + z * z;
  const scale = radius2 > 1.44 ? 1.2 / Math.sqrt(radius2) : 1;
  out[o] = x * scale; out[o + 1] = y * scale; out[o + 2] = z * scale;
}

/** GLSL ES 3.0. Scalar timing helpers mirror TypeScript above; no uniforms. */
export const ANIMATE_GLSL = /* glsl */ `
float creatureCycle(float t, float period) {
  return t - period * floor(t / period);
}
float creatureSmooth(float x) {
  x = max(0.0, min(1.0, x));
  return x * x * (3.0 - 2.0 * x);
}
float creatureEffort(float s, float end, float ramp) {
  return creatureSmooth(s / ramp) * (1.0 - creatureSmooth((s - end + ramp) / ramp));
}
float creatureFishRate(float t) {
  // Small exact integers avoid the CPU/GPU drift of sin-based hash functions.
  float k = creatureCycle(floor(t / 3.6), 97.0);
  return 1.2 * (0.96 + 0.08 * creatureCycle(k * 37.0 + 17.0, 97.0) / 96.0);
}
float creatureJellyPulse(float t) {
  float p = creatureCycle(t, 1.8) / 1.8;
  if (p < 0.28) {
    float q = p / 0.28;
    return q * q * q * (4.0 - 3.0 * q);
  }
  if (p < 0.38) return 1.0;
  float r = (p - 0.38) / 0.62, a = 1.0 - r;
  float flare = sin(3.141592653589793 * r);
  return a * a * a * (1.0 + 3.0 * r) - 0.12 * flare * flare;
}

vec3 creatureAnimate(int id, vec3 p, float part, vec2 local, float t, float pose, float amp) {
  float species = float(id);
  float u = local.x; float v = local.y;
  pose = max(0.0, min(1.0, pose));
  amp = max(0.0, min(1.0, amp));
  if (species == 0.0) {
    float s = creatureCycle(t, 3.6), effort = creatureEffort(s, 2.3, 0.16);
    float phase = 6.283185307179586 * creatureFishRate(t) * s;
    if (part == 1.0) {
      float hinge = 2.0 * u - 1.0;
      float angle = 0.4363323129985824 * amp * (effort * sin(phase - 3.5) + 0.035 * (1.0 - effort) * sin(2.0 * t));
      float dx = p.x - hinge;
      p.x = hinge + dx * cos(angle) - p.z * sin(angle);
      p.z = dx * sin(angle) + p.z * cos(angle) + 0.07 * amp * effort * sin(phase - 3.0);
      p.z += 0.026 * amp * v * v * (effort * sin(1.8 * phase - 12.0 * v + 8.0 * p.y) + 0.12 * (1.0 - effort) * sin(2.0 * t - 8.0 * v));
      p.y += 0.018 * amp * v * v * (effort * cos(phase - 9.0 * v + 6.0 * p.y) + 0.12 * (1.0 - effort) * cos(2.0 * t - 6.0 * v));
    } else {
      p.z += 0.07 * amp * effort * u * u * u * sin(phase - 3.0 * u);
      if (part == 3.0) {
        float side = p.z < 0.0 ? -1.0 : 1.0, paddle = 4.71238898038469 * t + side * 1.5707963267948966;
        float scull = 1.0 - 0.65 * effort;
        p.z += side * 0.065 * amp * scull * v * sin(paddle);
        p.y += 0.08 * amp * scull * v * cos(paddle);
        p.x += 0.025 * amp * scull * v * sin(paddle);
      } else if (part == 2.0 || part == 4.0 || part == 5.0) {
        p.z += 0.032 * amp * v * v * (effort * sin(1.6 * phase - 5.0 * u) + 0.12 * (1.0 - effort) * sin(2.0 * t - 5.0 * u));
        p.y += 0.018 * amp * v * (effort * cos(phase - 4.0 * u) + 0.12 * (1.0 - effort) * cos(2.0 * t - 4.0 * u));
      } else if (part == 7.0) {
        p.x += 0.006 * amp * sin(4.084070449666731 * t);
        p.y += 0.004 * amp * cos(4.084070449666731 * t);
      } else if (part == 8.0) {
        p.z += (p.z < 0.0 ? -1.0 : 1.0) * 0.008 * amp * sin(4.084070449666731 * t - 0.4);
      }
    }
    float bend = 0.26 * (1.0 - pose), xx = p.x * cos(bend) + p.z * sin(bend);
    p.z = p.z * cos(bend) - p.x * sin(bend); p.x = xx;
  } else if (species == 1.0) {
    float s = creatureCycle(t, 4.8), effort = creatureEffort(s, 4.3, 0.12);
    if (part == 4.0 || part == 5.0 || part == 7.0) {
      float phase = part == 5.0 || (part == 7.0 && u > 0.5) ? 1.65 : 0.0;
      float angle = 0.20 * (1.0 - pose) * (1.0 - amp) + 0.5235987755982988 * amp * effort * sin(12.566370614359172 * s + phase);
      float side = p.z < 0.0 ? -1.0 : 1.0, yy = p.y * cos(angle) + abs(p.z) * sin(angle);
      p.z = p.z * cos(angle) - side * p.y * sin(angle); p.y = yy;
      p.x += 0.035 * (1.0 - pose) * v;
    } else if (part == 3.0 || part == 10.0) {
      p.y += 0.020 * amp * u * u * sin(2.6 * t - 3.0 * u);
      p.z += 0.014 * amp * u * u * sin(2.0 * t - 4.0 * u);
    } else if (part == 1.0 || part == 2.0 || part == 9.0) {
      float angle = 0.04 * amp * sin(2.4 * t), dx = p.x - 0.25;
      p.x = 0.25 + dx * cos(angle) - p.z * sin(angle);
      p.z = dx * sin(angle) + p.z * cos(angle);
    }
    p.y += 0.010 * amp * sin(2.6 * t);
  } else if (species == 2.0) {
    float pulse = creatureJellyPulse(t);
    if (part <= 3.0) {
      float scale = 1.0 - 0.28 * amp * pulse * (0.35 + 0.65 * v * v);
      p.x *= scale; p.z *= scale;
      // The pivot lies between the normalized rim and crown: rim down, crown up.
      p.y = 0.20 + (p.y - 0.20) * (1.0 + 0.13 * amp * pulse);
    } else {
      float attach = (1.0 - v) * (1.0 - v), lagPulse = creatureJellyPulse(t - 0.30 * v);
      float bundle = max(0.0, min(1.0, lagPulse));
      float scale = 1.0 - 0.28 * amp * (pulse * attach + lagPulse * (1.0 - attach) * (1.0 + 0.5 * v)) + 0.08 * amp * (1.0 - bundle) * v;
      float lag = 3.490658503988659 * t - 5.0 * v + 6.283185307179586 * u;
      float drift = 0.065 * amp * v * (1.0 - 0.75 * bundle);
      p.x = p.x * scale + drift * sin(lag);
      p.z = p.z * scale + drift * cos(lag);
      p.y += -0.0104 * amp * pulse * attach - 0.025 * amp * bundle * v + 0.025 * amp * v * (1.0 - bundle) * cos(lag);
      if (part == 4.0) p.y += 0.018 * amp * v * sin(24.0 * v - 6.981317007977318 * t + 8.0 * u);
    }
  } else if (species == 3.0) {
    float s = creatureCycle(t, 4.0), effort = creatureEffort(s, 3.0, 0.18);
    float phase = 6.283185307179586 * s;
    bool wing = part == 2.0 || part == 3.0 || part == 5.0 || part == 8.0 || part >= 9.0;
    if (wing) {
      float angle = 1.38 * (1.0 - pose) * (1.0 - amp) + amp * (0.9599310885968813 * effort * sin(phase) + 0.14 * (1.0 - effort));
      float side = p.z < 0.0 ? -1.0 : 1.0, yy = p.y * cos(angle) + abs(p.z) * sin(angle);
      p.z = p.z * cos(angle) - side * p.y * sin(angle); p.y = yy;
    } else if (part == 4.0 || part == 6.0) {
      p.z += 0.020 * amp * v * sin(2.0 * t + 5.0 * u);
      p.y += 0.012 * amp * v * cos(2.0 * t);
    }
    p.y += 0.020 * amp * effort * sin(phase + 0.4);
  }
  float radius2 = p.x * p.x + p.y * p.y + p.z * p.z;
  float scale = radius2 > 1.44 ? 1.2 / sqrt(radius2) : 1.0;
  return p * scale;
}
`;
