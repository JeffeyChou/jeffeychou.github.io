// GLSL for the passes: points → accumulation RT, temporal smoothing, wave medium,
// per-cell glyph choice (shape matching + the medium), full-resolution glyph drawing.
import { ANIMATE_GLSL } from './creatures/animate.ts';

/** Points: four creatures live in one geometry (aP0..3 / aN0..3 / aM0..3); uniforms pick A and B. */
export const POINTS_VERT = /* glsl */ `
precision highp float;
precision highp int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

in vec3 aP0; in vec3 aP1; in vec3 aP2; in vec3 aP3;
in vec3 aN0; in vec3 aN1; in vec3 aN2; in vec3 aN3;
in vec3 aM0; in vec3 aM1; in vec3 aM2; in vec3 aM3;
in float aSeed;

uniform int uA;
uniform int uB;
uniform float uMorph;     // 0..1 scroll-scrubbed
uniform float uTimeA;     // per-creature animation clocks
uniform float uTimeB;
uniform float uPoseA;
uniform float uPoseB;
uniform float uAmp;       // idle motion amplitude (0 when motion is off)
uniform float uGrain;     // ink-grain scatter strength at mid-morph
uniform float uDissolve;  // 1 = reduced-motion dissolve instead of flight
uniform float uPointSize;
uniform vec3 uLight;      // view-space light direction
uniform mat4 uModelA;     // free-swimming world transforms
uniform mat4 uModelB;
uniform vec2 uDepth;      // (camera distance to the creature, half depth range)

out float vShade;
out float vWeight;
out float vAccent;
out float vDepth;

vec3 pick(int k, vec3 a, vec3 b, vec3 c, vec3 d) {
  return k == 0 ? a : (k == 1 ? b : (k == 2 ? c : d));
}

${ANIMATE_GLSL}

// cheap divergence-free-ish swirl (sum of rotated sines), good enough for grain
vec3 swirl(vec3 p, float t) {
  return vec3(
    sin(p.y * 2.1 + t * 0.7) + sin(p.z * 3.3 - t * 0.5),
    sin(p.z * 1.9 - t * 0.6) + sin(p.x * 2.7 + t * 0.4),
    sin(p.x * 2.3 + t * 0.5) + sin(p.y * 3.1 - t * 0.7)
  ) * 0.5;
}

void main() {
  vec3 pa = pick(uA, aP0, aP1, aP2, aP3);
  vec3 na = pick(uA, aN0, aN1, aN2, aN3);
  vec3 ma = pick(uA, aM0, aM1, aM2, aM3);
  vec3 pb = pick(uB, aP0, aP1, aP2, aP3);
  vec3 nb = pick(uB, aN0, aN1, aN2, aN3);
  vec3 mb = pick(uB, aM0, aM1, aM2, aM3);

  vec3 a = (uModelA * vec4(creatureAnimate(uA, pa, ma.x, ma.yz, uTimeA, uPoseA, uAmp), 1.0)).xyz;
  na = mat3(uModelA) * na;
  vec3 pos;
  vec3 nrm;
  float grainW = 0.0;
  if (uMorph <= 0.0001) {
    pos = a; nrm = na;
  } else {
    vec3 b = (uModelB * vec4(creatureAnimate(uB, pb, mb.x, mb.yz, uTimeB, uPoseB, uAmp), 1.0)).xyz;
    nb = mat3(uModelB) * nb;
    if (uDissolve > 0.5) {
      bool useB = aSeed < uMorph;
      pos = useB ? b : a;
      nrm = useB ? nb : na;
    } else {
      // staggered flight: points leave in a wave, so the silhouette loosens before it travels
      float d = clamp(uMorph * 1.55 - aSeed * 0.55, 0.0, 1.0);
      float e = d * d * (3.0 - 2.0 * d);
      pos = mix(a, b, e);
      nrm = normalize(mix(na, nb, e) + vec3(1e-4));
      grainW = sin(3.14159265 * e);
      pos += grainW * uGrain * swirl(pos * 2.4 + aSeed * 6.0, uTimeA);
    }
  }

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  vDepth = clamp(0.5 + (-mv.z - uDepth.x) / (2.0 * uDepth.y), 0.0, 1.0);

  vec3 n = normalize(normalMatrix * nrm);
  vec3 v = normalize(-mv.xyz);
  float facing = dot(n, v);
  if (facing < 0.0) n = -n;                  // thin sheets (fins, wings) are lit from both sides
  float lambert = max(dot(n, normalize(uLight)), 0.0);
  float rim = pow(1.0 - abs(facing), 3.0);
  vShade = 0.18 + 0.82 * lambert;
  vWeight = (facing < 0.0 ? 0.55 : 1.0) * (1.0 - 0.45 * grainW);
  vAccent = clamp(rim * 0.9 + pow(lambert, 12.0) * 0.6, 0.0, 1.0);
  gl_PointSize = uPointSize * (1.0 + 0.6 * grainW);
}
`;

export const POINTS_FRAG = /* glsl */ `
precision highp float;
in float vShade;
in float vWeight;
in float vAccent;
in float vDepth;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float f = exp(-dot(c, c) * 7.0);
  float w = vWeight * f;
  outColor = vec4(vShade * w, w, vAccent * w, vDepth * w);
}
`;

export const QUAD_VERT = /* glsl */ `
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Exponential moving average of the accumulation buffer: kills single-frame glyph flicker. */
export const TEMPORAL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uPrev;
uniform sampler2D uCur;
uniform float uKeep;
in vec2 vUv;
out vec4 outColor;
void main() {
  outColor = mix(texture(uCur, vUv), texture(uPrev, vUv), uKeep);
}
`;

/**
 * The medium the creatures move through: a damped 2D wave equation on the glyph grid (one texel per
 * cell). The source is the change in creature coverage, so a moving or flexing body pushes the
 * medium at its leading edge and pulls it at its trailing edge; a still body makes no waves.
 * State: r = height, g = previous height, b = coverage at the last step.
 */
export const WAVE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uWave;
uniform sampler2D uAcc;
uniform vec2 uSize;         // wave texels (cells, rounded up)
uniform vec2 uCells;        // glyph grid (fractional)
uniform float uDensity;     // coverage gain (same as the glyph pass)
uniform float uC2;          // (horizontal wave speed in cells per step)^2
uniform float uKy;          // vertical Laplacian weight = (cell width / cell height)^2, keeps rings round
uniform float uDamp;        // velocity kept per step
uniform float uGain;        // source strength
in vec2 vUv;
out vec4 outColor;

float cover(vec2 p) {
  float w = texture(uAcc, p / uCells).g;
  return 1.0 - exp(-w * uDensity);
}

void main() {
  vec2 cell = floor(vUv * uSize);
  vec2 t = 1.0 / uSize;
  vec2 uv = (cell + 0.5) * t;
  vec4 s = texture(uWave, uv);
  float hl = texture(uWave, uv - vec2(t.x, 0.0)).r;
  float hr = texture(uWave, uv + vec2(t.x, 0.0)).r;
  float hd = texture(uWave, uv - vec2(0.0, t.y)).r;
  float hu = texture(uWave, uv + vec2(0.0, t.y)).r;
  float lap = (hl + hr - 2.0 * s.r) + uKy * (hd + hu - 2.0 * s.r);
  float h = s.r + (s.r - s.g) * uDamp + uC2 * lap;

  // coverage, lightly blurred (one cell). Keep it light: a wider blur, temporal smoothing and
  // viscosity were tried and rejected, they erased the fine ripples and made them die too fast
  vec2 pc = cell + 0.5;
  float c = 0.5 * cover(pc)
          + 0.125 * (cover(pc + vec2(1.0, 0.0)) + cover(pc - vec2(1.0, 0.0))
                   + cover(pc + vec2(0.0, 1.0)) + cover(pc - vec2(0.0, 1.0)));
  h += uGain * clamp(c - s.b, -0.3, 0.3);

  // absorbing border: waves fade out at the screen edges instead of bouncing back
  vec2 e = min(cell, uSize - 1.0 - cell);
  h *= mix(0.9, 1.0, smoothstep(0.0, 8.0, min(e.x, e.y * 1.72)));
  h *= 0.999;
  outColor = vec4(clamp(h, -4.0, 4.0), s.r, c, 1.0);
}
`;

/**
 * Per-cell pass (one texel per glyph cell). Picks what each cell shows:
 * - creature: the cell's coverage is sampled at 2×3 sub-positions and matched to the glyph whose ink
 *   lies in the same places (shape matching, so edges get / \ | _ ( ) and the body gets dense glyphs);
 * - otherwise the medium: a faint dot lattice that breathes slowly and ripples where the wave is.
 * Output: r = glyph index + 0.5 (+ refraction x; negative for the medium), g = colour position
 * (0 near, 0.5 mid, 1 far), b = alpha, a = refraction y.
 */
export function cellFrag(glyphs: number): string {
  return /* glsl */ `
precision highp float;
#define N ${glyphs}
uniform sampler2D uAcc;
uniform sampler2D uWave;
uniform sampler2D uPrev;    // last frame's choices (hysteresis against flicker)
uniform vec2 uCells;        // glyph grid (fractional)
uniform vec2 uSize;         // cell texels (cells, rounded up)
uniform float uDensity;
uniform float uAlpha;
uniform vec3 uShapeA[N];    // ink per region: (top-left, top-right, mid-left)
uniform vec3 uShapeB[N];    //                 (mid-right, bottom-left, bottom-right)
uniform vec2 uInfo[N];      // (mean ink, 1 = allowed in flat cells)
uniform vec2 uEdge;         // in-cell structure (relative spread) where shape matching fades in
uniform float uContrast;    // sharpens the in-cell pattern so edges pick edge glyphs
uniform float uGain;        // tone curve: ink = gain * value^gamma (the old ramp's light-to-dense feel)
uniform float uGamma;
uniform float uHold;        // keep last frame's glyph unless the new one is this much better
uniform float uDither;
uniform float uTime;
uniform vec4 uField;        // x: resting dot alpha, y: wave height gain, z: wave alpha, w: on
uniform vec3 uFieldIdx;     // glyph indices for the medium: dot, dash, tilde
in vec2 vUv;
out vec4 outColor;

float value(vec2 cell, vec2 o) {
  vec4 a = texture(uAcc, (cell + o) / uCells);
  float w = a.g;
  if (w < 1e-4) return 0.0;
  float cov = 1.0 - exp(-w * uDensity);
  return cov * (0.3 + 0.7 * a.r / w) * (1.0 - 0.25 * a.a / w);
}

// |cell - glyph|² split into tone (mean) and shape (deviation from the mean). A flat cell (k = 0)
// compares tone only, among the fill glyphs; a cell with an edge in it (k = 1) compares everything.
float dist(int i, vec3 sa, vec3 sb, float mu, float k) {
  vec2 info = uInfo[i];
  float dm = mu - info.x;
  vec3 ea = (sa - mu) - (uShapeA[i] - info.x);
  vec3 eb = (sb - mu) - (uShapeB[i] - info.x);
  return 6.0 * dm * dm + k * (dot(ea, ea) + dot(eb, eb)) + (1.0 - k) * (1.0 - info.y) * 0.05;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 cell = floor(vUv * uSize);

  // ---- creature
  vec3 sa = vec3(value(cell, vec2(0.25, 0.8333)), value(cell, vec2(0.75, 0.8333)), value(cell, vec2(0.25, 0.5)));
  vec3 sb = vec3(value(cell, vec2(0.75, 0.5)), value(cell, vec2(0.25, 0.1667)), value(cell, vec2(0.75, 0.1667)));
  float m = max(max(max(sa.x, sa.y), max(sa.z, sb.x)), max(sb.y, sb.z));
  if (m > 0.01) {
    sa = pow(sa / m, vec3(uContrast)) * m;
    sb = pow(sb / m, vec3(uContrast)) * m;
    sa = uGain * pow(sa, vec3(uGamma));
    sb = uGain * pow(sb, vec3(uGamma));
    // a small fixed per-cell dither on tone, so flat areas mix neighbouring glyphs, not long runs
    float mu = (sa.x + sa.y + sa.z + sb.x + sb.y + sb.z) / 6.0 + (hash(cell * 0.618) - 0.5) * uDither;
    vec3 da = sa - mu;
    vec3 db = sb - mu;
    float spread = sqrt((dot(da, da) + dot(db, db)) / 6.0) / (mu + 0.03);
    float k = smoothstep(uEdge.x, uEdge.y, spread);
    int best = 0;
    float bestD = 1e9;
    for (int i = 0; i < N; i++) {
      float d = dist(i, sa, sb, mu, k);
      if (d < bestD) { bestD = d; best = i; }
    }
    float prev = texture(uPrev, vUv).r;
    if (prev > 0.0) {
      int pi = int(prev);
      if (pi != best && dist(pi, sa, sb, mu, k) <= bestD * (1.0 + uHold) + 0.0005) best = pi;
    }
    if (best > 0) {
      vec4 acc = texture(uAcc, (cell + 0.5) / uCells);
      float w = max(acc.g, 1e-4);
      float cov = 1.0 - exp(-acc.g * uDensity);
      float dd = smoothstep(0.0, 1.0, clamp((acc.a - 0.22 * acc.b) / w, 0.0, 1.0));
      float alpha = uAlpha * smoothstep(0.0, 0.25, cov + 0.05) * mix(1.0, 0.78, dd);
      outColor = vec4(float(best) + 0.5, dd, alpha, 0.0);
      return;
    }
  }

  // ---- the medium
  outColor = vec4(0.0);
  if (uField.w < 0.5) return;
  vec2 t = 1.0 / uSize;
  vec2 uv = (cell + 0.5) * t;
  vec4 wv = texture(uWave, uv);
  // right against the body the medium stays quiet, so the outline is not blurred by a halo
  float quiet = 1.0 - smoothstep(0.02, 0.2, wv.b);
  float h = wv.r * uField.y * quiet;
  vec2 grad = 0.5 * uField.y * quiet *
    vec2(texture(uWave, uv + vec2(t.x, 0.0)).r - texture(uWave, uv - vec2(t.x, 0.0)).r,
         texture(uWave, uv + vec2(0.0, t.y)).r - texture(uWave, uv - vec2(0.0, t.y)).r);

  // ripples are drawn as contour lines of the wave height (about one cell wide), so a bump reads
  // as thin rings spreading outward rather than a filled patch; level water draws no line at all
  const float SPACING = 0.3;
  float lv = abs(h) / SPACING;
  float dl = abs(fract(lv + 0.5) - 0.5) / max(length(grad) / SPACING, 1e-3); // cells to the contour
  float ring = (1.0 - smoothstep(0.45, 1.2, dl)) * smoothstep(0.5, 1.0, lv) * clamp(abs(h), 0.0, 1.0);

  // resting lattice: a checkerboard on the 1:1.72 cell grid is very nearly hexagonal; it breathes
  // with a slow two-octave drift so it is mostly barely there
  bool lattice = mod(cell.x + cell.y, 2.0) < 0.5;
  vec2 q = cell * vec2(1.0, 1.72);
  float n = 0.65 * vnoise(q * 0.045 + vec2(0.05, 0.02) * uTime)
          + 0.35 * vnoise(q * 0.11 - vec2(0.03, -0.06) * uTime);
  float rest = smoothstep(0.3, 0.8, n);

  float a = uField.z * ring;
  if (lattice) a += uField.x * (0.2 + 0.8 * rest);
  else a *= smoothstep(0.35, 0.7, ring);
  if (a < 0.004) return;
  float idx = ring > 0.9 ? uFieldIdx.z : (ring > 0.6 ? uFieldIdx.y : uFieldIdx.x);
  // a little refraction: dots shift down the slope, as if seen through the surface
  vec2 o = clamp(grad * 0.5, -0.3, 0.3);
  outColor = vec4(-(idx + 0.5 + o.x), 0.5 - 0.3 * ring, a, o.y);
}
`;
}

/** Full-resolution pass: draw each cell's chosen glyph from the atlas. */
export const DRAW_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uCell;
uniform sampler2D uAtlas;
uniform vec2 uCells;        // glyph grid (fractional)
uniform vec2 uSize;         // cell texels
uniform vec2 uGrid;         // atlas slots (columns, rows)
uniform vec3 uNear;         // one hue, three depths
uniform vec3 uMid;
uniform vec3 uFar;
uniform float uFade;        // global fade (route transitions)
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 p = vUv * uCells;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec4 c = texture(uCell, (cell + 0.5) / uSize);
  if (c.b < 0.004) discard;
  float r = abs(c.r);
  float idx = floor(r);
  vec2 fs = clamp(f - vec2(fract(r) - 0.5, c.a), 0.0, 1.0);
  float col = mod(idx, uGrid.x);
  float row = floor(idx / uGrid.x);
  vec2 g = vec2((col + mix(0.04, 0.96, fs.x)) / uGrid.x, (uGrid.y - 1.0 - row + mix(0.02, 0.98, fs.y)) / uGrid.y);
  // mip level from the continuous grid coordinate: g jumps at every cell edge, and letting the GPU
  // differentiate that would pick the blurriest level there and outline each cell with a faint box
  vec2 k = vec2(0.92 / uGrid.x, 0.96 / uGrid.y);
  float ink = textureGrad(uAtlas, g, dFdx(p) * k, dFdy(p) * k).r;
  float t = c.g;
  vec3 colr = t < 0.5 ? mix(uNear, uMid, t * 2.0) : mix(uMid, uFar, t * 2.0 - 1.0);
  float a = ink * c.b * uFade;
  outColor = vec4(colr * a, a);
}
`;

/** Debug: draw accumulation directly (dev page). */
export const RAW_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAcc;
uniform vec3 uMid;
uniform float uDensity;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 acc = texture(uAcc, vUv);
  float cov = 1.0 - exp(-acc.g * uDensity);
  float shade = acc.r / max(acc.g, 1e-4);
  float a = cov * (0.3 + 0.7 * shade);
  outColor = vec4(uMid * a, a);
}
`;
