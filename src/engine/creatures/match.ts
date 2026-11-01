import type { CreatureCloud } from './types.ts';

/** Balanced spatial-quantile matching (a shared adaptive kd-tree).
 * All clouds split on the SAME axis and at the SAME rank, so thin appendages
 * cannot arbitrarily jump between octants as in independently keyed AABBs.
 * Small leaves use nearest-neighbour assignment along the morph sequence.
 * A bounded seeded 2-opt pass relaxes split boundaries; the result is deterministic.
 * O(K N log N), O(K N) scratch; no N² cost.
 * Attribute buffers retain their identity, which is useful to GPU consumers. */
export function matchOrder(clouds: CreatureCloud[]): void {
  if (clouds.length < 2) return;
  const count = clouds[0]!.count;
  const seen = new Set<CreatureCloud>();
  for (const c of clouds) {
    if (seen.has(c)) throw new Error('matchOrder requires distinct clouds');
    seen.add(c);
    if (c.count !== count || c.position.length !== count * 3 || c.normal.length !== count * 3 ||
      c.part.length !== count || c.local.length !== count * 2) {
      throw new RangeError('matchOrder requires equal counts and complete attribute arrays');
    }
  }
  if (count < 2) return;
  const orders = clouds.map(() => {
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) order[i] = i;
    return order;
  });

  function partition(order: Uint32Array, p: Float32Array, lo: number, hi: number, nth: number, axis: number) {
    // Hoare quickselect, with an index tie-break to remain deterministic on flat sheets.
    while (lo < hi) {
      const pivot = order[(lo + hi) >>> 1]!, value = p[pivot * 3 + axis]!;
      let i = lo, j = hi;
      while (i <= j) {
        while (p[order[i]! * 3 + axis]! < value || (p[order[i]! * 3 + axis] === value && order[i]! < pivot)) i++;
        while (p[order[j]! * 3 + axis]! > value || (p[order[j]! * 3 + axis] === value && order[j]! > pivot)) j--;
        if (i <= j) { const tmp = order[i]!; order[i++] = order[j]!; order[j--] = tmp; }
      }
      if (nth <= j) hi = j;
      else if (nth >= i) lo = i;
      else return;
    }
  }

  function visit(lo: number, hi: number): void {
    let spanX = 0, spanY = 0, spanZ = 0;
    for (let k = 0; k < clouds.length; k++) {
      const p = clouds[k]!.position, order = orders[k]!;
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      // A bounded strided sample chooses the shared axis without rescanning every point
      // at every level. Median partitioning itself still examines the whole interval.
      const step = Math.max(1, Math.floor((hi - lo) / 16));
      for (let i = lo; i < hi; i += step) {
        const j = order[i]! * 3;
        x0 = Math.min(x0, p[j]!); x1 = Math.max(x1, p[j]!);
        y0 = Math.min(y0, p[j + 1]!); y1 = Math.max(y1, p[j + 1]!);
        z0 = Math.min(z0, p[j + 2]!); z1 = Math.max(z1, p[j + 2]!);
      }
      spanX += x1 - x0; spanY += y1 - y0; spanZ += z1 - z0;
    }
    const axis = spanX >= spanY && spanX >= spanZ ? 0 : spanY >= spanZ ? 1 : 2;
    if (hi - lo <= 12) {
      // Establish an order in the first cloud; each later cloud follows the prior one.
      const first = orders[0]!, p = clouds[0]!.position;
      for (let i = lo + 1; i < hi; i++) {
        const value = first[i]!;
        let j = i;
        while (j > lo && p[first[j - 1]! * 3 + axis]! > p[value * 3 + axis]!) {
          first[j] = first[j - 1]!; j--;
        }
        first[j] = value;
      }
      for (let k = 1; k < clouds.length; k++) {
        const a = clouds[k - 1]!.position, b = clouds[k]!.position;
        const prev = orders[k - 1]!, next = orders[k]!;
        for (let i = lo; i < hi; i++) {
          const ai = prev[i]! * 3;
          let best = i, distance = Infinity;
          for (let j = i; j < hi; j++) {
            const bj = next[j]! * 3;
            const d = (a[ai]! - b[bj]!) ** 2 + (a[ai + 1]! - b[bj + 1]!) ** 2 + (a[ai + 2]! - b[bj + 2]!) ** 2;
            if (d < distance) { best = j; distance = d; }
          }
          const tmp = next[i]!; next[i] = next[best]!; next[best] = tmp;
        }
      }
      return;
    }
    const mid = (lo + hi) >>> 1;
    for (let k = 0; k < clouds.length; k++) partition(orders[k]!, clouds[k]!.position, lo, hi - 1, mid, axis);
    visit(lo, mid); visit(mid, hi);
  }
  visit(0, count);
  // Relax artificial median boundaries with bounded, deterministic 2-opt swaps.
  // A negative dot product means swapping strictly reduces squared travel.
  let state = 0x719ab31;
  for (let k = 1; k < clouds.length; k++) {
    const a = clouds[k - 1]!.position, b = clouds[k]!.position;
    const prev = orders[k - 1]!, next = orders[k]!;
    for (let round = 0; round < 4; round++) {
      const window = Math.min(count, Math.max(24, count >>> (round % 8)));
      for (let i = 0; i < count; i++) {
        state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
        const j = (i + (state >>> 0) % (2 * window + 1) - window + count) % count;
        const ai = prev[i]! * 3, aj = prev[j]! * 3, bi = next[i]! * 3, bj = next[j]! * 3;
        const dot = (a[ai]! - a[aj]!) * (b[bi]! - b[bj]!) +
          (a[ai + 1]! - a[aj + 1]!) * (b[bi + 1]! - b[bj + 1]!) +
          (a[ai + 2]! - a[aj + 2]!) * (b[bi + 2]! - b[bj + 2]!);
        if (dot < 0) { const tmp = next[i]!; next[i] = next[j]!; next[j] = tmp; }
      }
    }
  }
  for (let k = 0; k < clouds.length; k++) {
    const c = clouds[k]!, order = orders[k]!;
    // One permutation traversal, rather than four stride-dispatch loops. This keeps
    // the 60k worker path monomorphic and all attribute associations explicit.
    const position = new Float32Array(count * 3), normal = new Float32Array(count * 3);
    const part = new Float32Array(count), local = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const source = order[i]!, from = source * 3, to = i * 3;
      position[to] = c.position[from]!;
      position[to + 1] = c.position[from + 1]!;
      position[to + 2] = c.position[from + 2]!;
      normal[to] = c.normal[from]!;
      normal[to + 1] = c.normal[from + 1]!;
      normal[to + 2] = c.normal[from + 2]!;
      part[i] = c.part[source]!;
      local[i * 2] = c.local[source * 2]!;
      local[i * 2 + 1] = c.local[source * 2 + 1]!;
    }
    c.position.set(position); c.normal.set(normal); c.part.set(part); c.local.set(local);
  }
}
