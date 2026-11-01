// Bakes static ASCII specimens (no-WebGL fallback, article headers) into src/data/specimens.json.
// Run: pnpm bake   (re-run after changing a creature)
import { writeFileSync } from 'node:fs';
import { sampleCreature, CREATURES } from '../src/engine/creatures/index.ts';
import { renderAscii } from '../src/engine/ascii-cpu.ts';

const out: Record<string, string> = {};
// a readable three-quarter view per creature
const POSES = {
  goldfish: { az: 25, el: 12, dist: 3.6, fov: 40 },
  dragonfly: { az: 70, el: 45, dist: 3.8, fov: 40 },
  jellyfish: { az: 20, el: -8, dist: 3.8, fov: 40 },
  butterfly: { az: 80, el: 40, dist: 3.8, fov: 40 },
} as const;

for (const name of CREATURES) {
  const cloud = sampleCreature(name, 40000, 7);
  const pose = POSES[name];
  const trim = (s: string) => s.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
  out[name] = trim(renderAscii(cloud, { cols: 150, rows: 62, az: pose.az, el: pose.el, dist: pose.dist, fov: pose.fov, pose: 1 }));
  out[`${name}-small`] = trim(renderAscii(cloud, { cols: 64, rows: 26, az: pose.az, el: pose.el, dist: pose.dist * 0.95, fov: pose.fov, pose: 1 }));
}
writeFileSync(new URL('../src/data/specimens.json', import.meta.url), JSON.stringify(out, null, 0) + '\n');
console.log('baked', Object.keys(out).length, 'specimens');
