import type { APIRoute } from 'astro';
import bibSrc from '../data/publications.bib?raw';
import { parseBib } from '../lib/bib';

// The publication list as BibTeX (in-preparation entries and website-only fields removed).
export const GET: APIRoute = () => {
  const body = parseBib(bibSrc)
    .filter((p) => p.group !== 'inprep')
    .sort((a, b) => b.year - a.year)
    .map((p) => p.bibtex)
    .join('\n\n');
  return new Response(body + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
