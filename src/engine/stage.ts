// The background renderer: point-cloud creatures → low-res accumulation → wave medium →
// per-cell glyph choice → full-resolution glyph pass.
import {
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  FloatType,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  NearestFilter,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RGBAFormat,
  RawShaderMaterial,
  Scene,
  Sphere,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import type { TextureDataType } from 'three';
import type { CreatureCloud } from './creatures/types.ts';
import { POINTS_VERT, POINTS_FRAG, QUAD_VERT, TEMPORAL_FRAG, WAVE_FRAG, cellFrag, DRAW_FRAG, RAW_FRAG } from './shaders.ts';
import { buildAtlas } from './glyph-atlas.ts';
import { CHAPTERS, targetPose, damp, type CamPose } from './camera-rig.ts';
import { ScrollTracker } from './scroll.ts';
import { Traverse } from './locomotion.ts';

export type StageMode = 'academic' | 'blog' | 'conference' | 'dev' | 'exposure' | 'article';

export interface StageDebug {
  creature?: number; // force a creature (dev page)
  raw?: boolean; // draw accumulation without glyphs
  orbit?: boolean; // auto-orbit instead of scroll camera
  morph?: number; // force morph amount to the next creature
}

const DEG = Math.PI / 180;

/** CSS hex → raw sRGB components (the glyph pass writes display colors directly, no color management). */
function cssColor(name: string): Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(v);
  const n = m ? parseInt(m[1], 16) : 0x808080;
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function cssNumber(name: string, fallback: number): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private camera = new PerspectiveCamera(40, 1, 0.05, 50);
  private pointsScene = new Scene();
  private quadScene = new Scene();
  private quad: Mesh;
  private quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private points!: Points;
  private pointsMat!: RawShaderMaterial;
  private temporalMat: RawShaderMaterial;
  private waveMat: RawShaderMaterial;
  private cellMat: RawShaderMaterial | null = null;
  private drawMat: RawShaderMaterial;
  private rawMat: RawShaderMaterial;
  private rtFrame!: WebGLRenderTarget;
  private rtA!: WebGLRenderTarget;
  private rtB!: WebGLRenderTarget;
  // cell-resolution targets: the wave medium and the per-cell glyph choice (both ping-pong)
  private rtWaveA!: WebGLRenderTarget;
  private rtWaveB!: WebGLRenderTarget;
  private rtCellA!: WebGLRenderTarget;
  private rtCellB!: WebGLRenderTarget;
  private texType: TextureDataType;
  private cellType: TextureDataType;
  private waveAcc = 0;
  private glyphAlpha = 0.9;
  // x: resting dot alpha, y: wave height → display gain, z: ripple alpha, w: on (x, z from the theme)
  private field = new Vector4(0, 0.9, 0, 1);
  private fieldWave = 0.4;

  private count = 0;
  private cols = 1;
  private rows = 1;
  private width = 1;
  private height = 1;
  private narrow = false;

  private mode: StageMode = 'academic';
  private motion = true;
  private running = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private lastRender = 0;
  private dirty = true;
  private debug: StageDebug;
  private lastCreature = 0;
  private blogAz = 0;

  readonly scroll = new ScrollTracker();
  private movers = [0, 1, 2, 3].map((i) => new Traverse(i));
  private halfW = 2;
  private halfH = 1.2;
  private modelA = new Matrix4();
  private modelB = new Matrix4();
  private posA = new Vector3();
  private posB = new Vector3();
  private sizeA = 1;
  private sizeB = 1;
  // per-creature animation clocks
  private clock = [0, 0, 0, 0];
  // which creature is on screen, and a time-based morph when it changes (navigation)
  private shown = 0;
  private blogCreature = 0;
  private trans: { from: number; to: number; t: number } | null = null;
  private cam: CamPose = { ...CHAPTERS[0].start };
  private target: CamPose = { ...CHAPTERS[0].start };
  private onFrameInfo?: (info: { chapter: number; morph: number; cam: CamPose }) => void;

  constructor(canvas: HTMLCanvasElement, debug: StageDebug = {}) {
    this.canvas = canvas;
    this.debug = debug;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    const gl = this.renderer.getContext();
    const float32 = this.renderer.extensions.has('EXT_color_buffer_float');
    const floatOk = float32 || this.renderer.extensions.has('EXT_color_buffer_half_float');
    this.texType = floatOk ? HalfFloatType : UnsignedByteType;
    // the wave and the glyph choice need signed values; without float targets the stage cannot run
    if (!floatOk) throw new Error('no float render targets');
    this.cellType = float32 ? FloatType : HalfFloatType;
    void gl;

    this.temporalMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: TEMPORAL_FRAG,
      uniforms: { uPrev: { value: null }, uCur: { value: null }, uKeep: { value: 0.45 } },
      depthTest: false,
      depthWrite: false,
    });
    this.waveMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: WAVE_FRAG,
      uniforms: {
        uWave: { value: null },
        uAcc: { value: null },
        uSize: { value: new Vector2(1, 1) },
        uCells: { value: new Vector2(1, 1) },
        uDensity: { value: 0.5 },
        uC2: { value: WAVE.c2 },
        uKy: { value: 1 / (CELL_ASPECT * CELL_ASPECT) },
        uDamp: { value: WAVE.damp },
        uGain: { value: WAVE.gain },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.drawMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: DRAW_FRAG,
      uniforms: {
        uCell: { value: null },
        uAtlas: { value: null },
        uCells: { value: new Vector2(1, 1) },
        uSize: { value: new Vector2(1, 1) },
        uGrid: { value: new Vector2(1, 1) },
        uNear: { value: new Color() },
        uMid: { value: new Color() },
        uFar: { value: new Color() },
        uFade: { value: 1 },
      },
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
    });
    this.rawMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: RAW_FRAG,
      uniforms: { uAcc: { value: null }, uMid: { value: new Color() }, uDensity: { value: 0.5 } },
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.drawMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.makeTargets(4, 4, 2, 2);
  }

  /** Upload the four creatures as one geometry. Clouds must share count and be matchOrder'ed. */
  setClouds(clouds: CreatureCloud[]): void {
    const n = clouds[0].count;
    this.count = n;
    const geo = new BufferGeometry();
    clouds.forEach((c, k) => {
      const meta = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        meta[i * 3] = c.part[i];
        meta[i * 3 + 1] = c.local[i * 2];
        meta[i * 3 + 2] = c.local[i * 2 + 1];
      }
      geo.setAttribute(`aP${k}`, new BufferAttribute(c.position, 3));
      geo.setAttribute(`aN${k}`, new BufferAttribute(c.normal, 3));
      geo.setAttribute(`aM${k}`, new BufferAttribute(meta, 3));
    });
    const seed = new Float32Array(n);
    // seed correlates with position along the body so the morph travels as a wave (head first)
    const p0 = clouds[0].position;
    for (let i = 0; i < n; i++) {
      const h = Math.sin(i * 12.9898) * 43758.5453;
      seed[i] = 0.65 * (h - Math.floor(h)) + 0.35 * (0.5 - 0.5 * p0[i * 3]);
    }
    geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
    geo.setAttribute('position', geo.getAttribute('aP0'));
    geo.boundingSphere = new Sphere(new Vector3(), 1.3);

    this.pointsMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      uniforms: {
        uA: { value: 0 },
        uB: { value: 1 },
        uMorph: { value: 0 },
        uTimeA: { value: 0 },
        uTimeB: { value: 0 },
        uPoseA: { value: 0 },
        uPoseB: { value: 0 },
        uAmp: { value: 1 },
        uGrain: { value: 0.07 },
        uDissolve: { value: 0 },
        uPointSize: { value: 2 },
        uLight: { value: new Vector3(-0.45, 0.75, 0.55).normalize() },
        uModelA: { value: this.modelA },
        uModelB: { value: this.modelB },
        uDepth: { value: new Vector2(4.5, 1.15) },
      },
      transparent: true,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
      depthTest: false,
      depthWrite: false,
    });
    this.points = new Points(geo, this.pointsMat);
    this.points.frustumCulled = false;
    this.pointsScene.add(this.points);
    this.dirty = true;
  }

  async loadAtlas(): Promise<void> {
    const atlas = await buildAtlas();
    const n = atlas.count;
    const shapeA: Vector3[] = [];
    const shapeB: Vector3[] = [];
    const info: Vector2[] = [];
    for (let i = 0; i < n; i++) {
      const v = atlas.shapes.subarray(i * 6, i * 6 + 6);
      shapeA.push(new Vector3(v[0], v[1], v[2]));
      shapeB.push(new Vector3(v[3], v[4], v[5]));
      info.push(new Vector2(atlas.info[i * 2], atlas.info[i * 2 + 1]));
    }
    this.cellMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: cellFrag(n),
      uniforms: {
        uAcc: { value: null },
        uWave: { value: null },
        uPrev: { value: null },
        uCells: { value: new Vector2(1, 1) },
        uSize: { value: new Vector2(1, 1) },
        uDensity: { value: 0.5 },
        uAlpha: { value: 0.9 },
        uShapeA: { value: shapeA },
        uShapeB: { value: shapeB },
        uInfo: { value: info },
        uEdge: { value: new Vector2(GLYPH.edge[0], GLYPH.edge[1]) },
        uContrast: { value: GLYPH.contrast },
        uGain: { value: GLYPH.gain },
        uGamma: { value: GLYPH.gamma },
        uHold: { value: GLYPH.hold },
        uDither: { value: GLYPH.dither },
        uTime: { value: 0 },
        uField: { value: this.field },
        uFieldIdx: { value: new Vector3(...atlas.field) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.drawMat.uniforms.uAtlas.value = atlas.texture;
    this.drawMat.uniforms.uGrid.value.set(atlas.cols, atlas.rows);
    this.dirty = true;
  }

  get ready(): boolean {
    return !!this.points && !!this.cellMat;
  }

  onInfo(cb: (info: { chapter: number; morph: number; cam: CamPose }) => void): void {
    this.onFrameInfo = cb;
  }

  /** Accumulation targets (w × h texels) and cell-resolution targets (cw × ch, one texel per glyph cell). */
  private makeTargets(w: number, h: number, cw: number, ch: number): void {
    const opts = {
      type: this.texType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    };
    const cellOpts = { ...opts, type: this.cellType, minFilter: NearestFilter, magFilter: NearestFilter };
    for (const rt of [this.rtFrame, this.rtA, this.rtB, this.rtWaveA, this.rtWaveB, this.rtCellA, this.rtCellB]) rt?.dispose();
    this.rtFrame = new WebGLRenderTarget(w, h, opts);
    this.rtA = new WebGLRenderTarget(w, h, opts);
    this.rtB = new WebGLRenderTarget(w, h, opts);
    this.rtWaveA = new WebGLRenderTarget(cw, ch, cellOpts);
    this.rtWaveB = new WebGLRenderTarget(cw, ch, cellOpts);
    this.rtCellA = new WebGLRenderTarget(cw, ch, cellOpts);
    this.rtCellB = new WebGLRenderTarget(cw, ch, cellOpts);
    this.waveAcc = 0;
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.narrow = w < 1024;
    const phone = w < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    // fine grid: ~240 columns on a laptop, ~75 on a phone
    const cellW = phone ? 5.2 : Math.min(7.5, Math.max(5.2, w / 240));
    const cellH = cellW * CELL_ASPECT;
    this.cols = w / cellW;
    this.rows = h / cellH;
    // accumulation texels per cell: 2 × 3, so each cell sees the six regions glyphs are matched on
    const cw = Math.ceil(this.cols);
    const ch = Math.ceil(this.rows);
    this.makeTargets(Math.ceil(this.cols * SS_X), Math.ceil(this.rows * SS_Y), cw, ch);
    this.drawMat.uniforms.uCells.value.set(this.cols, this.rows);
    this.drawMat.uniforms.uSize.value.set(cw, ch);
    this.camera.aspect = w / h;
    this.dirty = true;
  }

  setTheme(): void {
    this.drawMat.uniforms.uNear.value.copy(cssColor('--glyph-near'));
    this.drawMat.uniforms.uMid.value.copy(cssColor('--glyph-mid'));
    this.drawMat.uniforms.uFar.value.copy(cssColor('--glyph-far'));
    this.glyphAlpha = cssNumber('--glyph-alpha', 0.9);
    this.field.x = cssNumber('--field-alpha', 0.12);
    this.fieldWave = cssNumber('--field-wave', 0.4);
    this.applyDim();
    this.rawMat.uniforms.uMid.value.copy(cssColor('--glyph-mid'));
    this.dirty = true;
  }

  setMode(mode: StageMode): void {
    this.mode = mode;
    this.applyDim();
    this.dirty = true;
    this.start();
  }

  /** About draws the whole stage dimmer (--stage-dim); the ripples are compensated so they still read. */
  private applyDim(): void {
    const v = parseFloat(getComputedStyle(document.body).getPropertyValue('--stage-dim'));
    const dim = Number.isFinite(v) && v > 0 ? v : 1;
    this.field.z = Math.min(1, this.fieldWave / dim);
  }

  setMotion(on: boolean): void {
    this.motion = on;
    this.dirty = true;
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  invalidate(): void {
    this.dirty = true;
  }

  /** Pick the creature for the current page (the engine morphs to it). */
  setBlogCreature(i: number): void {
    this.blogCreature = i;
    this.dirty = true;
  }

  /** The creature this page is showing or morphing to (set by setBlogCreature or a swap at the edge). */
  get currentCreature(): number {
    return this.blogCreature;
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.ready) return;
    const u = this.pointsMat.uniforms;
    const dbg = this.debug;
    const academic = this.mode === 'academic' && dbg.creature === undefined;

    // creature: chosen per page by index.ts (academic: jellyfish; blog: goldfish; article: random)
    const desired = dbg.creature ?? this.blogCreature;
    if (!this.trans && desired !== this.shown) this.trans = { from: this.shown, to: desired, t: 0 };
    let a = this.shown;
    let b = this.shown;
    let morph = 0;
    if (this.trans) {
      this.trans.t += dt / (this.motion ? 1.6 : 0.6);
      if (this.trans.t >= 1) {
        this.shown = this.trans.to;
        this.trans = null;
        a = b = this.shown;
      } else {
        a = this.trans.from;
        b = this.trans.to;
        morph = this.trans.t;
      }
    }
    if (dbg.creature !== undefined && dbg.morph !== undefined) {
      a = dbg.creature;
      b = (a + 1) % 4;
      morph = dbg.morph;
    }

    // camera: on the academic page the whole-page scroll progress orbits it; elsewhere it holds still
    if (academic) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const c = Math.min(0.9999, Math.max(0, window.scrollY / max)) * CHAPTERS.length;
      const i = Math.floor(c);
      targetPose(i, c - i, 0, this.target);
    } else {
      this.target.az = 0;
      this.target.el = 6;
      this.target.dist = 4.6;
      this.target.fov = 40;
    }
    const before = this.cam.az + this.cam.el + this.cam.dist;
    damp(this.cam, this.target, dt, this.motion ? 4.5 : 30);
    const camMoving = Math.abs(this.cam.az + this.cam.el + this.cam.dist - before) > 1e-3;

    // creatures move freely on the clock everywhere (scroll only turns the camera); pause stops them
    const drive = this.motion ? 1 : 0;
    const k = dt * drive;
    this.time += k;
    this.clock[a] += k * CLOCK_RATE[a];
    if (b !== a) this.clock[b] += k * CLOCK_RATE[b];
    const left = this.advance(a, k);
    if (b !== a) this.advance(b, k);
    // every page but About: once the creature has left the screen, a different one arrives
    if (left && !this.trans && this.mode !== 'academic' && dbg.creature === undefined) {
      const options = [0, 1, 2, 3].filter((i) => i !== a);
      const next = options[Math.floor(Math.random() * options.length)];
      this.movers[next].enter(this.edge(next));
      this.shown = next;
      this.blogCreature = next;
      a = b = next;
    }
    const animating = drive > 0 || this.trans !== null;
    // the medium steps at a fixed rate so ripples travel at the same speed on 60 and 120 Hz screens
    this.waveAcc += k;
    let steps = Math.floor(this.waveAcc / WAVE.step);
    this.waveAcc -= steps * WAVE.step;
    if (steps > 4) steps = 4;

    const pose = 0.6;
    const changed =
      this.dirty ||
      camMoving ||
      animating ||
      u.uMorph.value !== morph ||
      u.uA.value !== a ||
      u.uB.value !== b;
    if (!changed) return; // nothing moved: keep the last frame

    u.uA.value = a;
    u.uB.value = b;
    u.uMorph.value = morph;
    u.uPoseA.value = pose;
    u.uPoseB.value = pose;
    u.uTimeA.value = this.clock[a];
    u.uTimeB.value = this.clock[b];
    u.uAmp.value = this.motion ? 1 : 0;
    u.uDissolve.value = this.motion ? 0 : 1;

    this.render(morph, steps);
    this.dirty = false;
    this.lastRender = now;
    this.onFrameInfo?.({ chapter: morph > 0.5 ? b : a, morph, cam: this.cam });
  }

  /** Move creature i: its own clock drives the thrust; true when it left the screen and wrapped. */
  private advance(i: number, dt: number): boolean {
    return this.movers[i].update(dt, this.clock[i], this.halfW / this.halfH, this.edge(i));
  }

  /** How far past the screen edge (view units) creature i must be to be fully out of view. */
  private edge(i: number): number {
    const rise = i === 2;
    // wrap as soon as the body is just out of view, so it re-enters without a long empty gap
    return (1.1 * this.creatureScale(i)) / (rise ? this.halfH : this.halfW);
  }

  private creatureScale(i: number): number {
    if (this.debug.creature !== undefined) return 0.9;
    let scale = Math.min(0.62, this.halfH * 0.42) * SIZE[i];
    if (this.width < 640) scale *= 0.85;
    return scale;
  }

  private placeCamera(morph: number): void {
    const cam = this.camera;
    const aspect = this.width / this.height;
    const fit = aspect < 1 ? Math.pow(1 / aspect, 0.92) : 1;
    const d = this.cam.dist * fit * 0.74;
    const az = this.cam.az * DEG;
    const el = this.cam.el * DEG;
    cam.fov = this.cam.fov;
    cam.position.set(d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az));
    cam.up.set(0, 1, 0);
    if (Math.abs(this.cam.el) > 80) cam.up.set(-Math.sin(az), 0, -Math.cos(az));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // camera axes and the half extents of the view at the origin's depth
    const halfH = d * Math.tan((cam.fov * DEG) / 2);
    const halfW = halfH * aspect;
    this.halfW = halfW;
    this.halfH = halfH;
    _right.setFromMatrixColumn(cam.matrixWorld, 0);
    _up.setFromMatrixColumn(cam.matrixWorld, 1);
    _toCam.setFromMatrixColumn(cam.matrixWorld, 2);
    const u = this.pointsMat.uniforms;
    this.sizeA = this.placeCreature(u.uA.value, halfW, halfH, this.modelA, this.posA);
    this.sizeB = this.placeCreature(u.uB.value, halfW, halfH, this.modelB, this.posB);
    const em = morph * morph * (3 - 2 * morph);
    _focus.copy(this.posA).lerp(this.posB, em);
    const size = this.sizeA + (this.sizeB - this.sizeA) * em;
    u.uDepth.value.set(cam.position.distanceTo(_focus), 0.85 * size);
  }

  /** Every creature roams the full screen; it crosses, leaves, and re-enters from the other side. */
  private placeCreature(i: number, halfW: number, halfH: number, out: Matrix4, pos: Vector3): number {
    const m = this.movers[i];
    const scale = this.creatureScale(i);
    if (this.debug.creature !== undefined) {
      out.makeScale(scale, scale, scale);
      pos.set(0, 0, 0);
      return scale;
    }
    m.place(_right, _up, _toCam, halfW, halfH, scale);
    out.copy(m.matrix);
    pos.copy(m.position);
    return scale;
  }

  private render(morph: number, waveSteps: number): void {
    const r = this.renderer;
    const cell = this.cellMat!;
    this.placeCamera(morph);
    const n = Math.max(1, this.count);
    const cells = this.cols * this.rows;
    // coverage gain per accumulation texel (the 2.3 was tuned for 2 × 2 texels per cell)
    const density = 2.3 * ((SS_X * SS_Y) / 4) * (cells / n);
    this.pointsMat.uniforms.uPointSize.value = POINT_SIZE;

    // 1. points → frame accumulation
    r.setRenderTarget(this.rtFrame);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.render(this.pointsScene, this.camera);

    // 2. temporal smoothing → rtB (prev = rtA)
    this.temporalMat.uniforms.uPrev.value = this.rtA.texture;
    this.temporalMat.uniforms.uCur.value = this.rtFrame.texture;
    this.temporalMat.uniforms.uKeep.value = this.motion ? 0.18 : 0;
    this.quad.material = this.temporalMat;
    r.setRenderTarget(this.rtB);
    r.clear(true, false, false);
    r.render(this.quadScene, this.quadCam);
    let tmp = this.rtA;
    this.rtA = this.rtB;
    this.rtB = tmp;

    const cw = this.rtWaveA.width;
    const ch = this.rtWaveA.height;

    // 3. the medium: fixed-rate wave steps, driven by the change in creature coverage
    if (waveSteps > 0) {
      const wu = this.waveMat.uniforms;
      wu.uAcc.value = this.rtA.texture;
      wu.uSize.value.set(cw, ch);
      wu.uCells.value.set(this.cols, this.rows);
      wu.uDensity.value = density;
      this.quad.material = this.waveMat;
      for (let i = 0; i < waveSteps; i++) {
        wu.uWave.value = this.rtWaveA.texture;
        r.setRenderTarget(this.rtWaveB);
        r.render(this.quadScene, this.quadCam);
        tmp = this.rtWaveA;
        this.rtWaveA = this.rtWaveB;
        this.rtWaveB = tmp;
      }
    }

    // 4. per-cell glyph choice (creature shape matching, else the medium)
    const cu = cell.uniforms;
    cu.uAcc.value = this.rtA.texture;
    cu.uWave.value = this.rtWaveA.texture;
    cu.uPrev.value = this.rtCellA.texture;
    cu.uCells.value.set(this.cols, this.rows);
    cu.uSize.value.set(cw, ch);
    cu.uDensity.value = density;
    cu.uAlpha.value = this.glyphAlpha;
    cu.uTime.value = this.time;
    this.field.w = this.debug.creature !== undefined ? 0 : 1;
    this.quad.material = cell;
    r.setRenderTarget(this.rtCellB);
    r.render(this.quadScene, this.quadCam);
    tmp = this.rtCellA;
    this.rtCellA = this.rtCellB;
    this.rtCellB = tmp;

    // 5. glyphs → screen
    r.setRenderTarget(null);
    r.clear(true, false, false);
    if (this.debug.raw) {
      this.rawMat.uniforms.uAcc.value = this.rtA.texture;
      this.rawMat.uniforms.uDensity.value = density;
      this.quad.material = this.rawMat;
    } else {
      this.drawMat.uniforms.uCell.value = this.rtCellA.texture;
      this.quad.material = this.drawMat;
    }
    r.render(this.quadScene, this.quadCam);
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
  }
}

/** glyph cells are this many times taller than wide */
const CELL_ASPECT = 1.72;
/** accumulation texels per glyph cell (x, y): the 2 × 3 regions glyph shapes are matched on */
const SS_X = 2;
const SS_Y = 3;
const POINT_SIZE = 2.6;
/**
 * Glyph choice: in-cell contrast exponent; tone curve (gain · v^gamma, matches the old ramp's
 * light-to-dense feel); edge = relative in-cell spread where shape matching fades in; hold = hysteresis;
 * dither = fixed per-cell tone jitter.
 */
const GLYPH = { contrast: 1.3, gain: 0.55, gamma: 1.6, edge: [0.35, 0.75] as const, hold: 0.15, dither: 0.03 };
/**
 * The medium. step: fixed sim step (s); c2: (horizontal speed in cells per step)^2, ≈ 170 px/s on a
 * desktop grid; damp: velocity kept per step; gain: source strength. The owner liked these ripples
 * (realistic, slow decay); extra damping/smoothing made them look worse.
 */
const WAVE = { step: 1 / 60, c2: 0.14, damp: 0.985, gain: 0.2 };

const _focus = new Vector3();
const _right = new Vector3();
const _up = new Vector3();
const _toCam = new Vector3();
/** relative size per creature (goldfish, dragonfly, jellyfish, butterfly) */
// dragonfly 1.7: it is thin, so at 1 it read clearly smaller than the others (box ≈ 0.5× the goldfish's)
const SIZE = [1.5, 1.7, 1.5, 1];
/** animation clock rate per creature (goldfish, dragonfly, jellyfish, butterfly): slower overall, wings much slower */
// astra's v3 timing is authored in real seconds; the owner wants everything calmer, so run it at 60%,
// and the three crossers at 50% (their travel was slowed too, so strokes and travel stay in step)
const CLOCK_RATE = [0.5, 0.5, 0.6, 0.5];

