// Rasterises the world's countries and their provinces into a character grid for the visitor map
// (src/components/VisitorMap.astro). Run with `pnpm bake:world`; the output (src/data/world-grid.json) is
// committed, so builds need no map data.
//
// Each cell is one monospace glyph, CELL_ASPECT times taller than it is wide. The projection is Equal Earth,
// fitted to the grid; a cell belongs to the country that contains its centre. Countries too small to own a cell
// (Singapore, Malta, …) get the cell nearest their centroid, so every country can be hovered.
// Provinces/states come from Natural Earth's 1:10m admin-1 layer (downloaded once into node_modules/.cache);
// each region keeps its names, normalised with regionKey(), so GoatCounter's region names can be matched.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoBounds, geoCentroid, geoContains, geoEqualEarth } from 'd3-geo';
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { regionKey } from '../src/lib/regions.ts';

const COLS = 200;
const CELL_ASPECT = 1.6; // row height / column width; must match line-height in VisitorMap.astro
const SOUTH = -57; // drop Antarctica and the empty ocean above it

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'));
const all = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;

// ISO 3166-1 numeric → alpha-2 (the code GoatCounter reports); a few features have no numeric code
const BY_NAME: Record<string, string> = { Kosovo: 'XK', 'N. Cyprus': 'CY', Somaliland: 'SO' };
function alpha2(f: Feature<Geometry, { name: string }>): string | null {
  if (f.id != null && f.id !== '-99') {
    const a = countries.numericToAlpha2(String(f.id));
    if (a) return a;
  }
  return BY_NAME[f.properties.name] ?? null;
}

const feats = all.features
  .map((f) => ({ f, cc: alpha2(f) }))
  .filter((x): x is { f: Feature<Geometry, { name: string }>; cc: string } => !!x.cc && x.cc !== 'AQ');

const codes = [...new Set(feats.map((x) => x.cc))].sort();
const index = new Map(codes.map((c, i) => [c, i]));

// fit the projection to the land (without Antarctica) in "cell units": x in columns, y in columns * aspect
const land: FeatureCollection = { type: 'FeatureCollection', features: feats.map((x) => x.f) };
const projection = geoEqualEarth().fitWidth(COLS, land);
const [[, y0], [, y1]] = (() => {
  const p = geoEqualEarth().fitWidth(COLS, land);
  const top = p([0, 84])![1];
  const bottom = p([0, SOUTH])![1];
  return [[0, top], [0, bottom]];
})();
const ROWS = Math.ceil((y1 - y0) / CELL_ASPECT);

const boxes = feats.map((x) => geoBounds(x.f));
function inBox(i: number, lon: number, lat: number): boolean {
  const [[w, s], [e, n]] = boxes[i];
  if (lat < s || lat > n) return false;
  return w <= e ? lon >= w && lon <= e : lon >= w || lon <= e; // boxes crossing the antimeridian
}

const grid: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
const owned = new Map<string, number>();
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const ll = projection.invert!([c + 0.5, y0 + (r + 0.5) * CELL_ASPECT]);
    if (!ll || !Number.isFinite(ll[0])) continue;
    const [lon, lat] = ll;
    if (lat < SOUTH) continue;
    for (let i = 0; i < feats.length; i++) {
      if (!inBox(i, lon, lat)) continue;
      if (geoContains(feats[i].f, [lon, lat])) {
        grid[r][c] = index.get(feats[i].cc)!;
        owned.set(feats[i].cc, (owned.get(feats[i].cc) ?? 0) + 1);
        break;
      }
    }
  }
}

// small countries: claim the cell at the centroid (ocean, or taken from a country with plenty of cells)
const counts = () => {
  const m = new Map<number, number>();
  for (const row of grid) for (const v of row) if (v >= 0) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};
let added = 0;
for (const { f, cc } of feats) {
  if (owned.has(cc)) continue;
  const p = projection(geoCentroid(f));
  if (!p) continue;
  const c = Math.min(COLS - 1, Math.max(0, Math.floor(p[0])));
  const r = Math.min(ROWS - 1, Math.max(0, Math.floor((p[1] - y0) / CELL_ASPECT)));
  const prev = grid[r][c];
  if (prev >= 0 && (counts().get(prev) ?? 0) < 4) continue;
  grid[r][c] = index.get(cc)!;
  owned.set(cc, 1);
  added++;
}

// ---------------------------------------------------------------- provinces (admin-1)

const NE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
const cacheDir = new URL('../node_modules/.cache/natural-earth/', import.meta.url);
const cacheFile = new URL('admin1-10m.geojson', cacheDir);
if (!existsSync(cacheFile)) {
  console.log('downloading Natural Earth admin-1 (≈40 MB, once)…');
  mkdirSync(cacheDir, { recursive: true });
  const res = await fetch(NE_URL);
  if (!res.ok) throw new Error(`Natural Earth: HTTP ${res.status}`);
  writeFileSync(cacheFile, Buffer.from(await res.arrayBuffer()));
}
type Props = Record<string, string | null>;
const admin1 = (JSON.parse(readFileSync(cacheFile, 'utf8')) as FeatureCollection<Geometry, Props>).features;

const a2 = (p: Props) => {
  if (p.iso_a2 && /^[A-Z]{2}$/.test(p.iso_a2)) return p.iso_a2;
  return (p.adm0_a3 && countries.alpha3ToAlpha2(p.adm0_a3)) || null;
};
interface Region { code: string; cc: string; names: string[]; groups: string[] }
const regions: Region[] = [];
const regionFeats: Feature<Geometry, Props>[] = [];
const byCountry = new Map<string, number[]>();
for (const f of admin1) {
  const p = f.properties;
  const cc = a2(p);
  if (!cc || !index.has(cc)) continue;
  const names = new Set<string>();
  for (const n of [p.name, p.name_en, p.woe_name, p.gn_name, p.name_local, ...(p.name_alt ?? '').split('|')]) {
    const k = n ? regionKey(n) : '';
    if (k) names.add(k);
  }
  const country = regionKey(String(p.admin ?? ''));
  const groups = new Set<string>();
  for (const g of [p.region, p.geonunit]) {
    const k = g ? regionKey(g) : '';
    if (k && k !== country) groups.add(k);
  }
  const i = regions.length;
  regions.push({ code: p.iso_3166_2 && !p.iso_3166_2.endsWith('~') ? p.iso_3166_2 : (p.adm1_code ?? `${cc}-${i}`), cc, names: [...names], groups: [...groups] });
  regionFeats.push(f);
  byCountry.set(cc, [...(byCountry.get(cc) ?? []), i]);
}
const rBoxes = regionFeats.map((f) => geoBounds(f));
const rCentroids = regionFeats.map((f) => geoCentroid(f));
function inRBox(i: number, lon: number, lat: number): boolean {
  const [[w, s], [e, n]] = rBoxes[i];
  if (lat < s || lat > n) return false;
  return w <= e ? lon >= w && lon <= e : lon >= w || lon <= e;
}

const rgrid: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const v = grid[r][c];
    if (v < 0) continue;
    const cand = byCountry.get(codes[v]);
    if (!cand?.length) continue;
    const ll = projection.invert!([c + 0.5, y0 + (r + 0.5) * CELL_ASPECT]);
    if (!ll) continue;
    let hit = cand.find((i) => inRBox(i, ll[0], ll[1]) && geoContains(regionFeats[i], ll));
    if (hit === undefined) {
      // coastline mismatch between the two layers: nearest province centroid of the same country
      let best = Infinity;
      for (const i of cand) {
        const [x, y] = rCentroids[i];
        const d = (x - ll[0]) ** 2 + (y - ll[1]) ** 2;
        if (d < best) (best = d), (hit = i);
      }
    }
    if (hit !== undefined) rgrid[r][c] = hit;
  }
}
// keep only the provinces that own a cell, renumbered
const used = [...new Set(rgrid.flat().filter((i) => i >= 0))].sort((a, b) => a - b);
const renum = new Map(used.map((old, i) => [old, i]));

// run-length rows: [startColumn, length, countryIndex, regionIndex (-1: none)]
const rows = grid.map((row, r) => {
  const runs: [number, number, number, number][] = [];
  for (let c = 0; c < COLS; ) {
    const v = row[c];
    const g = rgrid[r][c];
    let e = c + 1;
    while (e < COLS && row[e] === v && rgrid[r][e] === g) e++;
    if (v >= 0) runs.push([c, e - c, v, g >= 0 ? renum.get(g)! : -1]);
    c = e;
  }
  return runs;
});

const out = {
  cols: COLS,
  rows: ROWS,
  aspect: CELL_ASPECT,
  codes,
  regions: used.map((i) => ({ code: regions[i].code, cc: regions[i].cc, names: regions[i].names, groups: regions[i].groups })),
  cells: rows,
};
writeFileSync(new URL('../src/data/world-grid.json', import.meta.url), JSON.stringify(out));
console.log(
  `world-grid.json: ${COLS}×${ROWS} cells, ${codes.length} countries (${owned.size} on the map, ${added} placed at centroids), ${used.length} provinces`,
);
