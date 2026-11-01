// Helpers for the conference deadline tracker (src/pages/conference.astro, data in src/data/deadlines.ts).

export type Area = 'hpc' | 'arch' | 'sys' | 'net' | 'db' | 'pl';

export const AREAS: { id: Area; label: string }[] = [
  { id: 'hpc', label: 'HPC' },
  { id: 'arch', label: 'Architecture' },
  { id: 'sys', label: 'Systems' },
  { id: 'net', label: 'Networks' },
  { id: 'db', label: 'Databases' },
  { id: 'pl', label: 'Programming languages' },
];

export interface Venue {
  name: string;
  area: Area;
  /** counted in csrankings.org's default ranking */
  csrankings: boolean;
  /** class on the CCF recommended list (7th edition, 2026); omit if not listed */
  ccf?: 'A' | 'B' | 'C';
  /** the conference's title in ccfddl (github.com/ccfddl/ccf-deadlines) when it differs from the key */
  ccfddl?: string;
}

export interface Milestone {
  label: string;
  /** ISO 8601 with offset; `end` makes it a period */
  date: string;
  end?: string;
}

export interface Cycle {
  conf: string;
  /** the year the conference takes place */
  year: number;
  /** for venues with several deadlines a year: "Spring", "Round 2", "Dec 2026" … */
  cycle?: string;
  /** the call for papers */
  url: string;
  when?: string;
  where?: string;
  /** ISO 8601 with the CFP's own UTC offset, e.g. 2027-04-09T23:59:00-12:00 (AoE) */
  abstract?: string;
  paper: string;
  /** projected from last year's dates; the CFP is not out yet */
  estimated?: boolean;
  milestones?: Milestone[];
  note?: string;
  /** set by scripts/update-deadlines.ts: 'ccfddl' (imported) or 'rollover' (projected automatically) */
  source?: string;
}

const ZONES: Record<string, string> = {
  '-12:00': 'AoE',
  '-08:00': 'PST',
  '-07:00': 'PDT',
  '-05:00': 'EST',
  '-04:00': 'EDT',
  '+00:00': 'UTC',
  Z: 'UTC',
  '+01:00': 'CET',
  '+02:00': 'CEST',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The deadline as the CFP states it: "Apr 9, 2027, 23:59 AoE" (wall time in the CFP's own zone). */
export function official(iso: string, withYear = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, h, mi, off] = m;
  const zone = ZONES[off] ?? `UTC${off}`;
  return `${MONTHS[Number(mo) - 1]} ${Number(d)}${withYear ? `, ${y}` : ''}, ${h}:${mi} ${zone}`;
}

/** "Mar 3, 2027" or "Mar 3–6, 2027" for a milestone (dates as stated by the CFP). */
export function milestoneDate(ms: Milestone): string {
  const day = (iso: string) => {
    const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
    return { y, mo, d };
  };
  const a = day(ms.date);
  if (!ms.end) return `${MONTHS[a.mo - 1]} ${a.d}, ${a.y}`;
  const b = day(ms.end);
  if (a.y === b.y && a.mo === b.mo) return a.d === b.d ? `${MONTHS[a.mo - 1]} ${a.d}, ${a.y}` : `${MONTHS[a.mo - 1]} ${a.d}–${b.d}, ${a.y}`;
  if (a.y === b.y) return `${MONTHS[a.mo - 1]} ${a.d} – ${MONTHS[b.mo - 1]} ${b.d}, ${a.y}`;
  return `${MONTHS[a.mo - 1]} ${a.d}, ${a.y} – ${MONTHS[b.mo - 1]} ${b.d}, ${b.y}`;
}

/** "SC ’27" */
export const edition = (c: Cycle) => `${c.conf} ’${String(c.year).slice(2)}`;
