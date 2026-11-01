// Maps page scroll to (chapter A, pose progress, morph to A+1) by measuring the boards and gaps.
import { clamp01 } from './camera-rig.ts';

export interface ScrollState {
  a: number; // active chapter index
  pose: number; // 0..1 progress of A's board through the viewport
  morph: number; // 0..1 morph from A to A+1 (in the exposed gap)
  c: number; // continuous chapter coordinate (a + morph)
}

interface ChapterEls {
  board: HTMLElement;
  gap: HTMLElement;
}

export class ScrollTracker {
  private chapters: ChapterEls[] = [];
  readonly state: ScrollState = { a: 0, pose: 0, morph: 0, c: 0 };

  bind(root: ParentNode = document): number {
    this.chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')]
      .sort((x, y) => Number(x.dataset.chapter) - Number(y.dataset.chapter))
      .map((sec) => ({
        board: sec.querySelector<HTMLElement>('[data-board]')!,
        gap: sec.querySelector<HTMLElement>('[data-gap]')!,
      }))
      .filter((c) => c.board && c.gap);
    return this.chapters.length;
  }

  get count(): number {
    return this.chapters.length;
  }

  /** Read layout once per frame. Cheap: 2 rects per chapter, no writes. */
  update(): ScrollState {
    const n = this.chapters.length;
    const s = this.state;
    if (!n) return s;
    const vh = window.innerHeight;
    // the morph runs from "board i's bottom passes 85% of the viewport"
    // to "board i+1's top reaches 30%": the hand-off between chapters
    const startLine = 0.85 * vh;
    const endLine = 0.3 * vh;
    let c = 0;
    const rects = this.chapters.map((ch) => ({ b: ch.board.getBoundingClientRect(), g: ch.gap.getBoundingClientRect() }));
    for (let i = 0; i < n - 1; i++) {
      const bottom = rects[i].b.bottom;
      const nextTop = rects[i + 1].b.top;
      // scroll distance between the two trigger events
      const span = Math.max(1, nextTop - endLine - (bottom - startLine));
      const m = clamp01((startLine - bottom) / span);
      c += m;
      if (m < 1) break;
    }
    const a = Math.min(n - 1, Math.floor(c));
    const morph = a >= n - 1 ? 0 : c - a;
    // board progress: top at 90% of the viewport → bottom at the start line
    const b = rects[a].b;
    const pose = clamp01((0.9 * vh - b.top) / Math.max(1, b.height + 0.9 * vh - startLine));
    s.a = a;
    s.morph = morph;
    s.pose = morph > 0 ? 1 : pose;
    s.c = c;
    return s;
  }
}
