---
title: texmorph
summary: Seekable formula morphing for the web. It animates one LaTeX formula into another, and every frame is a pure function of progress, so a slider, a timeline or a video renderer can drive it in any order.
repo: https://github.com/JeffeyChou/texmorph
demo: https://jeffeychou.github.io/Texmorph/
demoLabel: Docs and demos
npm: '@texmorph/katex'
stack: [TypeScript, KaTeX, MathJax 4]
year: 2026
order: 3
preview:
  kind: iframe
  src: https://jeffeychou.github.io/Texmorph/guide/chaining-steps
  height: 560
---

## What it is

texmorph turns one rendered formula into another. Symbols that appear in both fly to their new places, removed symbols fade out and new ones fade in:

```
x² + y² = z²   ──▶   x² = z² − y²
```

At `t = 0` and `t = 1` the real formulas are shown, pixel-identical to a plain rendering. It works with KaTeX (fast, small) or MathJax 4 in SVG mode (broad TeX coverage, identical geometry across browsers), and comes with integrations for GSAP, Web Components and Remotion, plus a script-tag build.

## Why

Most animation libraries own a clock: you start an animation and it plays. Many places where formulas change need the opposite. In a slide deck or a step-by-step derivation the host decides when to move on. In a scroll- or slider-driven explanation the reader scrubs back and forth. In a GSAP timeline a tween drives progress. And a video renderer such as Remotion draws frames out of order or in parallel.

texmorph owns no clock. A morph is prepared once, and after that `render(t)` draws the frame for any progress `t` between 0 and 1. The same `t` always gives the same picture, whatever was rendered before.

## How it works

A morph has three phases.

1. **Prepare.** `createMorph` renders both formulas, waits for fonts, measures every glyph and rule once, and matches the symbols of the source to those of the target by glyph, role and position (`morphMap` overrides single pairs). The result is an immutable plan, plain JSON, that says how every symbol moves.
2. **Render.** `render(t)` samples the plan and writes only position, `transform`, `opacity`, `color` and path data to light copies of the symbols. It never reads layout, so a frame typically costs well under a millisecond and can be drawn in any order. With MathJax, a matched glyph that changes shape is drawn as one outline morphing into the other, so delimiters that grow around a fraction keep their stroke weight.
3. **Dispose.** The copies are removed and one real formula stays in place, ready to be the start of the next step.

The planning layer, `@texmorph/core`, has no DOM dependency, so plans can be stored and sampled anywhere, including in Node.

## How to use

```sh
npm install @texmorph/katex katex
```

```ts
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { createMorph } from '@texmorph/katex';

const morph = await createMorph(
  document.querySelector('#formula')!,
  { latex: String.raw`x^2 + y^2 = z^2`, displayMode: true },
  { latex: String.raw`x^2 = z^2 - y^2`, displayMode: true },
  { katex },
);

morph.render(0.5); // any frame, in any order
morph.dispose();   // leaves the target formula in place
```

The [documentation](https://jeffeychou.github.io/Texmorph/) covers chaining steps, easing, custom matching, the MathJax renderer and each integration. It runs in current Chrome, Edge, Firefox and Safari, on desktop and mobile.
