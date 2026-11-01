---
title: pi-better-render
summary: Streaming-first rich rendering for the pi coding agent's terminal UI. Markdown, code, tables and LaTeX render while the answer streams in, with formulas shown as real images in Ghostty and kitty.
repo: https://github.com/JeffeyChou/pi-better-render
npm: pi-better-render
stack: [TypeScript, pi extension, MathJax 4, resvg]
year: 2026
order: 2
preview:
  kind: image
  src: https://raw.githubusercontent.com/JeffeyChou/pi-better-render/main/assets/demo.gif
  alt: Streaming Markdown, a table, code and formulas rendered in Ghostty
  width: 800
  height: 874
---

## What it is

An extension for [pi](https://pi.dev)'s terminal UI. It replaces the component that displays assistant messages and draws the answer as it streams:

- headings with rules, lists, task lists, GitHub-style callouts and clickable links;
- code blocks with a language label, syntax highlighting, optional line numbers and, in fullscreen mode, a Copy button;
- tables with rounded borders and correct CJK widths, which fall back to cards when the terminal is too narrow;
- Mermaid flowchart, sequence, state, class and ER diagrams drawn with box characters;
- LaTeX formulas, inline and display, as images that sit in the line like text.

It only changes the display. The session file and the next request to the model keep the original Markdown and LaTeX, and a `context` hook strips any terminal image codes before every request.

## Why

Each existing pi extension covered part of the problem. pi-math typesets formulas but leaves the rest of the Markdown to pi. pi-markdown-preview renders a polished page, but in a separate viewer after the reply has finished. pi-rich-renderer needs a TeX installation and turns formulas into images only when the message ends.

pi-better-render renders the whole answer, structure and math alike, in the chat while it streams, in process, with nothing to install beyond the package.

## How it works

```
assistant delta ─▶ incremental lexer ─▶ block renderer + cache ─▶ ANSI lines ─▶ pi-tui
                                          │
                                          └─ formula ─▶ MathJax 4 (TeX → SVG)
                                                         ─▶ resvg (SVG → PNG, sized to terminal cells)
                                                         ─▶ Kitty graphics protocol, Unicode placeholders
```

- **Cost stays flat while the answer grows.** Only the last two blocks are lexed again on each delta, finished blocks are cached by token identity, and formula images are cached by TeX, color and cell size. A delta at the end of a 61k-character answer takes about 0.6 ms per frame on an Apple M-series laptop.
- **Formulas in about a millisecond.** MathJax 4 runs in process and turns TeX into SVG in about 0.3 ms; resvg rasterises it onto whole terminal cells, so the image is never stretched.
- **Images that behave like text.** In Ghostty and kitty, each image is sent once and then shown through Unicode placeholder cells, so it wraps, scrolls and diffs like ordinary text and stays in the scrollback after pi exits. WezTerm and Warp get direct placements instead; other terminals fall back to a Unicode approximation.

## How to use

```sh
pi install npm:pi-better-render     # install
pi -e npm:pi-better-render          # or try it for one run
```

Inside pi, `/better-render` switches it `on` or `off`, chooses when formulas become images (`math:streaming`, `math:final`, `math:off`), toggles code line numbers (`lines`) and Mermaid diagrams (`mermaid`), and shows the renderer state with `status`.

Formula images need a terminal with the Kitty graphics protocol, outside tmux or screen. Everything else renders in any terminal.
