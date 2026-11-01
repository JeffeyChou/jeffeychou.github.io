# jeffeychou.github.io

Personal academic homepage and notes of Jiefeng Zhou.
Built with Astro 7 (static output) and three.js. Four sections share one page shell, switched by the About | Blog | Conference | Dev capsule in the top bar:

- **About** (`/`): one centred frosted-glass board with a short bio, News, Publications and Experience. A jellyfish drawn in ASCII drifts in the background.
- **Blog** (`/blog/`): study notes. The index shows a goldfish; each note shows a randomly chosen creature. The bottom of the Notes page shows a map of visitors by country.
- **Conference** (`/conference/`): a paper-deadline tracker with live countdowns. A dragonfly drifts in the background.
- **Dev** (`/dev/`): project cards, each opening a short post about the project. A butterfly drifts in the background.

Everything you normally edit is data: `src/data/profile.ts`, `src/data/publications.bib`, `src/data/deadlines.ts`, Markdown files in `src/content/blog/` and `src/content/projects/`, and files in `public/`.

---

## Run it locally

Requirements: Node 22.23 or newer (Node 24+ recommended) and pnpm 12.

```sh
pnpm install        # once
pnpm dev            # http://127.0.0.1:4321 (live reload while you edit)
pnpm check          # type check; run before committing
pnpm build          # writes the static site to dist/
pnpm preview        # serves dist/ to test the production build
```

`pnpm dev` starts a background server. Stop it with `pnpm astro dev stop`.

---

## Change your information

All personal content lives in **`src/data/profile.ts`**. Save the file and the page reloads.

| What | Field in `profile.ts` | Notes |
|---|---|---|
| Name, Chinese name, title, university | `profile.name`, `nameZh`, `role`, `affiliation` | Shown at the top of the page. |
| Bio | `profile.bio` | One string per paragraph. HTML is allowed for links, e.g. `<a href="https://…" rel="noopener">Prof. X</a>`. Write `&amp;` for a literal `&`. Spell out an abbreviation on first use, e.g. "University of South Florida (USF)". |
| Links under your name | `profile.links` | `kind` picks the icon: `email`, `scholar`, `github`, `orcid`, `cv`. The email link shows the address itself. |
| Mailing address under the photo | `profile.address` | One line per array entry; add your building and office line here. |
| News | `news` | Newest first. `date` is `'YYYY-MM'` (shown as "Dec 2026") or `'YYYY'`. `text` may contain HTML (`<strong>`, `<em>`, links). The list shows four items and folds the rest behind "Show all", so just add new items at the top. |
| Education | `education` | `school`, `degree`, `dates`, `note`. |
| Industrial and research experience | `experience` | `org`, `place`, `role`, `dates`. (`detail` is kept in the data but not shown.) |
| Awards, service | `awards`, `service` | `date` plus `text`. |

The page's section order and headings are in `src/components/sections/` (`About.astro`, `News.astro`, `Publications.astro`, `Experience.astro`) and `src/pages/index.astro`.

### Your photo

Put a portrait at **`public/photo.jpg`** (or `photo.png` / `photo.webp`). It is detected automatically at build time, and until then an empty frame is shown. The frame is 4:5, so an image of about 800 × 1000 px looks best.

### Your CV

Replace **`public/cv.pdf`**. The "CV" link points to it.

---

## Publications

The list is generated from **`src/data/publications.bib`**, which is the same file the LaTeX CV uses.

- **Sorting:** newest year first. Within a year: conference papers, then journal articles, then posters.
- **Hidden:** `@unpublished` entries and anything with `pubstate = {inpreparation}`.
- **Your name in bold:** authors written as `Zhou, Jiefeng` or `Zhou, J.`.
- **Two lines per entry:** the title, then the authors and the venue.
  - The venue is the short conference name from the booktitle (e.g. `({PPoPP}~'27)` → "PPoPP ’27"), or the journal name before any colon.
  - Accepted papers (`pubstate = {accepted}`) show "(to appear)".
- **DOI:** when an entry has `doi = {…}`, its title links to `https://doi.org/…`.
- **BibTeX:** the List / BibTeX switch in the section header shows the whole file, with Copy and Download buttons. The same file is served at `/publications.bib`.

### Add a PDF, code, project page, slides, video or a thumbnail

Add any of these optional fields to an entry. biblatex ignores them, and the website removes them from the BibTeX it displays.

```bibtex
@inproceedings{zhou2027maz,
  ...
  pdf     = {/papers/zhou2027maz.pdf},
  code    = {https://github.com/JeffeyChou/maz},
  project = {https://example.org/maz},
  slides  = {/papers/zhou2027maz-slides.pdf},
  video   = {https://youtu.be/…},
  preview = {/papers/zhou2027maz.png}
}
```

- Put each field on its own line, as above.
- Local files go in **`public/papers/`** and are referenced as `/papers/<file>`.
- Links appear at the end of the second line of the entry. `preview` adds a small 4:3 thumbnail to the left.

---

## Write a note (blog post)

1. Create **`src/content/blog/<slug>.md`**. The file name becomes the URL `/blog/<slug>/`. Use `.mdx` if you need components.
2. Start the file with this frontmatter:

   ```markdown
   ---
   title: "Ring Allreduce, from the α–β model up"
   date: 2026-10-30
   summary: "One or two sentences shown in the list and in link previews."
   tags: ["collectives", "mpi"]
   # optional:
   # updated: 2026-11-15
   # draft: true        # visible in `pnpm dev`, left out of the built site
   # toc: false         # hide the "On this page" outline
   ---
   ```

3. Write Markdown below it.
   - **Math:** `$…$` inline, `$$…$$` for display (KaTeX, rendered at build time).
   - **Code:** fenced blocks with a language name are highlighted (`cuda` is highlighted as C++).
   - **Headings:** `##` and `###` build the "On this page" outline, which appears once there are three or more.
   - **Tables, block quotes and lists** work as usual.
4. **Images in a note:** put the files in **`public/notes/<slug>/`** and write `![Caption](/notes/<slug>/figure.png)`.

Each note gets a tag page at `/blog/tags/<tag>/`, and the RSS feed at `/rss.xml` updates automatically. The list of tags on the Notes page appears once there are five or more notes.

`src/content/blog/ring-allreduce-cost.md` is a working example; edit or delete it.

---

## Conference deadlines

`/conference/` lists paper deadlines with live countdowns. It has Upcoming and Past views, an area filter, CCF-A/B/C and CSRankings labels under each conference name, and an Estimated marker. All of its data is in **`src/data/deadlines.ts`**, and a script keeps it current.

### Automatic updates

```sh
pnpm deadlines          # sync with ccfddl, roll estimates forward, rewrite src/data/deadlines.ts
pnpm deadlines --dry    # only print what would change
```

`scripts/update-deadlines.ts` does three things:

1. **Syncs with [ccfddl](https://github.com/ccfddl/ccf-deadlines)**, the community-maintained data behind ccfddl.com.
   - An `estimated` cycle becomes official as soon as ccfddl lists the real dates.
   - New cycles and editions of the conferences in `venues` are added. Industry, workshop and artifact tracks are skipped.
   - CCF classes follow ccfddl.
   - When ccfddl disagrees with a date that is already official in your file (an extension, say), the script prints the difference and keeps your date. Run `pnpm deadlines --prefer-remote` to take ccfddl's.
2. **Rolls forward.** When every cycle of a series is over and nothing newer is known, it adds an estimate 52 weeks later (same weekday). PVLDB's monthly deadlines advance one month at a time.
3. **Prunes** cycles whose paper deadline is more than 12 months old.

The deploy workflow runs the same script before every build (`pnpm run build:ci`), including the scheduled rebuild every 3 days, so the live page updates by itself. If ccfddl cannot be reached, the build goes on with the file as it is. Run `pnpm deadlines` locally now and then and commit the result, so the repository keeps up too. The page shows both dates: `checked` (when you last compared with the official pages, set by hand) and `synced` (set by the script).

`--offline` skips ccfddl and only rolls forward and prunes. `--now=2027-06-01` pretends it is that day, which is handy for seeing what the roll-forward would do.

### The data file

- **`venues`**: one entry per conference.
  - `area` is one of `hpc`, `arch`, `sys`, `net`, `db`, `pl`.
  - `ccf` is `'A'`, `'B'` or `'C'` (CCF list, 7th edition, 2026); leave it out if the venue is not listed.
  - `csrankings: true` means the venue counts in CSRankings' default ranking (HPCA and ICDE are only optional "next tier" there).
  - `ccfddl` is the conference's title in ccfddl when it differs from the key (for example `'SIGOPS ATC'`, `'IEEE/ACM CGO'`).
- **`cycles`**: one entry per submission deadline. Venues with several deadlines a year (spring/fall, rounds, PVLDB months) get one entry each, named with `cycle`.

The script rewrites the file in a fixed format, so put remarks in a cycle's `note` field (shown as the tooltip of Estimated) rather than in comments.

### Add or fix a deadline by hand

When a call for papers is out before ccfddl has it, or ccfddl has it wrong, edit the cycle directly:

```ts
// an example of the format, not real dates
{ conf: 'SC', year: 2027, url: 'https://sc27.supercomputing.org/…/call-for-papers/',
  when: 'Nov 14–19, 2027', where: 'Atlanta, GA, USA',
  abstract: '2027-04-02T23:59:00-12:00', paper: '2027-04-09T23:59:00-12:00',
  milestones: [
    { label: 'Author response', date: '2027-06-01T00:00:00-12:00', end: '2027-06-04T23:59:00-12:00' },
    { label: 'Notification', date: '2027-07-01T23:59:00-12:00' },
  ] },
```

- **Times** are written with the offset the call for papers uses. The page shows the deadline exactly as stated ("Apr 9, 2027, 23:59 AoE") and also converts it to the reader's time zone.
  - AoE (Anywhere on Earth) is `-12:00`. If a CFP gives only a date, use 23:59 AoE.
  - US Pacific is `-07:00` (PDT) or `-08:00` (PST); US Eastern is `-04:00` (EDT) or `-05:00` (EST). Daylight saving time runs from the second Sunday in March to the first Sunday in November.
  - UTC is `+00:00`; Central Europe is `+01:00` (CET) or `+02:00` (CEST).
- **Estimated:** `estimated: true` marks a projected date. Remove it, or let the script do so, once the real dates are known. Official dates you enter are never overwritten by the sync without `--prefer-remote`.
- **Upcoming vs. past:** a cycle moves to Past by itself in the browser once its paper deadline is over.
- **New conference:** add it to `venues` first; the script then picks up its cycles from ccfddl. The area filter shows only the areas that have conferences.

---

## Dev projects

`/dev/` shows one card per project: name, summary, stack, and links to GitHub, a demo or docs site, and npm. Clicking a card opens the project's short post at `/dev/<file name>/`.

Each project is one Markdown file in **`src/content/projects/`**:

```markdown
---
title: texmorph
summary: One or two sentences. They are the card text and the lead of the post.
repo: https://github.com/JeffeyChou/texmorph
demo: https://jeffeychou.github.io/Texmorph/      # optional: a live demo or docs site
demoLabel: Docs and demos                          # optional, default "Live demo"
npm: '@texmorph/katex'                             # optional: npm package name
stack: [TypeScript, KaTeX, MathJax 4]
year: 2026
order: 3                                           # position on the Dev page, smallest first
preview:                                           # optional, shown above the post
  kind: iframe                                     # a live page (frontend projects) ...
  src: https://jeffeychou.github.io/Texmorph/guide/chaining-steps
  height: 560
# preview: { kind: image, src: https://…/demo.gif, alt: …, width: 800, height: 874 }   # ... or an image/GIF
# draft: true                                      # visible in `pnpm dev` only
---

## What it is
## Why
## How it works
## How to use
```

- **Body:** the four headings above keep the posts consistent. Code blocks, tables and math work as in notes.
- **Iframe previews:**
  - Point `src` at a page whose demo is visible at the top, not at an `#anchor`. Once this site and the demo share the `jeffeychou.github.io` origin, an anchor jump inside the iframe can scroll the whole page.
  - The page must allow framing; GitHub Pages does.
  - The preview is wider than the text column on large screens, up to 64rem.
- **Images:** give `width` and `height` so the page doesn't jump while a large GIF loads. Images load lazily.

---

## Visitor map

The bottom of `/blog/` shows a world map of visitors. The numbers (summary, list, tooltips) are per country. On the map, the busiest countries are shaded province by province where GoatCounter knows the region, so the provinces visitors come from stand out. Hover a country (or tap it on a phone) and the whole country lights up with its count. Switch between the past 30 days and all time.

GitHub Pages keeps no visitor logs, so the counting is done by [GoatCounter](https://www.goatcounter.com/). It is free for personal sites, open source, and sets no cookies, so no consent banner is needed. The section is left out of the built site whenever the build has no statistics.

**Current setup:** the site code is `jeffeychou` (`src/data/site.ts`), counting starts on Oct 31, 2026, and the `GOATCOUNTER_TOKEN` secret is set in the repository and in your `~/.zshrc`. For reference, the one-time setup was:

1. **Create a GoatCounter account** at goatcounter.com and pick a code. For example, the code `jeffeychou` gives you `jeffeychou.goatcounter.com`.
2. **Turn on counting:** put the code in `src/data/site.ts`:
   ```ts
   goatcounter: 'jeffeychou',
   statsSince: '2026-11-15', // the first day counted; "All time" starts here
   ```
   Production pages then load GoatCounter's counter. Local development and `localhost` are never counted.
3. **Let the build read the numbers:**
   - In GoatCounter, open your user menu → **API** and create a key with only the **Read statistics** permission.
   - On GitHub, open the repository's **Settings → Secrets and variables → Actions → New repository secret**, name it `GOATCOUNTER_TOKEN`, and paste the key.
4. **Push.** The deploy workflow passes the secret to the build, which fetches the country counts. The token never reaches the browser.

The workflow also rebuilds the site **every 3 days at 07:17 UTC** (days 1, 4, 7, … of each month), so the map is at most 3 days old. GitHub pauses scheduled workflows in a repository with no activity for 60 days. Any push, or **Actions → Deploy to GitHub Pages → Run workflow**, starts it again.

**Preview locally:**
- `pnpm dev` shows the empty map with a setup note.
- Open `/blog/?demo` to try it with made-up numbers. This works in development only.
- `GOATCOUNTER_TOKEN=<key> pnpm build && pnpm preview` uses your real numbers.
- For the VPS deploy, export `GOATCOUNTER_TOKEN` in the shell before running `deploy/vps.sh`.

**Change the map:**
- The glyph grid is baked into `src/data/world-grid.json` by `pnpm bake:world`.
  - `scripts/bake-world.ts` uses the Equal Earth projection at 200 columns; edit `COLS` there to change the resolution.
  - Each cell records its country and its province. Province outlines come from Natural Earth's 1:10m admin-1 layer, which the script downloads once (about 40 MB) into `node_modules/.cache/`.
  - GoatCounter's region names are matched to provinces by name, including alternative and local names. Where they don't match (for example, UK regions against UK council areas), the country is shaded as a whole.
- The build asks GoatCounter for the region breakdown of the 40 busiest countries in each time range (`REGION_COUNTRIES` in `src/lib/visitors.ts`). This takes a few seconds because of the API's rate limit.
- The colors are `--map-0` to `--map-4` in `src/styles/tokens.css`.

---

## Look and feel

- **Colors, type scale, spacing, board width:** `src/styles/tokens.css`. It has light and dark blocks.
- **Background colors:** `--glyph-near` / `--glyph-mid` / `--glyph-far` (one teal hue at three depths) and `--glyph-alpha`.
- **Board width:** `--board-w`. It grows with the screen: 65rem on laptops, about 68% of the width on large monitors.
- **Styles:** page and section styles are in `src/styles/base.css`, the glass material in `src/styles/glass.css`, and blog and article styles in `src/styles/prose.css`.
- **Theme:** the moon/sun button switches light and dark and remembers the choice. The pause button stops the background animation, and visitors with "reduce motion" enabled get it paused by default.

### The background creatures

The engine is in `src/engine/`. The creature models and their body animation are in `src/engine/creatures/`.

| To change… | Edit |
|---|---|
| Which creature appears on which page | `creatureFor()` in `src/engine/index.ts` (About = jellyfish, blog index = goldfish, Conference = dragonfly, Dev = butterfly, notes = random) |
| How fast creatures travel and meander | `CALM` and the per-creature `SPECS` in `src/engine/locomotion.ts` |
| How fast they beat, pulse or flap | `CLOCK_RATE` in `src/engine/stage.ts` (1 = real-time timing) |
| How big they are | `SIZE` in `src/engine/stage.ts` |
| How faint the creature is on the About page | `body[data-stage="academic"] .stage { opacity }` in `src/styles/base.css` |

If you change a creature's shape, run `pnpm bake`. It regenerates the static ASCII pictures in `src/data/specimens.json`, which are shown before the 3D view loads and on devices without WebGL.

`scripts/preview-creatures.ts` prints the creatures in the terminal: `node scripts/preview-creatures.ts`, or `node scripts/preview-creatures.ts --timeline jellyfish` for the pulse timing.

Development-only pages (a creature viewer and a viewport frame tester) are in `src/pages/_lab/`. The leading underscore keeps them out of the site. To use them while developing, rename the folder to `lab`, then visit `/lab/creatures` or `/lab/frames?w=1440&h=900&src=/`. Rename it back before you commit.

---

## Deploy

### GitHub Pages (recommended)

The site is static, and the workflow `.github/workflows/deploy.yml` already builds and publishes it on every push to `main`.

One-time setup for the user site `https://jeffeychou.github.io`:

1. **Connect this folder to the existing repo, and keep a copy of the old al-folio site** on a branch:

   ```sh
   git remote add origin git@github.com:JeffeyChou/jeffeychou.github.io.git
   git fetch origin
   git push origin origin/main:refs/heads/legacy-al-folio
   ```

2. **Replace `main` with this project:**

   ```sh
   git add -A && git commit -m "New homepage"
   git push --force-with-lease=main:origin/main origin main
   ```

3. **Change the Pages source.** On GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Today it is set to the `gh-pages` branch, which serves the old site.
4. **Wait for the deploy.** Open the **Actions** tab; when "Deploy to GitHub Pages" turns green (about 1–2 minutes), the new site is live.

After that, every `git push` to `main` redeploys. The site URL is set in `astro.config.mjs` (`site:`). If you ever use a custom domain, change it there and add `public/CNAME` with the domain.

### Your own server (fallback)

`deploy/vps.sh` builds the site and copies `dist/` with rsync, and `deploy/Caddyfile` is a matching Caddy config (HTTPS, caching, 404 page):

```sh
VPS=user@your-server deploy/vps.sh    # copies to /var/www/homepage by default
```

---

## Where things are

```
src/data/profile.ts            your information (bio, news, experience, …)
src/data/publications.bib      publications (+ optional pdf/code/project/preview fields)
src/data/deadlines.ts          conference deadlines (/conference/)
src/data/site.ts               GoatCounter code for the visitor map
src/content/blog/*.md          notes
src/content/projects/*.md      Dev projects (one post per project)
public/                        photo.jpg, cv.pdf, papers/, notes/<slug>/ images, favicon
src/components/sections/       the About page sections
src/layouts/                   page shell (Base.astro) and note layout (Post.astro)
src/styles/                    tokens, base, glass, prose
src/engine/                    the ASCII background (three.js)
scripts/update-deadlines.ts    syncs the deadlines with ccfddl (`pnpm deadlines`)
scripts/bake-world.ts          builds the visitor map's glyph grid (`pnpm bake:world`)
.github/workflows/deploy.yml   GitHub Pages deployment
deploy/                        VPS script and Caddy config
```
