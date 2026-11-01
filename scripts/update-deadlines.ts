// Keeps src/data/deadlines.ts current. Run with `pnpm deadlines` (add --dry to only print the changes).
//
//  1. Sync with ccfddl (github.com/ccfddl/ccf-deadlines, the community data behind ccfddl.com):
//     - an `estimated` cycle becomes official as soon as ccfddl lists the real dates;
//     - new cycles and editions of the venues in `venues` are added;
//     - CCF classes follow ccfddl;
//     - when ccfddl disagrees with a date that is already official here (say, an extension), the change is
//       reported and kept as is, unless you pass --prefer-remote.
//  2. Roll forward: once every cycle of a series is over and nothing newer is known, add an estimated cycle
//     52 weeks later (PVLDB's monthly deadlines advance by one month).
//  3. Drop cycles whose paper deadline is more than KEEP_MONTHS months old.
//
// Flags: --dry (print, do not write) · --prefer-remote · --offline (skip ccfddl; roll forward and prune only)
//        --now=YYYY-MM-DD (pretend it is that day; for trying the roll-forward)
//        --ci (used by the deploy workflow: never fails; on any error the file is left as it was)
import { writeFileSync } from 'node:fs';
import YAML from 'yaml';
import { venues, cycles, checked } from '../src/data/deadlines.ts';
import type { Cycle, Milestone, Venue } from '../src/lib/deadlines.ts';

const KEEP_MONTHS = 12;
const SOURCE = 'https://ccfddl.github.io/conference/allconf.yml';
const OUT = new URL('../src/data/deadlines.ts', import.meta.url);

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const PREFER_REMOTE = args.has('--prefer-remote');
const OFFLINE = args.has('--offline');
const CI = args.has('--ci');
/** --now=2027-06-01 pretends it is that day (to try the roll-forward) */
const NOW = process.argv.find((a) => a.startsWith('--now='))?.slice(6);
/** tracks other than the main research track */
const SIDE_TRACK = /industry|workshop|artifact|poster|demo|short|tutorial|doctoral|student|journal/i;

const DAY = 864e5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const log: string[] = [];
const say = (s: string) => log.push(s);

// ---------------------------------------------------------------- time helpers

/** US daylight saving time (second Sunday of March to first Sunday of November) for a local date. */
function usDst(y: number, m: number, d: number): boolean {
  const nthSunday = (month: number, n: number) => {
    const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + 7 * (n - 1);
  };
  if (m < 3 || m > 11) return false;
  if (m > 3 && m < 11) return true;
  return m === 3 ? d >= nthSunday(3, 2) : d < nthSunday(11, 1);
}

/** ccfddl time zone + local wall time → UTC offset string, or null if the zone is unknown. */
function offsetFor(tz: string, date: string): string | null {
  const z = tz.trim().toUpperCase();
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (z === 'AOE' || z === 'UTC-12') return '-12:00';
  if (z === 'UTC' || z === 'GMT' || z === 'UTC+0' || z === 'UTC-0' || z === 'UTC+00:00') return '+00:00';
  if (z === 'PT' || z === 'PST' || z === 'PDT') return usDst(y, m, d) ? '-07:00' : '-08:00';
  if (z === 'ET' || z === 'EST' || z === 'EDT') return usDst(y, m, d) ? '-04:00' : '-05:00';
  const u = /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(z);
  if (u) return `${u[1]}${u[2].padStart(2, '0')}:${u[3] ?? '00'}`;
  return null;
}

/** '2026-12-08 22:59:59' in `tz` → '2026-12-08T22:59:59+00:00' */
function toIso(local: unknown, tz: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(local ?? '').trim());
  if (!m) return null;
  const off = offsetFor(tz, m[1]);
  if (!off) return null;
  const sec = m[4] && m[4] !== '00' ? `:${m[4]}` : ':00';
  return `${m[1]}T${m[2]}:${m[3]}${sec}${off}`;
}

const t = (iso: string) => Date.parse(iso);
const same = (a?: string, b?: string) => (!a && !b) || (!!a && !!b && Math.abs(t(a) - t(b)) < 90_000);
const short = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const tag = (c: Cycle) => `${c.conf} ’${String(c.year).slice(2)}${c.cycle ? ` (${c.cycle})` : ''}`;

/** Shift an ISO string (keeping its offset and wall time) by whole days or months. */
function shift(iso: string, days: number, months = 0): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(T.*)$/.exec(iso)!;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + months, Number(m[3]) + days));
  const ymd = d.toISOString().slice(0, 10);
  let rest = m[4];
  // keep US Pacific/Eastern deadlines on local time across daylight-saving changes
  const off = /([+-]\d{2}:\d{2})$/.exec(rest)?.[1];
  if (off === '-07:00' || off === '-08:00') rest = rest.replace(off, offsetFor('PT', ymd)!);
  if (off === '-04:00' || off === '-05:00') rest = rest.replace(off, offsetFor('ET', ymd)!);
  return ymd + rest;
}

// ---------------------------------------------------------------- labels

const MONTH_LABEL = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;
const monthLabel = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** ccfddl's free-text comment → a short cycle name ("April Cycle Submission Deadline" → "April"). */
function cycleName(comment: unknown): string | undefined {
  let s = String(comment ?? '').split(/[;(]/)[0];
  s = s.replace(/\b(submission|submissions|deadline|deadlines|paper|papers|cycle)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 24) return undefined;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** "November 15-19, 2027" → "Nov 15–19, 2027" */
function fmtWhen(s: unknown): string | undefined {
  let w = String(s ?? '').trim();
  if (!w || /tbd/i.test(w)) return undefined;
  LONG_MONTHS.forEach((name, i) => (w = w.replace(new RegExp(`\\b${name}\\b`, 'g'), MONTHS[i])));
  return w.replace(/(\d)\s*-\s*(\d)/g, '$1–$2').replace(/\s+-\s+/g, ' – ');
}

// ---------------------------------------------------------------- ccfddl

interface DdlEntry {
  title: string;
  description?: string;
  rank?: { ccf?: string };
  confs?: { year: number; link?: string; timezone?: string; date?: string; place?: string; timeline?: Record<string, unknown>[] }[];
}

function remoteCycles(key: string, e: DdlEntry, since: number): Cycle[] {
  const out: Cycle[] = [];
  for (const conf of e.confs ?? []) {
    const tz = conf.timezone ?? 'AoE';
    const tl = (conf.timeline ?? []).filter((x) => /^\d{4}-\d{2}-\d{2}/.test(String(x.deadline ?? '')));
    for (const item of tl) {
      if (SIDE_TRACK.test(String(item.comment ?? ''))) continue;
      const paper = toIso(item.deadline, tz);
      if (!paper) {
        say(`  ? ${key} ${conf.year}: unknown time zone "${tz}", skipped`);
        continue;
      }
      if (t(paper) < since) continue;
      const abstract = item.abstract_deadline ? toIso(item.abstract_deadline, tz) ?? undefined : undefined;
      const ms: Milestone[] = [];
      const reb = item.rebuttal_deadline ? toIso(item.rebuttal_deadline, tz) : null;
      if (reb) ms.push({ label: 'Author response due', date: reb });
      const dec = item.decision_deadline ? toIso(item.decision_deadline, tz) : null;
      if (dec) ms.push({ label: 'Notification', date: dec });
      let cycle = cycleName(item.comment);
      if (!cycle && tl.length > 2) cycle = monthLabel(paper); // monthly deadlines (PVLDB)
      out.push({
        conf: key,
        year: conf.year,
        ...(cycle ? { cycle } : {}),
        url: conf.link ?? '',
        ...(fmtWhen(conf.date) ? { when: fmtWhen(conf.date) } : {}),
        ...(conf.place && !/tbd/i.test(conf.place) ? { where: conf.place } : {}),
        ...(abstract ? { abstract } : {}),
        paper,
        ...(ms.length ? { milestones: ms } : {}),
        source: 'ccfddl',
      });
    }
  }
  return out;
}

/** Find the local cycle a ccfddl cycle describes. */
function match(local: Cycle[], r: Cycle): Cycle | undefined {
  const sameConf = local.filter((c) => c.conf === r.conf && c.year === r.year);
  // the same deadline, give or take an extension
  const near = sameConf
    .filter((c) => Math.abs(t(c.paper) - t(r.paper)) < 21 * DAY && (!c.cycle || !r.cycle || norm(c.cycle) === norm(r.cycle) || !c.estimated))
    .sort((a, b) => Math.abs(t(a.paper) - t(r.paper)) - Math.abs(t(b.paper) - t(r.paper)))[0];
  if (near) return near;
  // an estimate for the same edition and cycle, even if the real date moved further
  const est = sameConf.filter((c) => c.estimated && (norm(c.cycle) === norm(r.cycle) || sameConf.filter((x) => x.estimated).length === 1));
  return est.sort((a, b) => Math.abs(t(a.paper) - t(r.paper)) - Math.abs(t(b.paper) - t(r.paper)))[0];
}

function sync(ddl: DdlEntry[], list: Cycle[], vs: Record<string, Venue>, since: number) {
  const byTitle = new Map(ddl.map((e) => [norm(e.title), e]));
  for (const [key, v] of Object.entries(vs)) {
    const e = byTitle.get(norm(v.ccfddl ?? key));
    if (!e) {
      say(`  · ${key}: not in ccfddl`);
      continue;
    }
    const rank = e.rank?.ccf?.toUpperCase();
    const ccf = rank === 'A' || rank === 'B' || rank === 'C' ? rank : undefined;
    if (ccf !== v.ccf) {
      say(`  ~ ${key}: CCF ${v.ccf ?? '–'} → ${ccf ?? '–'}`);
      if (ccf) v.ccf = ccf;
      else delete v.ccf;
    }
    for (const r of remoteCycles(key, e, since)) {
      const l = match(list, r);
      if (!l) {
        list.push(r);
        say(`  + ${tag(r)}: added, paper ${short(r.paper)}`);
        continue;
      }
      const differs = !same(l.paper, r.paper) || (!!r.abstract && !same(l.abstract, r.abstract));
      if (l.estimated) {
        l.paper = r.paper;
        if (r.abstract) l.abstract = r.abstract;
        else delete l.abstract;
        if (r.url) l.url = r.url;
        if (r.when) l.when = r.when;
        if (r.where) l.where = r.where;
        if (!l.milestones?.length && r.milestones) l.milestones = r.milestones;
        if (!l.cycle && r.cycle) l.cycle = r.cycle;
        delete l.estimated;
        delete l.note;
        l.source = 'ccfddl';
        say(`  ✓ ${tag(l)}: now official, paper ${short(l.paper)}`);
      } else if (differs) {
        if (PREFER_REMOTE) {
          l.paper = r.paper;
          if (r.abstract) l.abstract = r.abstract;
          say(`  ! ${tag(l)}: updated to ccfddl, paper ${short(r.paper)}`);
        } else {
          say(`  ! ${tag(l)}: ccfddl says paper ${r.paper}${r.abstract ? `, abstract ${r.abstract}` : ''}; kept ${l.paper} (check the CFP; --prefer-remote takes ccfddl's)`);
        }
      } else {
        // same dates: fill in details that are missing here
        if (!l.when && r.when) l.when = r.when;
        if (!l.where && r.where) l.where = r.where;
        if (!l.milestones?.length && r.milestones) l.milestones = r.milestones;
      }
    }
  }
}

// ---------------------------------------------------------------- roll forward, prune

function rollForward(list: Cycle[], now: number) {
  const byConf = new Map<string, Cycle[]>();
  for (const c of list) byConf.set(c.conf, [...(byConf.get(c.conf) ?? []), c]);
  for (const [conf, cs] of byConf) {
    const newestYear = Math.max(...cs.map((c) => c.year));
    const series = new Map<string, Cycle[]>();
    for (const c of cs) {
      const k = c.cycle && !MONTH_LABEL.test(c.cycle) ? norm(c.cycle) : c.cycle ? '#monthly' : '';
      series.set(k, [...(series.get(k) ?? []), c]);
    }
    for (const [k, s] of series) {
      const last = s.reduce((a, b) => (t(b.paper) > t(a.paper) ? b : a));
      if (t(last.paper) > now) continue; // something is still ahead in this series
      if (k !== '#monthly' && last.year < newestYear) continue; // the venue moved on to a newer edition
      const monthly = k === '#monthly';
      const days = monthly ? 0 : 364;
      const months = monthly ? 1 : 0;
      // step until the projection lies ahead (only matters if the script has not run for a long time)
      let { paper, abstract, year } = last;
      do {
        paper = shift(paper, days, months);
        if (abstract) abstract = shift(abstract, days, months);
        year = monthly ? (paper.slice(5, 7) === '04' ? year + 1 : year) : year + 1;
      } while (t(paper) <= now);
      const next: Cycle = {
        conf,
        year,
        ...(last.cycle ? { cycle: monthly ? monthLabel(paper) : last.cycle } : {}),
        estimated: true,
        url: monthly ? last.url : new URL(last.url).origin + '/',
        ...(abstract ? { abstract } : {}),
        paper,
        note: `Projected from ${tag(last)}${monthly ? ' (one month later)' : ' (52 weeks later)'}; the call for papers is not out yet`,
        source: 'rollover',
      };
      list.push(next);
      say(`  » ${tag(next)}: estimated from ${tag(last)}, paper ${short(paper)}`);
    }
  }
}

function prune(list: Cycle[], now: number): Cycle[] {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - KEEP_MONTHS);
  return list.filter((c) => {
    const keep = t(c.paper) >= cutoff.getTime();
    if (!keep) say(`  − ${tag(c)}: older than ${KEEP_MONTHS} months, removed`);
    return keep;
  });
}

// ---------------------------------------------------------------- write

const q = (s: unknown) => `'${String(s).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

function render(vs: Record<string, Venue>, list: Cycle[], synced: string | undefined): string {
  const order = Object.keys(vs);
  let s = `// Conference deadlines shown on /conference/. Edit by hand, or run \`pnpm deadlines\` to sync with ccfddl
// (see README → "Conference deadlines"). The script rewrites this file, so keep notes in \`note\` fields.
//
// Times are ISO 8601 with the UTC offset the call for papers uses:
//   AoE (Anywhere on Earth) -12:00 · PDT -07:00 · PST -08:00 · EDT -04:00 · EST -05:00 · UTC +00:00 · CET +01:00 · CEST +02:00
// The page shows each deadline as the CFP states it, plus a live countdown and the viewer's local time.
// \`estimated: true\` = projected from last year's schedule (CFP not out yet).
import type { Cycle, Venue } from '../lib/deadlines';

/** When these dates were last compared with the official pages by hand (shown on the page). */
export const checked = ${q(checked)};
/** When scripts/update-deadlines.ts last synced with ccfddl. */
export const synced: string | undefined = ${synced ? q(synced) : 'undefined'};

/** csrankings: counted in CSRankings' default ranking · ccf: class on the CCF list (7th edition, 2026) */
export const venues: Record<string, Venue> = {
`;
  for (const k of order) {
    const v = vs[k];
    const f = [`name: ${q(v.name)}`, `area: ${q(v.area)}`, `csrankings: ${v.csrankings}`];
    if (v.ccf) f.push(`ccf: ${q(v.ccf)}`);
    if (v.ccfddl) f.push(`ccfddl: ${q(v.ccfddl)}`);
    s += `  ${/^[A-Za-z_]\w*$/.test(k) ? k : q(k)}: { ${f.join(', ')} },\n`;
  }
  s += `};\n\nexport const cycles: Cycle[] = [\n`;
  for (const k of order) {
    const cs = list.filter((c) => c.conf === k).sort((a, b) => t(a.paper) - t(b.paper));
    if (!cs.length) continue;
    s += `  // ${k}\n`;
    for (const c of cs) {
      const f = [`conf: ${q(c.conf)}`, `year: ${c.year}`];
      if (c.cycle) f.push(`cycle: ${q(c.cycle)}`);
      if (c.estimated) f.push('estimated: true');
      f.push(`url: ${q(c.url)}`);
      if (c.when) f.push(`when: ${q(c.when)}`);
      if (c.where) f.push(`where: ${q(c.where)}`);
      if (c.abstract) f.push(`abstract: ${q(c.abstract)}`);
      f.push(`paper: ${q(c.paper)}`);
      let line = `  { ${f.join(', ')}`;
      if (c.milestones?.length) {
        line += `,\n    milestones: [\n${c.milestones.map((m) => `      { label: ${q(m.label)}, date: ${q(m.date)}${m.end ? `, end: ${q(m.end)}` : ''} },`).join('\n')}\n    ]`;
      }
      if (c.note) line += `,\n    note: ${q(c.note)}`;
      if (c.source) line += `,\n    source: ${q(c.source)}`;
      s += `${line} },\n`;
    }
  }
  return `${s}];\n`;
}

// ---------------------------------------------------------------- main

async function main() {
  const now = NOW ? Date.parse(`${NOW}T12:00:00Z`) : Date.now();
  const list: Cycle[] = structuredClone(cycles);
  const vs: Record<string, Venue> = structuredClone(venues);
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - KEEP_MONTHS);
  let synced: string | undefined = (await import('../src/data/deadlines.ts')).synced;

  if (!OFFLINE) {
    say(`ccfddl (${SOURCE}):`);
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`ccfddl: HTTP ${res.status}`);
    const ddl = YAML.parse(await res.text()) as DdlEntry[];
    if (!Array.isArray(ddl) || ddl.length < 50) throw new Error('ccfddl: unexpected data');
    sync(ddl, list, vs, cutoff.getTime());
    synced = new Date(now).toISOString().slice(0, 10);
  }
  say('roll forward and prune:');
  rollForward(list, now);
  const kept = prune(list, now);

  const out = render(vs, kept, synced);
  const changes = log.filter((l) => /^ {2}[+✓!»−~?]/.test(l)).length;
  console.log(log.join('\n'));
  if (DRY) console.log(`\n${changes} change(s); --dry, nothing written.`);
  else {
    writeFileSync(OUT, out);
    console.log(`\n${changes} change(s); wrote src/data/deadlines.ts (${kept.length} cycles).`);
  }
}

main().catch((err) => {
  console.error(`update-deadlines: ${(err as Error).message}${CI ? ' (left the data as it was)' : ''}`);
  process.exit(CI ? 0 : 1);
});
