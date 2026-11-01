---
title: Bezier Cursor Tail
summary: A dependency-free browser library for a smooth cursor tail and hand-written canvas strokes, with stroke width from pointer speed and curves sampled along quadratic Béziers.
repo: https://github.com/JeffeyChou/bezier-cursor-tail
demo: https://jeffeychou.github.io/bezier-cursor-tail/
stack: [JavaScript, Canvas, SVG]
year: 2026
order: 4
preview:
  kind: iframe
  src: https://jeffeychou.github.io/bezier-cursor-tail/
  height: 560
---

## What it is

A small library in plain JavaScript with two ready-made pieces and the stroke model underneath them:

- **`BezierCursorTail`** draws a glowing pointer dot on an SVG overlay. Hold the primary button and move, and it leaves a fading Bézier trail, like a presenter's laser pointer.
- **`BezierCanvasBrush`** turns a canvas into a handwriting surface: variable-width pen strokes, a pixel eraser and a whole-stroke eraser, undo and redo, high-DPI sizing and redraw on resize, and saving and loading drawings.
- **The stroke model** (`createStrokeModel`, `insertStrokePoint`, `finishStrokeModel`, `drawStrokePoints`) for building your own tools.

Try it in the demo above: draw on the canvas, erase, undo with `Ctrl+Z` or `Cmd+Z`.

## Why

The stroke model was written for the presenter runtime of Maliang Deck, where it draws the laser-pointer trail and the pop-up whiteboard brush. This repository packages that logic as a standalone library with no dependencies, so it can be used outside that runtime.

## How it works

- **Width from speed.** Each pointer sample's speed gives the stroke width at that point.
- **Curves between samples.** Between two pointer events, the stroke follows a quadratic Bézier curve, which is sampled into points whose width changes along the path. The points are drawn as short line segments, and finishing a stroke tapers its end.
- **Compact drawings.** A saved drawing keeps only each stroke's pointer samples and its brush settings; the curve is rebuilt on load, bit for bit. That takes under 4 bytes per sample, about 150 times less than storing the drawn polyline, and an optional deflate step saves another 20–50 %. The binary format is a hand-written proto3 encoding with a published schema.

## How to use

The library is ES modules, so serve the page over HTTP rather than opening the file directly.

```js
import { BezierCanvasBrush, BezierCursorTail } from './src/bezier-cursor-tail.js';

const brush = new BezierCanvasBrush(document.querySelector('canvas'), {
  color: '#111827',
  size: 5,
});

const tail = new BezierCursorTail({ color: '#ef4444', enabled: true });
```

To keep a drawing:

```js
import { encodeDrawing, decodeDrawing, deflateDrawing, inflateDrawing, bytesToBase64, base64ToBytes } from './src/stroke-format.js';

const bytes = await deflateDrawing(encodeDrawing(brush.snapshot()));
localStorage.setItem('drawing', bytesToBase64(bytes));

brush.load(decodeDrawing(await inflateDrawing(base64ToBytes(localStorage.getItem('drawing')))));
```

Run the demo locally with `npm run serve` and open `http://127.0.0.1:5173/`.
