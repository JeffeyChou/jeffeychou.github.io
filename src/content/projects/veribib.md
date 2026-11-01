---
title: VeriBib
summary: A read-only fact-checker for BibTeX, served over MCP. It checks each entry against Semantic Scholar, Crossref, DBLP, arXiv and OpenAlex and shows what differs, with the evidence, without ever editing your library.
repo: https://github.com/JeffeyChou/veribib
stack: [TypeScript, MCP server, SQLite]
year: 2026
order: 1
---

## What it is

VeriBib is an [MCP](https://modelcontextprotocol.io) server that a coding agent such as Claude Code calls to check a bibliography. For every BibTeX entry it returns:

- a status: `verified`, `needs_review`, `unresolved`, `source_unavailable` or `invalid_input`;
- a field-by-field comparison of your values with the recommended ones;
- the evidence for each recommended value: which source gave it, how the record was found (exact DOI, search, …) and whether the answer came from the cache;
- related versions, such as an arXiv preprint and its published paper, linked rather than merged;
- a recommended record, a `nameYearTitle` citation key and a BibTeX entry ready to paste.

It never writes your library. There is no tool that applies a change: you and the agent decide what to adopt.

## Why

The errors that survive into a camera-ready `.bib` are rarely invented papers. They are small mistakes that a "look it up and overwrite" tool either misses or introduces:

- Crossref has a typo in an author name and Semantic Scholar copied it. Counting two sources against one would "correct" a spelling that was right. VeriBib keeps your value and treats the copy as a copy, not as an independent vote.
- OpenAlex gives the year of online publication while your entry has the print year. That is reported, not flagged as an error.
- A source returns a truncated title, such as `cuSZ` for the full title of the paper. It is detected and never recommended.
- Crossref calls an LNCS paper a book chapter. VeriBib keeps `@inproceedings` with the proceedings as `booktitle`.
- A source is down or behind a bot wall. A naive tool reports "not found", so the paper looks fake. VeriBib reports `source_unavailable`: try again later.

Because every recommendation carries its evidence, a reviewer (a person or an agent) can see why without querying anything again.

## How it works

TypeScript on Node 22, run directly without a build step, split into five packages:

| Package | Role |
|---|---|
| `contracts` | zod schemas for every tool input and output, shared with clients |
| `core` | parsing, normalisation, clustering, field arbitration, scoring, citation keys, BibTeX (pure functions) |
| `providers` | the five source adapters, a host allow-list, retries, rate limits and circuit breakers |
| `store` | SQLite state |
| `server` | MCP tools and resources over stdio or HTTP, the batch runner and a CLI |

- **Five sources, each for what it is good at.** Semantic Scholar for recall and identifiers, Crossref for DOI, journal and dates, DBLP for CS venues and author order (through its SPARQL endpoint), arXiv for preprints and versions, OpenAlex for coverage and cross-checks.
- **Polite by construction.** Each source has one rate limit shared by all processes through SQLite. A 429 pauses the whole source, not just one request, and a circuit breaker skips a failing source for a while. An anti-bot page is reported as blocked and never mistaken for "not found".
- **Private.** Exact lookups send only identifiers; searches send only the title, first author, year and venue.
- **Tested offline.** The test suite runs against a fake "world" that serves all five APIs in their real wire formats. False positives found in real reviews are rebuilt there as regression tests.

## How to use

It needs Node 22 or newer.

```sh
git clone https://github.com/JeffeyChou/veribib && cd veribib
./deploy/install.sh               # dependencies, ~/.local/bin/veribib, config files
$EDITOR ~/.config/veribib/.env    # SEMANTIC_SCHOLAR_API_KEY, VERIBIB_CONTACT_EMAIL
claude mcp add --scope user veribib -- ~/.local/bin/veribib serve
```

Then ask the agent, for example, *"verify refs.bib with veribib and show me only what needs changing"*. It sends the file to `verify_bib_batch` and reads the result with `get_batch_run`.

A Semantic Scholar API key is free. Without one, the other four sources still work. VeriBib can also run as an HTTP service with one token per person or machine; the README explains the setup.

**Limitations.** The match thresholds are parameters you should calibrate on your own labelled set. Input is BibTeX or structured records only (no PDF or free-text extraction), and there are no biomedical sources or retraction checks yet.
