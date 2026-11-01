// Visitor counts per country, fetched from GoatCounter at build time (never in the browser, so the API
// token stays secret). Returns null when counting is not set up or the API cannot be reached; the build
// never fails because of it.
import { site } from '../data/site';

export interface VisitorRange {
  key: string;
  label: string;
  /** ISO date the range starts */
  start: string;
  total: number;
  /** ISO 3166-1 alpha-2 → visitors */
  countries: Record<string, number>;
  /** country → region name (as GoatCounter names it) → visitors; only for the busiest countries */
  regions: Record<string, Record<string, number>>;
}
export interface VisitorStats {
  updated: string;
  ranges: VisitorRange[];
}

const HOUR = 3600_000;
const floorHour = (t: number) => new Date(Math.floor(t / HOUR) * HOUR);

const REGION_COUNTRIES = 40; // region breakdown for this many countries per range (API limit: 4 requests/s)
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** /stats/locations (countries) or /stats/locations/XX (regions of one country), all pages */
async function locations(code: string, token: string, start: Date, end: Date, country?: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (let offset = 0, more = true; more && offset < 1000; offset += 100) {
    await pause(260);
    const url = new URL(`https://${code}.goatcounter.com/api/v0/stats/locations${country ? `/${country}` : ''}`);
    url.searchParams.set('start', start.toISOString());
    url.searchParams.set('end', end.toISOString());
    url.searchParams.set('limit', '100');
    url.searchParams.set('offset', String(offset));
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`GoatCounter ${res.status} ${res.statusText}`);
    const body = (await res.json()) as { stats?: { id?: string; count?: number }[]; more?: boolean };
    for (const s of body.stats ?? []) {
      if (!s.count) continue;
      if (country) {
        const name = (s as { name?: string }).name ?? '';
        if (name && name !== '(unknown)') out[name] = (out[name] ?? 0) + s.count;
      } else {
        const cc = (s.id ?? '').toUpperCase();
        if (/^[A-Z]{2}$/.test(cc)) out[cc] = (out[cc] ?? 0) + s.count;
      }
    }
    more = !!body.more;
  }
  return out;
}

let cached: Promise<VisitorStats | null> | undefined;

export function loadVisitorStats(): Promise<VisitorStats | null> {
  cached ??= (async () => {
    const code = site.goatcounter.trim();
    const token = process.env.GOATCOUNTER_TOKEN ?? import.meta.env.GOATCOUNTER_TOKEN;
    if (!code || !token) return null;
    try {
      const now = Date.now();
      const end = floorHour(now + HOUR);
      const since = new Date(`${site.statsSince}T00:00:00Z`);
      const d30 = floorHour(now - 30 * 24 * HOUR);
      const defs = [
        { key: 'd30', label: 'Past 30 days', start: d30 < since ? since : d30 },
        { key: 'all', label: 'All time', start: since },
      ];
      const ranges: VisitorRange[] = [];
      for (const d of defs) {
        const countries = await locations(code, token, d.start, end);
        const total = Object.values(countries).reduce((a, b) => a + b, 0);
        const regions: Record<string, Record<string, number>> = {};
        const busiest = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, REGION_COUNTRIES);
        for (const [cc] of busiest) {
          const r = await locations(code, token, d.start, end, cc);
          if (Object.keys(r).length) regions[cc] = r;
        }
        ranges.push({ key: d.key, label: d.label, start: d.start.toISOString().slice(0, 10), total, countries, regions });
      }
      return { updated: new Date(now).toISOString(), ranges };
    } catch (err) {
      console.warn(`[visitors] statistics unavailable: ${(err as Error).message}`);
      return null;
    }
  })();
  return cached;
}
