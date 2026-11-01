import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function allTags(posts: Post[]): { tag: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag, count]) => ({ tag, count }));
}

const CREATURES = ['goldfish', 'dragonfly', 'jellyfish', 'butterfly'];
/** A stable creature per post, for the small header specimen. */
export function creatureFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CREATURES[h % CREATURES.length];
}

export const fmtDate = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '.');
