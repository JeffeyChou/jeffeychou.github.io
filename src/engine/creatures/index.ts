import { goldfish } from './goldfish.ts';
import { dragonfly } from './dragonfly.ts';
import { jellyfish } from './jellyfish.ts';
import { butterfly } from './butterfly.ts';
import type { CreatureCloud, CreatureName } from './types.ts';

export { CREATURES, CREATURE_ID } from './types.ts';
export type { CreatureCloud, CreatureName } from './types.ts';
export { matchOrder } from './match.ts';
export { animatePoint, ANIMATE_GLSL, GAIT, thrust, PULSE_PERIOD } from './animate.ts';

export function sampleCreature(name: CreatureName, count: number, seed?: number): CreatureCloud {
  switch (name) {
    case 'goldfish': return goldfish(count, seed);
    case 'dragonfly': return dragonfly(count, seed);
    case 'jellyfish': return jellyfish(count, seed);
    case 'butterfly': return butterfly(count, seed);
    default: throw new RangeError(`Unknown creature: ${String(name)}`);
  }
}
