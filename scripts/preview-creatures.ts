import { CREATURES, CREATURE_ID, sampleCreature, matchOrder, animatePoint, thrust, PULSE_PERIOD, ANIMATE_GLSL } from '../src/engine/creatures/index.ts';
import type { CreatureCloud } from '../src/engine/creatures/types.ts';
import { seeded } from '../src/engine/creatures/types.ts';
import { renderAscii } from '../src/engine/ascii-cpu.ts';

// This CLI needs no @types/node dependency.
declare const process: { readonly argv: readonly string[]; exit(code?: number): never };
// Node 26: node scripts/preview-creatures.ts [--compact] [--check] [--phone] [--motion]
// Default: 220x80, 60k points. --compact: 100x40 three-quarter views.
// --phone: 16k points. --check: assertions/metrics only. --motion: extra moving poses.
// --timeline jellyfish: 20 landmark measurements over two cycles, no sampling benchmark.
// --parity-html > /tmp/creature-parity.html: standalone WebGL2 transform-feedback test.
// Open that HTML in a browser, or use Chrome --headless --dump-dom on its file URL.
const timelineAt = process.argv.indexOf('--timeline');
if (timelineAt >= 0) {
  if (process.argv[timelineAt + 1] !== 'jellyfish') throw new Error('Usage: --timeline jellyfish');
  const point = new Float32Array(6), period = PULSE_PERIOD.jellyfish;
  console.log('Jellyfish: period 1.8 s; contraction 28%, hold 10%, recovery 62%; amp=1 pose=.6.');
  console.log('Canonical rest landmarks: rim (0.585,0.12,0), crown (0,0.33,0), in unit-cloud radii.');
  console.log('t(s)   phase  rim(r) rim/rest height(r) height/rest thrust  drag(/s)');
  for (let i = 0; i < 20; i++) {
    const t = 2 * period * i / 19;
    animatePoint(2, 0.585, 0.12, 0, 1, 0, 1, t, 0.6, 1, point, 0);
    animatePoint(2, 0, 0.33, 0, 0, 0, 0, t, 0.6, 1, point, 3);
    const radius = Math.hypot(point[0]!, point[2]!), height = point[4]! - point[1]!;
    const drive = thrust(2, t);
    console.log(`${t.toFixed(3).padStart(5)}  ${(t / period % 1).toFixed(3)}  ${radius.toFixed(4)}  ${(radius / 0.585).toFixed(4)}   ${height.toFixed(4)}    ${(height / 0.21).toFixed(4)}    ${drive.thrust.toFixed(4)}  ${drive.drag.toFixed(4)}`);
  }
  process.exit(0);
}

/** Dependency-free browser harness; checks actual compiled GLSL, not a JS substitute. */
function printParityPage(): void {
  const inputs: number[] = [], expected: number[] = [], point = new Float32Array(3);
  const times = [-0.001, 0, 1 / 60, 0.12, 0.16, 0.18, 0.336, 0.50399, 0.504, 0.50401,
    0.68399, 0.684, 0.68401, 1.2, 1.62, 1.79999, 1.8, 1.80001, 2.14, 2.29999,
    2.3, 2.30001, 2.82, 3, 3.59999, 3.6, 3.60001, 4, 4.18, 4.3, 4.79999, 4.8,
    4.80001, 7.2, 19.2, 34.2, 123.45, 240];
  for (const name of CREATURES) {
    const cloud = sampleCreature(name, 1024), used = new Map<number, number>();
    for (let i = 0; i < cloud.count; i++) {
      const part = cloud.part[i]!;
      if ((used.get(part) ?? 0) >= 2) continue;
      used.set(part, (used.get(part) ?? 0) + 1);
      for (const t of times) for (const pose of [0, 0.6, 1]) for (const amp of [0, 0.4, 1]) {
        const row = Float32Array.of(CREATURE_ID[name], cloud.position[3 * i]!, cloud.position[3 * i + 1]!,
          cloud.position[3 * i + 2]!, part, cloud.local[2 * i]!, cloud.local[2 * i + 1]!, t, pose, amp);
        inputs.push(...row);
        animatePoint(row[0]!, row[1]!, row[2]!, row[3]!, row[4]!, row[5]!, row[6]!, row[7]!, row[8]!, row[9]!, point, 0);
        const drive = thrust(row[0]!, row[7]!);
        expected.push(...point, drive.thrust, drive.drag);
      }
    }
  }
  // The production API is TS-only. This test-only GLSL expression checks that
  // its propulsion equations use the exact same timing as the compiled body helpers.
  const driveGLSL = `
vec2 testThrust(int id, float t) {
  if (id == 0) {
    float s = creatureCycle(t, 3.6), e = creatureEffort(s, 2.3, 0.16);
    float beat = cos(6.283185307179586 * creatureFishRate(t) * s - 3.5);
    return vec2(e * (0.35 + 0.65 * beat * beat), 0.35 + 0.35 * e);
  }
  if (id == 1) {
    float e = creatureEffort(creatureCycle(t, 4.8), 4.3, 0.12);
    return vec2(0.08 + 0.72 * e, 0.30 + 0.35 * e);
  }
  if (id == 2) {
    float p = creatureCycle(t, 1.8) / 1.8, q = p / 0.28;
    return vec2(p < 0.28 ? 6.75 * q * q * (1.0 - q) : 0.0, 1.2 - 0.75 * clamp(creatureJellyPulse(t), 0.0, 1.0));
  }
  float s = creatureCycle(t, 4.0), e = creatureEffort(s, 3.0, 0.18);
  float down = 0.5 - 0.5 * cos(6.283185307179586 * s);
  return vec2(0.06 + e * (0.24 + 0.70 * down * down), 0.25 + 0.45 * e);
}`;
  const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 a;
layout(location=1) in vec3 b;
layout(location=2) in vec3 c;
out vec3 tfPosition;
out vec2 tfDrive;
${ANIMATE_GLSL}
${driveGLSL}
void main() {
  tfPosition = creatureAnimate(int(a.x), a.yzw, b.x, b.yz, c.x, c.y, c.z);
  tfDrive = testThrust(int(a.x), c.x);
  gl_Position = vec4(tfPosition, 1.0);
}`;
  console.log(`<!doctype html><meta charset="utf-8"><title>Creature GLSL parity</title><pre id="result">RUNNING</pre><script>
try {
  const input = new Float32Array(${JSON.stringify(inputs)});
  const expected = ${JSON.stringify(expected)};
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) throw Error('WebGL2 unavailable');
  const compile = (kind, source) => {
    const shader = gl.createShader(kind); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, ${JSON.stringify(vertex)}));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, '#version 300 es\\nprecision highp float;out vec4 color;void main(){color=vec4(1.0);}'));
  gl.transformFeedbackVaryings(program, ['tfPosition', 'tfDrive'], gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const source = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, source); gl.bufferData(gl.ARRAY_BUFFER, input, gl.STATIC_DRAW);
  for (const [slot, size, offset] of [[0,4,0],[1,3,16],[2,3,28]]) {
    gl.enableVertexAttribArray(slot); gl.vertexAttribPointer(slot,size,gl.FLOAT,false,40,offset);
  }
  const target = gl.createBuffer(); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,target);
  gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,expected.length*4,gl.STREAM_READ);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,target);
  gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS,0,input.length/10); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);
  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,target);
  const actual = new Float32Array(expected.length); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,actual);
  let maxPositionError=0,maxDriveError=0,maxRadius=0;
  for(let i=0;i<actual.length;i++) {
    if(!Number.isFinite(actual[i])) throw Error('nonfinite GPU output');
    const error=Math.abs(actual[i]-expected[i]);
    if(i%5<3) maxPositionError=Math.max(maxPositionError,error); else maxDriveError=Math.max(maxDriveError,error);
    if(i%5===0) maxRadius=Math.max(maxRadius,Math.hypot(actual[i],actual[i+1],actual[i+2]));
  }
  const glError=gl.getError();
  if(maxPositionError>0.0004||maxDriveError>0.0004||maxRadius>1.200001||glError) throw Error(JSON.stringify({maxPositionError,maxDriveError,maxRadius,glError}));
  document.querySelector('#result').textContent='PASS '+JSON.stringify({cases:input.length/10,maxPositionError,maxDriveError,maxRadius,glError});
} catch(e) { document.querySelector('#result').textContent='FAIL '+e.stack; }
</script>`);
}
if (process.argv.includes('--parity-html')) { printParityPage(); process.exit(0); }
const compact = process.argv.includes('--compact'), checkOnly = process.argv.includes('--check');
const count = process.argv.includes('--phone') ? 16_000 : 60_000;
function assert(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fingerprint(c: CreatureCloud): number {
  const buffers = [c.position, c.normal, c.part, c.local];
  const bits = buffers.map(b => new Uint32Array(b.buffer, b.byteOffset, b.length));
  const strides = [3, 3, 1, 2];
  let total = 0;
  for (let i = 0; i < c.count; i++) {
    let h = 2166136261;
    for (let k = 0; k < bits.length; k++) for (let j = 0; j < strides[k]!; j++) {
      h = Math.imul(h ^ bits[k]![i * strides[k]! + j]!, 16777619);
    }
    total = (total + h) >>> 0;
  }
  return total;
}
function validate(c: CreatureCloud): void {
  let radius = 0;
  for (let i = 0; i < c.count; i++) {
    const j = i * 3;
    const length = Math.hypot(c.position[j]!, c.position[j + 1]!, c.position[j + 2]!);
    const normal = Math.hypot(c.normal[j]!, c.normal[j + 1]!, c.normal[j + 2]!);
    assert(Number.isFinite(length) && Math.abs(normal - 1) < 1e-5, `${c.name}: invalid position/normal ${i}`);
    assert(Number.isInteger(c.part[i]), `${c.name}: non-integral part`);
    assert(c.local[i * 2]! >= 0 && c.local[i * 2]! <= 1 && c.local[i * 2 + 1]! >= 0 && c.local[i * 2 + 1]! <= 1, 'local out of range');
    radius = Math.max(radius, length);
  }
  assert(c.count === 0 || c.count === 1 || Math.abs(radius - 1) < 1e-6, `${c.name}: radius ${radius}`);
}
const clouds: CreatureCloud[] = [];
for (const name of CREATURES) {
  const start = performance.now(), cloud = sampleCreature(name, count);
  const cold = performance.now() - start;
  validate(cloud);
  const again = sampleCreature(name, count);
  assert(fingerprint(cloud) === fingerprint(again), `${name}: not deterministic`);
  assert(cloud.position.every((v, i) => v === again.position[i]), `${name}: unstable order`);
  const times: number[] = [];
  for (let k = 0; k < 5; k++) {
    const begin = performance.now(); sampleCreature(name, count); times.push(performance.now() - begin);
  }
  times.sort((a, b) => a - b);
  console.log(`${name}: ${count} points, cold ${cold.toFixed(2)} ms, warm median ${times[2]!.toFixed(2)} ms`);
  clouds.push(cloud);
  for (const small of [0, 1, 2, 17]) validate(sampleCreature(name, small, 42));
}
const fingerprints = clouds.map(fingerprint);
const start = performance.now(); matchOrder(clouds);
console.log(`matchOrder (4 × ${count}): ${(performance.now() - start).toFixed(2)} ms`);
clouds.forEach((c, i) => assert(fingerprint(c) === fingerprints[i], `${c.name}: matching detached attributes`));
for (let k = 1; k < clouds.length; k++) {
  const a = clouds[k - 1]!, b = clouds[k]!, rng = seeded(718 + k);
  const shuffle = Uint32Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)), tmp = shuffle[i]!;
    shuffle[i] = shuffle[j]!; shuffle[j] = tmp;
  }
  let matched = 0, random = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 3, p = shuffle[i]! * 3;
    matched += Math.hypot(a.position[o]! - b.position[o]!, a.position[o + 1]! - b.position[o + 1]!, a.position[o + 2]! - b.position[o + 2]!);
    random += Math.hypot(a.position[o]! - b.position[p]!, a.position[o + 1]! - b.position[p + 1]!, a.position[o + 2]! - b.position[p + 2]!);
  }
  // Independent 1-D Wasserstein distances give a rigorous lower bound:
  // E||A-B|| >= ||(W1_x, W1_y, W1_z)|| for every possible permutation.
  const marginal: number[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const aa = Float32Array.from({ length: count }, (_, i) => a.position[i * 3 + axis]!).sort();
    const bb = Float32Array.from({ length: count }, (_, i) => b.position[i * 3 + axis]!).sort();
    let w = 0;
    for (let i = 0; i < count; i++) w += Math.abs(aa[i]! - bb[i]!);
    marginal.push(w / count);
  }
  const bound = Math.hypot(...marginal);
  console.log(`${a.name} → ${b.name}: mean matched ${(matched / count).toFixed(4)}, random ${(random / count).toFixed(4)}, ratio ${(matched / random).toFixed(3)}, lower-bound ratio ${(bound * count / random).toFixed(3)}`);
}
for (const n of [0, 1, 2, 17, 121]) {
  const aa = CREATURES.map(name => sampleCreature(name, n, 19));
  const bb = CREATURES.map(name => sampleCreature(name, n, 19));
  matchOrder(aa); matchOrder(bb);
  aa.forEach((a, k) => assert(a.position.every((v, i) => v === bb[k]!.position[i]), 'unstable matching'));
}
const blank = renderAscii(sampleCreature('goldfish', 0), { cols: 9, rows: 5, az: 0, el: 0, dist: 3, fov: 40 });
assert(blank.split('\n').length === 5 && blank.split('\n').every(line => line === ' '.repeat(9)), 'empty raster shape');
const out = new Float32Array(6);
for (const name of CREATURES) {
  const id = CREATURE_ID[name], period = PULSE_PERIOD[name];
  for (let i = -20; i <= 2000; i++) {
    const t = 2 * period * i / 1000, drive = thrust(id, t);
    assert(Number.isFinite(drive.thrust) && drive.thrust >= 0 && drive.thrust <= 1.000001 && drive.drag > 0, `${name}: invalid drive`);
    const s = t - period * Math.floor(t / period);
    if (id === 0 && s >= 2.3) assert(drive.thrust === 0, 'fish coast has thrust');
    if (id === 1 && s >= 4.3) assert(drive.thrust === 0.08, 'dragonfly glide thrust');
    if (id === 2 && s >= 0.504) assert(drive.thrust < 1e-12, 'jellyfish recovery has thrust');
    if (id === 3 && s >= 3) assert(drive.thrust === 0.06, 'butterfly glide thrust');
  }
}
// Independent landmark/derivative checks tie the API to the actual deformation.
for (const [t, radial, height] of [[0, 1, 1], [0.504, 0.72, 1.13], [0.6, 0.72, 1.13], [1.8, 1, 1]]) {
  animatePoint(2, 0.585, 0.12, 0, 1, 0, 1, t!, 0.6, 1, out, 0);
  animatePoint(2, 0, 0.33, 0, 0, 0, 0, t!, 0.6, 1, out, 3);
  assert(Math.abs(out[0]! / 0.585 - radial!) < 1e-6, 'jellyfish rim landmark');
  assert(Math.abs((out[4]! - out[1]!) / 0.21 - height!) < 1e-6, 'jellyfish height landmark');
}
for (const t of [0.07, 0.19, 0.336, 0.45]) {
  const h = 1e-4;
  animatePoint(2, 0.585, 0.12, 0, 1, 0, 1, t - h, 0.6, 1, out, 0);
  animatePoint(2, 0.585, 0.12, 0, 1, 0, 1, t + h, 0.6, 1, out, 3);
  const contractionRate = (out[0]! - out[3]!) / (2 * h * 0.585 * 0.28);
  assert(Math.abs(thrust(2, t).thrust - contractionRate * 0.504 * 0.5625) < 0.001, 'jellyfish thrust not aligned with squeeze speed');
}
assert(thrust(2, 0.336).thrust > 0.999999, 'jellyfish peak thrust');
animatePoint(2, 0.585, 0.12, 0, 1, 0, 1, 1.62, 0.6, 1, out, 0);
assert(out[0]! > 0.585, 'jellyfish passive flare missing');
for (const c of clouds) for (let i = 0; i < c.count; i += 23) {
  const j = i * 3, args = [CREATURE_ID[c.name], c.position[j]!, c.position[j + 1]!, c.position[j + 2]!, c.part[i]!, c.local[i * 2]!, c.local[i * 2 + 1]!] as const;
  for (const edge of [0, PULSE_PERIOD[c.name], 2 * PULSE_PERIOD[c.name]]) {
    animatePoint(...args, edge - 1e-5, 0.6, 1, out, 0);
    animatePoint(...args, edge + 1e-5, 0.6, 1, out, 3);
    assert(Math.hypot(out[0]! - out[3]!, out[1]! - out[4]!, out[2]! - out[5]!) < 0.001, `${c.name}: cycle-boundary snap`);
  }
  for (const pose of [0, 0.5, 1]) {
    animatePoint(...args, 0, pose, 0, out, 0);
    animatePoint(...args, 123.45, pose, 0, out, 3);
    assert(out[0] === out[3] && out[1] === out[4] && out[2] === out[5], `${c.name}: amp=0 still moves`);
    for (const t of [0, 0.13, 1.7, 19.2]) {
      animatePoint(...args, t, pose, 1, out, 0);
      assert(Math.hypot(out[0]!, out[1]!, out[2]!) <= 1.200001, `${c.name}: animation bounds`);
    }
  }
}
for (const c of clouds) {
  let travel = 0, peak = 0, samples = 0;
  for (let i = 0; i < c.count; i += 137) {
    const j = i * 3;
    for (let frame = 0; frame < Math.ceil(2 * PULSE_PERIOD[c.name] * 60); frame++) {
      for (let step = 0; step < 2; step++) animatePoint(CREATURE_ID[c.name],
        c.position[j]!, c.position[j + 1]!, c.position[j + 2]!, c.part[i]!,
        c.local[i * 2]!, c.local[i * 2 + 1]!, (frame + step) / 60, 1, 1, out, step * 3);
      const d = Math.hypot(out[3]! - out[0]!, out[4]! - out[1]!, out[5]! - out[2]!);
      travel += d; peak = Math.max(peak, d); samples++;
      assert(Math.hypot(out[3]!, out[4]!, out[5]!) <= 1.200001, 'dense-time animation bound');
    }
  }
  const camera = { cols: 220, rows: 80, az: 35, el: 20, dist: 3.6, fov: 40, pose: 1 };
  const a = renderAscii(c, { ...camera, t: 0 }), b = renderAscii(c, { ...camera, t: 0.15 });
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
  console.log(`${c.name} motion at 60 fps: mean step ${(travel / samples).toFixed(5)} r, peak ${peak.toFixed(4)} r; ASCII changed cells over .15s: ${changed}`);
  assert(travel / samples > 0.001, `${c.name}: cycle motion too small`);
  assert(changed > 100, `${c.name}: motion not visible in ASCII`);
}
console.log('PASS: determinism, unit normals/radius, small counts, coupled permutations, 1.2r bound, reduced motion, two-cycle 60fps motion, propulsion bounds/coasts, jellyfish landmarks and squeeze/thrust alignment.');
if (!checkOnly) for (const c of clouds) {
  const views = compact ? [{ name: '3/4', az: 35, el: 20 }] : [
    { name: '3/4', az: 35, el: 20 }, { name: 'profile', az: 0, el: 0 }, { name: 'dorsal', az: 0, el: 85 },
  ];
  for (const view of views) {
    console.log(`\n${c.name.toUpperCase()} · ${view.name}\n`);
    console.log(renderAscii(c, { cols: compact ? 100 : 220, rows: compact ? 40 : 80,
      az: view.az, el: view.el, dist: 3.6, fov: 40 }));
  }
  if (process.argv.includes('--motion')) for (const t of [0, 0.18, 0.33, 0.65, 0.9].map(p => p * PULSE_PERIOD[c.name])) {
    console.log(`\n${c.name.toUpperCase()} · moving t=${t}\n`);
    console.log(renderAscii(c, { cols: compact ? 100 : 220, rows: compact ? 40 : 80,
      az: 35, el: 20, dist: 3.6, fov: 40, t, pose: 1 }));
  }
}
