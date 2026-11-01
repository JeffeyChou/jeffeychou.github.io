import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** Projects for the Dev page, in `order`; drafts only in development. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export const npmUrl = (name: string) => `https://www.npmjs.com/package/${name}`;
