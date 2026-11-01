// Boots the background once; the canvas persists across Astro view transitions.
import type { CreatureCloud } from './creatures/types.ts';
import type { Stage, StageMode, StageDebug } from './stage.ts';
import { CHAPTERS, SPECIES } from './camera-rig.ts';

let stage: Stage | null = null;
let booted = false;
let fallbackArt: Record<string, string> | null = null;
let fallbackChapter = -1;

const root = document.documentElement;
const motionOn = () => root.dataset.motion !== 'off';
const currentMode = (): StageMode => (document.body.dataset.stage as StageMode) || 'academic';

function webgl2(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function pointBudget(): number {
  const w = window.innerWidth;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (w < 640 || mem <= 4 || cores <= 4) return 16000;
  if (w < 1024) return 32000;
  return 60000;
}

async function sampleClouds(count: number): Promise<CreatureCloud[]> {
  try {
    const worker = new Worker(new URL('./sample.worker.ts', import.meta.url), { type: 'module' });
    return await new Promise<CreatureCloud[]>((resolve, reject) => {
      worker.onmessage = (e) => {
        resolve(e.data.clouds);
        worker.terminate();
      };
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      worker.postMessage({ count, seed: 7 });
    });
  } catch {
    const { sampleCreature, matchOrder, CREATURES } = await import('./creatures/index.ts');
    const clouds = CREATURES.map((n) => sampleCreature(n, count, 7));
    matchOrder(clouds);
    return clouds;
  }
}

// ------------------------------------------------------------ specimen caption

let labelChapter = -1;
function updateLabel(chapter: number): void {
  if (chapter === labelChapter) return;
  const fig = document.querySelector<HTMLElement>('[data-specimen-fig]');
  if (!fig) return;
  labelChapter = chapter;
  const c = SPECIES[chapter];
  fig.innerHTML = `Fig. ${chapter + 1}<br><i>${c.species}</i><br>${c.common}`;
}

// ------------------------------------------------------------ static fallback (no WebGL)

async function runFallback(): Promise<void> {
  if (!fallbackArt) fallbackArt = (await import('../data/specimens.json')).default as Record<string, string>;
  const names = ['goldfish', 'dragonfly', 'jellyfish', 'butterfly'];
  const show = () => {
    const pre = document.querySelector<HTMLElement>('[data-fallback]');
    if (!pre || !fallbackArt) return;
    const i = creatureFor(currentMode(), fallbackChapter < 0 ? GOLDFISH : fallbackChapter);
    fallbackChapter = i;
    const art = fallbackArt[names[i]];
    if (art) pre.textContent = art;
    updateLabel(i);
  };
  document.addEventListener('astro:page-load', show);
  show();
}

// ------------------------------------------------------------ which creature per page

const GOLDFISH = 0;
const DRAGONFLY = 1;
const JELLYFISH = 2;
const BUTTERFLY = 3;
/** About: always the jellyfish. Every other page: a random creature, and the stage swaps in a
 *  different one each time it leaves the screen. Moving between those pages keeps the one already
 *  swimming; arriving from About trades the jellyfish for one of the others. */
let lastMode: StageMode | null = null;
function creatureFor(mode: StageMode, current: number): number {
  const from = lastMode;
  lastMode = mode;
  if (mode === 'academic') return JELLYFISH;
  if (from !== null && from !== 'academic') return current;
  const options = [GOLDFISH, DRAGONFLY, JELLYFISH, BUTTERFLY].filter((i) => from === null || i !== current);
  return options[Math.floor(Math.random() * options.length)];
}
function pickBlogCreature(s: Stage): void {
  s.setBlogCreature(creatureFor(currentMode(), s.currentCreature));
}

// ------------------------------------------------------------ boot

function debugFromUrl(): StageDebug {
  if (!location.pathname.startsWith('/lab/')) return {};
  const q = new URLSearchParams(location.search);
  const c = q.get('c');
  return {
    creature: c !== null ? Number(c) : 0,
    raw: q.has('raw'),
    orbit: q.get('orbit') !== '0',
    morph: q.has('morph') ? Number(q.get('morph')) : undefined,
  };
}

export async function boot(): Promise<void> {
  if (booted) return;
  booted = true;

  const onPage = () => {
    labelChapter = -1;
    if (stage) {
      stage.scroll.bind();
      stage.setTheme();
      pickBlogCreature(stage);
      stage.setMode(currentMode());
      stage.invalidate();
    }
  };
  document.addEventListener('astro:page-load', onPage);

  if (!webgl2()) {
    void runFallback();
    return;
  }

  const canvas = document.getElementById('bg') as HTMLCanvasElement | null;
  const host = document.getElementById('stage');
  if (!canvas || !host) return;

  // let the first paint happen before doing heavy work
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

  try {
    const { Stage } = await import('./stage.ts');
    const s = new Stage(canvas, debugFromUrl());
    stage = s;
    if (import.meta.env.DEV) (window as unknown as { __stage?: Stage }).__stage = s; // dev-only inspection hook
    s.resize();
    s.setTheme();
    s.setMotion(motionOn());
    s.scroll.bind();
    s.onInfo(({ chapter }) => updateLabel(chapter));
    const [clouds] = await Promise.all([sampleClouds(pointBudget()), s.loadAtlas()]);
    s.setClouds(clouds);
    pickBlogCreature(s);
    s.setMode(currentMode());
    host.classList.add('is-live');

    let rt = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(rt);
      rt = requestAnimationFrame(() => s.resize());
    });
    window.addEventListener('themechange', () => s.setTheme());
    window.addEventListener('motionchange', () => s.setMotion(motionOn()));
    window.addEventListener('scroll', () => s.invalidate(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) s.stop();
      else if (currentMode() !== 'article') s.start();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => s.setTheme());
  } catch (err) {
    console.warn('[stage] WebGL background unavailable, using static specimens', err);
    void runFallback();
  }
}
