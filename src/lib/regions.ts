// Shared by scripts/bake-world.ts (Natural Earth province names) and the visitor map (GoatCounter region
// names): both sides are reduced to the same key so "Bavaria", "Bayern" and "Kagoshima Prefecture" match.

const GENERIC =
  /\b(province|prefecture|state|states|region|oblast|krai|kray|governorate|county|district|department|municipality|autonomous|special|administrative|metropolitan|capital|territory|federal|republic|of|the|and|zhuangzu|huizu|uygur|uyghur|zizhiqu|sheng|shi|ken|to|fu|do)\b/g;

export function regionKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(GENERIC, ' ')
    .replace(/\s+/g, '');
}
