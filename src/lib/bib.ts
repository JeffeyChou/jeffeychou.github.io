// Minimal BibTeX reader for publications.bib. Mirrors the grouping in resume-2page.tex:
// inproceedings (not poster) → Conference, article → Journal, keywords=poster → Poster,
// unpublished → In preparation. Newest first within a group.

export type PubGroup = 'conference' | 'journal' | 'poster' | 'inprep';

export interface Author {
  given: string;
  family: string;
  me: boolean;
}

export interface Publication {
  key: string;
  type: string;
  group: PubGroup;
  title: string;
  authors: Author[];
  venue: string;       // full venue (booktitle / journal / howpublished)
  venueShort: string;  // e.g. "SC ’26", "Physica A"
  year: number;
  status?: 'accepted' | 'in preparation';
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
  publisher?: string;
  /** optional website extras: pdf, code, project, slides, video, preview (thumbnail) */
  links: Partial<Record<LinkKind, string>>;
  preview?: string;
  /** the entry as written, minus website-only fields */
  bibtex: string;
}

export type LinkKind = 'pdf' | 'code' | 'project' | 'slides' | 'video';
export const LINK_LABEL: Record<LinkKind, string> = {
  pdf: 'PDF',
  code: 'Code',
  project: 'Project',
  slides: 'Slides',
  video: 'Video',
};
const SITE_FIELDS = ['pdf', 'code', 'project', 'slides', 'video', 'preview'];

/** Remove website-only fields (one per line in our .bib) from an entry's text. */
export function cleanEntry(raw: string): string {
  const re = new RegExp(`^\\s*(${SITE_FIELDS.join('|')})\\s*=.*$\\n?`, 'gim');
  return raw.replace(re, '').replace(/,\s*\n\}$/, '\n}');
}

export const GROUP_LABEL: Record<PubGroup, string> = {
  conference: 'Conference papers',
  journal: 'Journal articles',
  poster: 'Posters',
  inprep: 'In preparation',
};

const ME = { family: 'Zhou', given: ['Jiefeng', 'J.'] };

function readBalanced(src: string, start: number, open: string, close: string): [string, number] {
  // src[start] === open; returns inner text and index after the matching close
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { i++; continue; }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return [src.slice(start + 1, i), i + 1];
    }
  }
  throw new Error('bib: unbalanced braces');
}

function parseFields(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    const m = /\s*,?\s*([A-Za-z][\w-]*)\s*=\s*/y;
    m.lastIndex = i;
    const hit = m.exec(body);
    if (!hit) break;
    const name = hit[1].toLowerCase();
    i = m.lastIndex;
    let value = '';
    if (body[i] === '{') {
      [value, i] = readBalanced(body, i, '{', '}');
    } else if (body[i] === '"') {
      const end = body.indexOf('"', i + 1);
      value = body.slice(i + 1, end);
      i = end + 1;
    } else {
      const end = body.slice(i).search(/[,}\n]/);
      value = body.slice(i, end < 0 ? undefined : i + end).trim();
      i = end < 0 ? body.length : i + end;
    }
    out[name] = value;
  }
  return out;
}

export function cleanTex(s: string): string {
  return s
    .replace(/\\&/g, '&')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/~/g, ' ')
    .replace(/\\textit\{([^}]*)\}|\\emph\{([^}]*)\}/g, '$1$2')
    .replace(/[{}]/g, '')
    .replace(/(\s)'(\d\d)\b/g, '$1’$2')
    .replace(/ '(\d\d)\b/g, ' ’$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAuthors(raw: string): Author[] {
  return raw.split(/\s+and\s+/).map((a) => {
    const clean = cleanTex(a);
    let family: string, given: string;
    if (clean.includes(',')) {
      [family, given] = clean.split(',').map((x) => x.trim());
    } else {
      const parts = clean.split(' ');
      family = parts.pop() ?? '';
      given = parts.join(' ');
    }
    const me = family === ME.family && ME.given.some((g) => given === g);
    return { family, given, me };
  });
}

function shortVenue(type: string, f: Record<string, string>): string {
  if (type === 'article') {
    const j = cleanTex(f.journal ?? '');
    return j.split(':')[0];
  }
  const src = f.booktitle ?? f.howpublished ?? '';
  // "... ({PPoPP}~'27)" or "{SC}~'26" inside parentheses
  const paren = /\(([^()]*'\d\d)\)/.exec(src.replace(/[{}]/g, ''));
  if (paren) return cleanTex(paren[1]);
  const inline = /([A-Z]{2,}[\w-]*)~'(\d\d)/.exec(src.replace(/[{}]/g, ''));
  if (inline) return `${inline[1]} ’${inline[2]}`;
  return cleanTex(src);
}

function groupOf(type: string, f: Record<string, string>): PubGroup {
  const kw = (f.keywords ?? '').toLowerCase();
  if (kw.includes('poster')) return 'poster';
  if (type === 'article') return 'journal';
  if (type === 'unpublished') return 'inprep';
  return 'conference';
}

export function parseBib(src: string): Publication[] {
  // strip % comments (whole-line and trailing, but not \%)
  const text = src.replace(/(^|[^\\])%.*$/gm, '$1');
  const pubs: Publication[] = [];
  const re = /@(\w+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const type = m[1].toLowerCase();
    if (type === 'comment' || type === 'string' || type === 'preamble') continue;
    const [inner, end] = readBalanced(text, m.index + m[0].length - 1, '{', '}');
    re.lastIndex = end;
    const raw = text.slice(m.index, end);
    const comma = inner.indexOf(',');
    const key = inner.slice(0, comma).trim();
    const f = parseFields(inner.slice(comma + 1));
    const pubstate = (f.pubstate ?? '').toLowerCase();
    pubs.push({
      key,
      type,
      group: groupOf(type, f),
      title: cleanTex(f.title ?? ''),
      authors: parseAuthors(f.author ?? ''),
      venue: cleanTex(f.booktitle ?? f.journal ?? f.howpublished ?? ''),
      venueShort: shortVenue(type, f),
      year: Number(f.year ?? 0),
      status: pubstate === 'accepted' ? 'accepted' : pubstate === 'inpreparation' ? 'in preparation' : undefined,
      volume: f.volume,
      number: f.number,
      pages: f.pages ? cleanTex(f.pages) : undefined,
      doi: f.doi,
      publisher: f.publisher ? cleanTex(f.publisher) : undefined,
      links: Object.fromEntries(
        (Object.keys(LINK_LABEL) as LinkKind[]).filter((k) => f[k]).map((k) => [k, f[k].trim()]),
      ) as Partial<Record<LinkKind, string>>,
      preview: f.preview?.trim() || undefined,
      bibtex: cleanEntry(raw.trim()),
    });
  }
  return pubs;
}

export function groupPublications(pubs: Publication[]): { group: PubGroup; label: string; items: Publication[] }[] {
  const order: PubGroup[] = ['conference', 'journal', 'poster', 'inprep'];
  return order
    .map((g) => ({
      group: g,
      label: GROUP_LABEL[g],
      items: pubs.filter((p) => p.group === g).sort((a, b) => b.year - a.year),
    }))
    .filter((g) => g.items.length > 0);
}

export function initials(given: string): string {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((g) => (g.endsWith('.') ? g : `${g[0]}.`))
    .join(' ');
}

/** Published work (no in-preparation entries), newest first, grouped by year. */
export function byYear(pubs: Publication[]): { year: number; items: Publication[] }[] {
  const order: Record<PubGroup, number> = { conference: 0, journal: 1, poster: 2, inprep: 3 };
  const shown = pubs.filter((p) => p.group !== 'inprep');
  const years = [...new Set(shown.map((p) => p.year))].sort((a, b) => b - a);
  return years.map((year) => ({
    year,
    items: shown.filter((p) => p.year === year).sort((a, b) => order[a.group] - order[b.group]),
  }));
}
