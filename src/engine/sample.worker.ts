// Samples and matches the four creatures off the main thread.
import { sampleCreature, matchOrder, CREATURES } from './creatures/index.ts';
import type { CreatureCloud } from './creatures/types.ts';

self.onmessage = (e: MessageEvent<{ count: number; seed: number }>) => {
  const { count, seed } = e.data;
  const clouds: CreatureCloud[] = CREATURES.map((n) => sampleCreature(n, count, seed));
  matchOrder(clouds);
  const transfer: Transferable[] = [];
  for (const c of clouds) transfer.push(c.position.buffer, c.normal.buffer, c.part.buffer, c.local.buffer);
  (self as unknown as Worker).postMessage({ clouds }, transfer);
};
