"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { achievements, timeline, trackRecord, type TimelinePage, type TimelineSpread } from "@/data/portfolio";
import { ArrowUpRight } from "@/components/HoverIcons";
import OpenPlanLogo from "@/components/OpenPlanLogo";

/**
 * Ventures as a book whose opening is tied to scroll position (cover styling
 * borrowed from the perspective-book component: spine sheen, layered shadows).
 * --p goes 0 → 1 as the book travels up the viewport: 0 = closed and centred,
 * 1 = open spread (Spotmies left, Reaidy right). Scrolling back closes it.
 *
 * Timeline (addendum-02 §1), >= 1024px: once open, the book pins (position: sticky inside a tall wrapper,
 * native scrolling, ~100vh of scroll per turn) and the leaves turn one at a time, back in time; after the
 * last one it releases to #experience. Leaf k is two faces hinged on the spine that share --tk (0 → 1):
 * its front on the right half (the Reaidy page is leaf 1's front) and its back on the left half.
 * Only the leaf that is turning and the pages next to it are visible; the rest are visibility: hidden.
 * Below 1024px it is a one-page book: the cover opens, the book pins and each page turns over the left spine.
 * Only transform/opacity change; the CSS variables are written once per animation frame.
 * With reduced motion (or without JS) the book is simply open and the spreads stack, unpinned.
 */

const S = trackRecord.spotmies;
const R = trackRecord.reaidy;
const TL: TimelineSpread[] = timeline.spreads; // widened: every spread may hold one or two entries
const TURNS = TL.length; // leaves that turn after the opening spread (one per timeline spread)
// Leaves below 1024px, in reading order: the opening spread's two pages, then each half of every period.
// Each timeline spread is two leaves there: one entry per half, or the same entry on both halves.
const SLIDES = [S.name, S.name, ...TL.flatMap((p) => [p.entries[0].title, (p.entries[1] ?? p.entries[0]).title])];
// Spreads above 1024px, for the progress readout.
const SPREADS = [S.name, ...TL.map((p) => p.years ?? p.title)];
const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => x * x * (3 - 2 * x); // ease in/out
// Leaf k (1-based) turns in the middle 70% of its screen of scrolling, so each spread rests a moment.
const leafT = (t: number, k: number) => ease(clamp01((t - (k - 1) - 0.15) / 0.7));
/* The cover stays shut until the whole book is on screen and pinned, then opens over OPEN screens of scrolling
   (founder, 2026-11-07: it was already turning as the book came into view, so the cover was never seen whole).
   A short rest closed, then the turn, then a short rest open before the first page turns. */
const OPEN = 0.9;
const coverT = (o: number) => ease(clamp01((o - 0.12) / 0.66));
// Spotmies' headline numbers (the Achievements section's figures, founder's wording) for the opening spread.
const SPOT_NUMBERS = achievements.items[0]!.numbers.map((n) => ({ value: `${n.prefix}${n.to}${n.suffix}`, label: n.label }));
// The Reaidy.io spread also carries what was the Reaidy overview page (founder, 2026-11-07).
const isReaidy = (sp: TimelineSpread) => sp.entries[0]?.title === R.name;

// Paper textures: grain, fibres (long, thin streaks) and a faint mottle. They were inline SVG noise, but browsers
// repaint SVG backgrounds whenever their on-screen scale changes, so a turning page was repainted (texture,
// photos, text) many times per turn: the lag on normal phones (2026-11-06). Same filters, rendered once to small
// WebP tiles (scratch script: tiles.js with sharp); a bitmap is drawn once and only moved while a page turns.
const GRAIN = "url(\"/ventures/paper-grain.webp\")";
const FIBRES = "url(\"/ventures/paper-fibres.webp\")";
const MOTTLE = "url(\"/ventures/paper-mottle.webp\")";
// The page's soft darkening towards its edges: an inset shadow (was a radial-gradient background layer; together
// with the bitmap tiles that made one page repaint on every frame of its turn).
const VIG = "inset 0 0 80px rgba(120,98,62,.12)";

const CSS = `
.vb{--p:1;--s:0;${Array.from({ length: TURNS }, (_, i) => `--t${i + 1}:0;--s${i + 1}:0`).join(";")}}
.vb-stick{perspective:2000px;perspective-origin:50% 0%}
.vb-pinspace{display:none}
.vb-mshade{display:none}
.vb-book{position:relative;will-change:transform;transform-style:preserve-3d}
.vb-grid{transform-style:preserve-3d}
.vb-cover{position:absolute;inset:0;z-index:2;transform-origin:50% 0;backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:transform;
  transform:rotateX(calc(var(--p) * 180deg)) translateZ(1px);
  border-radius:16px;overflow:hidden;background:#1c1917;color:#fafaf9;
  box-shadow:0 2px 4px rgba(0,0,0,.06),0 12px 24px rgba(0,0,0,.12),inset 0 0 0 1px rgba(250,250,249,.1)}
/* the cover darkens as it lifts away from the light */
.vb-cover::after{content:"";position:absolute;inset:0;background:#000;opacity:calc(var(--p) * .7);pointer-events:none}
.vb-sheen{position:absolute;left:0;top:0;bottom:0;width:6%;min-width:22px;opacity:.4;
  background:linear-gradient(90deg,hsla(0,0%,100%,0),hsla(0,0%,100%,0) 12%,hsla(0,0%,100%,.25) 29.25%,hsla(0,0%,100%,0) 50.5%,hsla(0,0%,100%,0) 75.25%,hsla(0,0%,100%,.25) 91%,hsla(0,0%,100%,0)),linear-gradient(90deg,rgba(0,0,0,.03),rgba(0,0,0,.1) 12%,transparent 30%,rgba(0,0,0,.02) 50%,rgba(0,0,0,.2) 73.5%,rgba(0,0,0,.5) 75.25%,rgba(0,0,0,.15) 85.25%,transparent)}
.vb-cover[data-done]{visibility:hidden}

/* paper pages: the site's own stone palette (founder: the book must match the UI). Light ink in both themes. */
.vb{--pg-a:#e6dfcf;--pg-b:#f8f4ea}
.dark .vb{--pg-a:#cdc4b1;--pg-b:#ebe4d4}
.vb-paper{--foreground:#1c1917;--muted:#57534e;--border:rgba(28,25,23,.12);--accent:#4f46e5;color:var(--foreground);
  --paper:#f8f4ea;background-color:var(--paper);
  background-image:${FIBRES},${MOTTLE},${GRAIN};
  background-size:420px,640px,160px;
  box-shadow:${VIG},inset 0 0 0 1px rgba(28,25,23,.08)}
/* book details: running head at the top, page number at the bottom */
.vb-head,.vb-folio{position:absolute;font-family:var(--font-geist-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);opacity:.75;pointer-events:none}
.vb-head{top:14px}
.vb-folio{bottom:12px;font-family:var(--font-instrument-serif);font-size:15px;letter-spacing:0;text-transform:none}
/* hardcover board: a thin dark edge around the page block */
.vb-board,.vb-board-l{position:absolute;inset:-9px;border-radius:22px;pointer-events:none;transform:translateZ(-3px);
  background:#1c1917;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 0 0 1px rgba(255,255,255,.04)}
.vb-board-l{display:none}
.dark .vb-paper{--paper:#ebe4d4}
.vb-paper::after,.vb-paper::before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit}
.vb-left::after{background:linear-gradient(90deg,rgba(255,255,255,.25),transparent 12%,transparent 82%,rgba(28,25,23,.16))}
.vb-right::after{background:linear-gradient(90deg,rgba(28,25,23,.18),transparent 16%,transparent 90%,rgba(255,255,255,.2))}
.vb-spine{opacity:clamp(0, calc((var(--p) - .6) * 2.5), 1)}
/* the fold: a crease down the gutter, dark at the centre with a thin highlight either side */
.vb-crease{opacity:clamp(0, calc((var(--p) - .6) * 2.5), 1);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.35) 38%,rgba(28,25,23,.35) 49%,rgba(28,25,23,.5) 50%,rgba(28,25,23,.35) 51%,rgba(255,255,255,.3) 62%,transparent)}
.vb-shadow{position:absolute;inset:0;border-radius:18px;box-shadow:0 24px 48px -22px rgba(0,0,0,.22),0 6px 14px -6px rgba(0,0,0,.1);pointer-events:none;transform:translateZ(-2px)}
.vb-shadow-l{display:none}

/* Phones and tablets (< 1024px): a one-page book (founder, 2026-11-05: book animation like desktop, not slides;
   a two-page spread is too narrow on a phone). Without the vb-anim class on <html> (reduced motion, no JS) the
   pages simply stack. With it: the cover flips open as the book arrives, then the book pins under the nav; a
   page taller than the screen first scrolls up inside the book, then turns over the left spine onto the next.
   A timeline period is one page: its two halves stacked.
   vb-anim is set by the early inline script in layout.tsx, before the first paint (2026-11-06, founder: "pages
   sometimes don't turn, the book scrolls away"). It used to be a flag set by this component's script, so for
   the 2–3s (production) or ~10s (dev server) before that script ran, the book had no scroll room and scrolled
   away like normal content. Now the pinned layout and an estimated scroll room are pure CSS from the start;
   the script refines them (exact --mspace, --fit) and turns the pages once it is ready. */
@media (max-width:1023px){
  .vb-cover,.vb-board,.vb-board-l,.vb-shadow,.vb-shadow-l{display:none}
  .vb-book{transform:none}
  .vb-grid{display:flex;flex-direction:column;gap:16px}
  .vb-left::after,.vb-right::after{background:linear-gradient(90deg,rgba(28,25,23,.14),transparent 9%,transparent 92%,rgba(255,255,255,.18))}
  .vb-left,.vb-right,.vb-spread{box-shadow:${VIG},inset 0 0 0 1px rgba(28,25,23,.08),1px 1px 0 var(--pg-a),2px 2px 0 var(--pg-b),3px 3px 0 var(--pg-a),4px 4px 0 var(--pg-b),0 10px 18px -10px rgba(0,0,0,.35)}
  .vb-spread{display:flex;flex-direction:column;border-radius:16px;overflow:hidden}
  .vb-half{flex:1}
  .vb-hl{border-bottom:1px solid rgba(28,25,23,.08)}

  .vb-anim .vb .vb-stick{position:sticky;top:0!important;height:100svh;overflow:hidden;padding-top:76px;perspective:1600px;perspective-origin:50% 40%}
  /* the page area; pages are stacked in it, the first on top (z-index from JS); the leaf hinges on its left edge */
  /* A long page is cut at the top and bottom of the page area, like a window (2026-11-06: on small phones a page
     scrolling up inside the book slid under the nav buttons). 14px above the area stays open for the turning
     leaf, whose near edge grows a little in perspective. */
  .vb-anim .vb .vb-grid{display:block;position:relative;height:calc(100svh - 76px - 52px);transform-style:flat;perspective:1400px;perspective-origin:30% 35%;
    clip-path:inset(-14px -100vw 0 -100vw)}
  .vb-anim .vb .vb-mrow{height:44px;margin-top:8px}
  /* Performance (2026-11-06, founder: lag on small phones): each page's transform, visibility and will-change are
     written straight onto that page from JS, only when they change (no custom properties on the book, which made
     the browser restyle every page on every scroll). The turning leaf's shadow is one composited layer
     (opacity only) instead of a pseudo-element that repainted the paper beneath on every frame. */

  .vb-anim .vb .vb-mshade{display:block;position:absolute;inset:0;border-radius:16px;pointer-events:none;opacity:0;will-change:opacity;
    background:linear-gradient(90deg,rgba(28,25,23,.4),rgba(28,25,23,.14) 45%,transparent 85%)}
  /* every page is one leaf: Spotmies, Reaidy, then each half of a timeline spread on its own (founder, 2026-11-05:
     later pages must turn like the first two, without the next half showing under them) */
  .vb-anim .vb .vb-spread{display:contents}
  /* Every page fits the page area, so each one simply turns (founder, 2026-11-05: pages that first scrolled up,
     then turned, felt like a double scroll). Tighter padding on the book's pages; a page still taller than the
     area is laid out a little wider and scaled down to fit (--fit, from JS), so its layout doesn't change. */
  .vb-anim .vb .vb-grid>article:not(.vb-spread),.vb-anim .vb .vb-spread>.vb-half{position:absolute;top:0;left:0;
    width:calc(100% / var(--fit,1));min-height:calc(100% / var(--fit,1));
    border:0;border-radius:calc(16px / var(--fit,1));transform-origin:0 0;
    box-shadow:${VIG},inset 0 0 0 1px rgba(28,25,23,.08),1px 1px 0 var(--pg-a),2px 2px 0 var(--pg-b),3px 3px 0 var(--pg-a),4px 4px 0 var(--pg-b),0 10px 18px -10px rgba(0,0,0,.35);
    transform:rotateY(calc(var(--r,0) * -180deg)) scale(var(--fit,1));backface-visibility:hidden;-webkit-backface-visibility:hidden}
  .vb-anim .vb .vb-grid>article:not(.vb-spread){gap:14px;padding-top:36px;padding-bottom:36px}
  .vb-anim .vb .vb-spread>.vb-half{padding-top:40px;padding-bottom:40px}
  /* the cover opens sideways on the spine, like the pages (founder, 2026-11-05: it flipped up before) */
  .vb-anim .vb .vb-cover{display:block;transform-origin:0 50%;border-radius:6px 16px 16px 6px;
    transform:rotateY(calc(var(--p) * -180deg)) translateZ(1px)}
  /* scroll room for the turns: measured by the script (--mspace); until then the same formula without the
     measured extras: one turn (0.42 of the screen) for every page but the last */
  .vb-anim .vb .vb-pinspace{display:block;height:var(--mspace,calc(${SLIDES.length - 1} * 42svh + 50svh))}
  .vb-anim .vb .vb-mrow{display:flex}
  /* until the script has painted once, only the first page shows (the pages are stacked, and without the
     script's z-index the last one would be on top) */
  .vb-anim .vb:not([data-mready]) .vb-grid>article:not(.vb-spread):not(:first-child),
  .vb-anim .vb:not([data-mready]) .vb-spread>.vb-half{visibility:hidden}
  /* Older phone browsers without the svh unit (before Chrome 108 / iOS 15.4): the same sizes in vh. Without this,
     the book's height and scroll room were invalid there (0), so it scrolled away instead of pinning. */
  @supports not (height:1svh){
    .vb-anim .vb .vb-stick{height:100vh}
    .vb-anim .vb .vb-grid{height:calc(100vh - 76px - 52px)}
    .vb-anim .vb .vb-pinspace{height:var(--mspace,calc(${SLIDES.length - 1} * 42vh + 50vh))}
  }
}
@media (min-width:1024px){
  /* closed: book centred on the cover; it slides into place as it opens */
  /* --bs (from JS): the whole book, pages and all, scaled down evenly when it is taller than the screen
     (short or zoomed-in windows), so it always fits between the nav and the bottom of the screen */
  .vb-book{transform-origin:50% 0;transform:scale(var(--bs,1)) translateX(calc((1 - var(--p)) * -25%))}
  /* one rigid leaf hinged on the spine: front = cover, back = the Spotmies page */
  .vb-cover{left:50%;transform-origin:0 50%;border-radius:6px 16px 16px 6px;transform:rotateY(calc(var(--p) * -180deg)) translateZ(1px)}
  .vb-left{transform-origin:100% 50%;transform:rotateY(calc((1 - var(--p)) * 180deg)) translateZ(1px);
    backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:transform}
  .vb-left::before{z-index:1;background:#000;opacity:calc((1 - var(--p)) * .8)}
  /* the turning leaf casts a shadow across the right page, strongest when upright */
  .vb-right::before{z-index:1;background:linear-gradient(90deg,rgba(28,25,23,.38),rgba(28,25,23,.12) 45%,transparent 80%);opacity:var(--s)}
  /* page block edges: the book has thickness */
  /* page block: the stack of pages shows along the outer side and the bottom of each half */
  .vb-right,.vb-pr{box-shadow:${VIG},inset 0 0 0 1px rgba(28,25,23,.08),1px 1px 0 var(--pg-a),2px 2px 0 var(--pg-b),3px 3px 0 var(--pg-a),4px 4px 0 var(--pg-b),5px 5px 0 var(--pg-a),6px 6px 0 var(--pg-b),7px 7px 3px rgba(0,0,0,.12)}
  .vb-left,.vb-pl{box-shadow:${VIG},inset 0 0 0 1px rgba(28,25,23,.08),-1px 1px 0 var(--pg-a),-2px 2px 0 var(--pg-b),-3px 3px 0 var(--pg-a),-4px 4px 0 var(--pg-b),-5px 5px 0 var(--pg-a),-6px 6px 0 var(--pg-b),-7px 7px 3px rgba(0,0,0,.12)}
  /* board in two halves like the shadow: the left half appears once the Spotmies page has landed */
  .vb-board{left:50%;right:-12px;top:-10px;bottom:-14px;border-radius:6px 20px 20px 6px}
  .vb-board-l{display:block;left:-12px;right:50%;top:-10px;bottom:-14px;border-radius:20px 6px 6px 20px;opacity:clamp(0, calc((var(--p) - .92) * 12.5), 1)}
  /* Shadow in two halves. The right half (under the cover / Reaidy page) is always there; the left half only
     fades in once the Spotmies page has landed. One full-width shadow outlined an empty "white card" on the
     left while the page was still turning (visible in light mode). */
  .vb-shadow{left:50%;border-radius:6px 18px 18px 6px}
  .vb-shadow-l{display:block;position:absolute;top:0;bottom:0;left:0;right:50%;border-radius:18px 6px 6px 18px;box-shadow:0 24px 48px -22px rgba(0,0,0,.22),0 6px 14px -6px rgba(0,0,0,.1);
    pointer-events:none;transform:translateZ(-2px);opacity:clamp(0, calc((var(--p) - .92) * 12.5), 1)}
  /* open spread: each page curves down into the gutter (shade deepens over the last ~14%), with a soft
     highlight where the page bends, and lifts slightly at its outer edge */
  .vb-left::after,.vb-pl::after{background:
    linear-gradient(90deg,rgba(255,255,255,.28),transparent 7%),
    linear-gradient(90deg,transparent 78%,rgba(255,255,255,.18) 84%,rgba(28,25,23,.08) 90%,rgba(28,25,23,.22) 96%,rgba(28,25,23,.38))}
  .vb-right::after,.vb-pr::after{background:
    linear-gradient(270deg,rgba(255,255,255,.28),transparent 7%),
    linear-gradient(270deg,transparent 78%,rgba(255,255,255,.18) 84%,rgba(28,25,23,.08) 90%,rgba(28,25,23,.22) 96%,rgba(28,25,23,.38))}
  .vb-pl{border-radius:16px 0 0 16px}
  .vb-pr{border-radius:0 16px 16px 0}
}

/* ---------- Timeline leaves (addendum-02 §1) ---------- */
/* soft shadow from the leaf passing over a page (opacity only): --sh is that leaf's sin(pi * t) */
.vb-pl::before,.vb-pr::before{z-index:1;opacity:var(--sh,0)}
.vb-pr::before{background:linear-gradient(90deg,rgba(28,25,23,.38),rgba(28,25,23,.12) 45%,transparent 80%)}
.vb-pl::before{background:linear-gradient(270deg,rgba(28,25,23,.3),rgba(28,25,23,.1) 45%,transparent 80%)}
/* Side panels beside the closed book (founder, 2026-11-07: the closed book stood alone between two empty sides).
   Desktop with motion only; they fade and slide out as the cover opens (--p), and are clickable only while shut. */
.vb-side{display:none}
@media (min-width:1024px) and (prefers-reduced-motion:no-preference){
  .vb-side{display:flex;position:absolute;top:0;bottom:64px;width:calc(25% - 2.5rem);flex-direction:column;justify-content:center;gap:28px;
    pointer-events:none;opacity:clamp(0, calc(1 - var(--p) * 3), 1);will-change:opacity,transform}
  .vb-side-l{left:0;transform:translateX(calc(var(--p) * -40px))}
  .vb-side-r{right:0;transform:translateX(calc(var(--p) * 40px))}
  .vb[data-shut] .vb-side{pointer-events:auto}
  @keyframes vb-nudge{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}
  .vb-nudge{animation:vb-nudge 1.6s ease-in-out infinite}
}
@media (min-width:1024px) and (prefers-reduced-motion:no-preference){
  /* the pin: a spacer after the book adds ~100vh of scroll per turn; the book sticks while it is used up
     (a sticky element cannot move into its parent's padding, so this must be content, not padding) */
  .vb-pinspace{display:block;height:calc((var(--turns) + ${OPEN}) * 100vh)}
  .vb-stick{position:sticky;top:72px}
  .vb-spread{position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none}
  .vb-half{position:absolute;top:0;bottom:0;width:50%;pointer-events:auto;backface-visibility:hidden;-webkit-backface-visibility:hidden}
  /* back of a leaf (left half) and front of a leaf (right half), both hinged on the spine */
  .vb-hl{left:0;transform-origin:100% 50%;transform:rotateY(calc((1 - var(--t)) * 180deg)) translateZ(var(--z))}
  .vb-hr{left:50%;transform-origin:0 50%;transform:rotateY(calc(var(--t,0) * -180deg)) translateZ(var(--z))}
  /* the Reaidy page is the front of leaf 1; it stays just under the cover (1px) */
  .vb-right{transform-origin:0 50%;transform:rotateY(calc(var(--t1) * -180deg)) translateZ(.8px);backface-visibility:hidden;-webkit-backface-visibility:hidden}
  .vb [data-off]{visibility:hidden}
}
`;

// Reduced motion (and no JS): no pin, no turning; every spread stacked under the first, in order.
const STACKED = `
.vb-pinspace{display:none!important}
.vb-stick{position:static!important}
.vb-spread{position:relative!important;inset:auto!important;grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;margin-top:32px;pointer-events:auto!important}
.vb-half{position:relative!important;left:auto!important;width:auto!important;min-height:20rem;transform:none!important;visibility:visible!important}
.vb-right{transform:none!important;visibility:visible!important}
.vb-left{visibility:visible!important}
.vb-tl-ind{display:none}
`;
const CSS_ALL = CSS + `@media (min-width:1024px) and (prefers-reduced-motion:reduce){${STACKED}}`;

// Three text styles on the paper (user decision): serif = names, numbers, quote;
// sans = body (same size/grey as other sections); uppercase mono = small labels.
const label = "font-mono text-[11px] leading-relaxed tracking-[0.16em] text-muted uppercase";
const body = "text-[15px] leading-relaxed";
const sideLabel = "font-mono text-[11px] tracking-[0.2em] text-accent uppercase";

/* ---------- Hand-drawn graphs (pencil on graph paper) ----------
   Only figures with the same unit share a chart. Values are the real figures (lower bounds, "40+").
   Deterministic wobble (seeded), so server and client render the same SVG. */

type Bar = { label: string; value: string };
const num = (v: string) => {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return /k/i.test(v) ? n * 1000 : n;
};
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
}
// a pencil line: slightly bowed, ends overshoot a little
function pencil(r: () => number, x1: number, y1: number, x2: number, y2: number, j = 1.2) {
  const f = (v: number) => v.toFixed(1);
  const mx = (x1 + x2) / 2 + r() * j * 2;
  const my = (y1 + y2) / 2 + r() * j * 2;
  return `M${f(x1 + r() * j)},${f(y1 + r() * j)} Q${f(mx)},${f(my)} ${f(x2 + r() * j)},${f(y2 + r() * j)}`;
}

function SketchBars({ bars, seed, w = 300, h = 168 }: { bars: Bar[]; seed: number; w?: number; h?: number }) {
  const r = rng(seed);
  // drawn at roughly the size it is shown, so the pencil text stays readable
  const W = w;
  const H = h;
  const left = 20;
  const base = H - 44;
  const top = 30;
  const max = Math.max(...bars.map((b) => num(b.value)));
  const slot = (W - left - 14) / bars.length;
  const bw = Math.min(46, slot * 0.46);
  const id = "vbh" + seed;
  const f = (v: number) => v.toFixed(1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#1c1917" strokeWidth="1" opacity=".42" />
        </pattern>
      </defs>
      {/* graph paper */}
      <g stroke="#1c1917" opacity=".07">
        {Array.from({ length: Math.floor(W / 12) + 1 }, (_, i) => (
          <line key={"v" + i} x1={i * 12} y1="0" x2={i * 12} y2={H} />
        ))}
        {Array.from({ length: Math.floor(H / 12) + 1 }, (_, i) => (
          <line key={"h" + i} x1="0" y1={i * 12} x2={W} y2={i * 12} />
        ))}
      </g>
      <g fill="none" stroke="#1c1917" strokeLinecap="round" strokeLinejoin="round">
        {/* axes */}
        <path d={pencil(r, left, top - 12, left, base + 2, 0.8)} strokeWidth="1.3" opacity=".8" />
        <path d={pencil(r, left - 4, base, W - 8, base, 0.8)} strokeWidth="1.3" opacity=".8" />
        <path d={`M${left - 4},${top - 6} L${left},${top - 13} L${left + 4},${top - 6}`} strokeWidth="1.2" opacity=".7" />
        {bars.map((b, i) => {
          const h = Math.max(6, ((base - top) * num(b.value)) / max);
          const x = left + slot * i + (slot - bw) / 2;
          const y = base - h;
          const quad = `M${f(x + r())},${f(base)} L${f(x + r())},${f(y + r())} L${f(x + bw + r())},${f(y + r())} L${f(x + bw + r())},${f(base)} Z`;
          return (
            <g key={b.label}>
              <path d={quad} fill={`url(#${id})`} stroke="none" />
              <path d={pencil(r, x, base, x, y)} strokeWidth="1.25" opacity=".85" />
              <path d={pencil(r, x - 2, y, x + bw + 2, y)} strokeWidth="1.25" opacity=".85" />
              <path d={pencil(r, x + bw, y, x + bw, base)} strokeWidth="1.25" opacity=".85" />
              <text x={x + bw / 2} y={y - 7} textAnchor="middle" fill="#1c1917" stroke="none" fontFamily="var(--font-instrument-serif)" fontSize="22">
                {b.value}
              </text>
              <text x={x + bw / 2} y={base + 15} textAnchor="middle" fill="#57534e" stroke="none" fontFamily="var(--font-geist-sans)" fontSize="11.5">
                {b.label.split(" ").length > 1 ? (
                  <>
                    <tspan x={x + bw / 2}>{b.label.split(" ").slice(0, -1).join(" ")}</tspan>
                    <tspan x={x + bw / 2} dy="13">{b.label.split(" ").slice(-1)}</tspan>
                  </>
                ) : (
                  b.label
                )}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** The figures as hand-drawn graphs; a plain list stays for screen readers. */
function Graphs({ m, kind }: { m: typeof S.metrics; kind: "spotmies" | "reaidy" }) {
  const it = m.items;
  const list = (
    <dl className="sr-only">
      {it.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd>{x.value}</dd>
        </div>
      ))}
    </dl>
  );
  if (kind === "spotmies") {
    const counted = it.filter((x) => /^\d+\+$/.test(x.value));
    const other = it.filter((x) => !/^\d+\+$/.test(x.value));
    return (
      <div className="border-y border-border py-4">
        {list}
        <SketchBars seed={11} bars={counted} w={440} h={168} />
        {other.length > 0 && (
          <p className="mt-1 text-right font-serif text-[17px] text-muted italic">
            + {other.map((x) => `${x.value} ${x.label}`).join(" · ")}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 border-y border-border py-4">
      {list}
      <SketchBars seed={23} bars={it.slice(0, 2)} w={220} h={168} />
      <SketchBars seed={37} bars={it.slice(2, 4)} w={220} h={168} />
    </div>
  );
}

// Each page flows on its own (the old shared 7-row subgrid left big gaps wherever the facing page had a
// taller item, and rows emptied by hidden null fields stayed blank).
const pageCls = "vb-paper relative flex scroll-mt-24 flex-col gap-5 px-6 pt-10 pb-12 sm:px-10 sm:pt-11 sm:pb-12";
// A timeline page (phase 1: just a year or a title), centred so it stays visible however the book is pinned.
const halfCls = "relative flex min-h-56 flex-col items-start justify-center px-6 py-14 sm:px-10";

// Logo on a small dark plate: both logos have white lettering made for dark backgrounds.
function LogoPlate({ logo, h }: { logo: { src: string; width: number; height: number; alt: string }; h: number }) {
  return (
    <span className="vb-plate inline-flex self-start rounded-md bg-[#1c1917] px-3.5 py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- small pre-optimised WebP, fixed size */}
      <img
        src={logo.src}
        width={Math.round((logo.width / logo.height) * h)}
        height={h}
        alt={logo.alt}
        loading="lazy"
        decoding="async"
        className="block"
        style={{ height: h, width: "auto" }}
      />
    </span>
  );
}

// Logo on the dark cover (its white lettering is made for dark backgrounds).
function CoverLogo({ logo, h }: { logo: { src: string; width: number; height: number; alt: string }; h: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small pre-optimised WebP, fixed size
    <img
      src={logo.src}
      width={Math.round((logo.width / logo.height) * h)}
      height={h}
      alt=""
      loading="lazy"
      decoding="async"
      className="block"
      style={{ height: h, width: "auto" }}
    />
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className={label}>{title}</h4>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((c) => (
          <li key={c} className="rounded-full border border-border px-2.5 py-0.5 text-[12.5px] text-muted">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

type TLPage = TimelinePage;

/* A photo pinned to the page like a print: white border, a strip of tape, a slight tilt. Placeholders
   (picsum stand-ins until the founder's files arrive) say so in the caption. */
// `wide`: a 2:1 print for group photos that would lose people at the usual 45:32.
function PagePhoto({ image, small, tilt = -1.2, wide, full }: { image: NonNullable<TLPage["image"]>; small?: boolean; tilt?: number; wide?: boolean; full?: boolean }) {
  const openPreview = React.useContext(PreviewCtx);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.src} alt={image.placeholder ? "" : image.alt} loading="lazy" width={wide ? 1000 : 900} height={wide ? 500 : 640} className={"block w-full object-cover " + (wide ? "aspect-[2/1]" : "aspect-[45/32]")} />
  );
  return (
    <figure
      className={"vb-photo relative w-full bg-white p-2 pb-1.5 shadow-[0_8px_18px_-8px_rgba(0,0,0,.35)] " + (full ? "" : small ? "max-w-[300px]" : "max-w-[400px]")}
      style={{ rotate: `${tilt}deg` }}
    >
      <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rotate-[2deg] bg-[rgba(214,206,190,.75)] shadow-sm" />
      {/* Click or tap a photo to see it larger (founder, 2026-11-06). Placeholders don't open. */}
      {image.placeholder ? (
        img
      ) : (
        <button
          type="button"
          onClick={(e) => openPreview({ src: image.src, alt: image.alt }, e.currentTarget)}
          aria-label={`View photo larger: ${image.alt}`}
          className="block w-full cursor-zoom-in outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {img}
        </button>
      )}
      <figcaption className="px-1 pt-1.5 font-mono text-[10px] leading-snug tracking-[0.08em] text-[#57534e] uppercase">
        {image.placeholder ? "[placeholder image]" : image.alt}
      </figcaption>
    </figure>
  );
}

/* ---------- Photo preview ---------- */
type Preview = { src: string; alt: string };
const PreviewCtx = React.createContext<(p: Preview, from: HTMLElement) => void>(() => {});

/** Full-screen view of one page photo: whole photo (never cropped), caption, close with ×, Esc or a click
    outside it. Rendered into <body>, because the book's 3D transforms would trap a fixed overlay. */
function PhotoPreview({ preview, onClose }: { preview: Preview | null; onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const [shown, setShown] = React.useState(false); // drives the fade/zoom in
  React.useEffect(() => {
    if (!preview) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden"; // no page scrolling (or page turning) behind the preview
    closeRef.current?.focus();
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        e.preventDefault(); // the close button is the only control: keep focus on it
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      setShown(false); // ready to fade in again next time
      root.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [preview, onClose]);
  if (!preview) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={preview.alt}
      onClick={onClose}
      className={"fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-black/85 p-4 backdrop-blur-sm transition-opacity duration-200 sm:p-10 " + (shown ? "opacity-100" : "opacity-0")}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-2xl leading-none text-white outline-none hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span aria-hidden="true">×</span>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- same pre-optimised WebP the page already loaded */}
      <img
        src={preview.src}
        alt={preview.alt}
        onClick={(e) => e.stopPropagation()}
        className={"max-h-[80svh] max-w-full rounded-md object-contain shadow-2xl transition-transform duration-200 " + (shown ? "scale-100" : "scale-95")}
      />
      <p className="max-w-[60ch] text-center font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase">{preview.alt}</p>
    </div>,
    document.body,
  );
}

/* Title line: linked when there's a link, with a small Draft marker until the founder approves the wording. */
function EntryTitle({ pg, id, big }: { pg: TLPage; id?: string; big?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h3 id={id} className={"font-serif leading-tight " + (big ? "text-[34px] sm:text-[44px]" : "text-[28px] sm:text-[34px]")}>
        {pg.link ? <NameLink name={pg.title} href={pg.link} /> : pg.title}
      </h3>
      {pg.draft && <span className={"rounded-full border border-dashed border-border px-2.5 py-0.5 " + label}>Draft</span>}
    </div>
  );
}

function WhatIDid({ items }: { items: string[] }) {
  return (
    <div>
      <p className={label}>What I did</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((w) => (
          <li key={w} className={body + " flex max-w-[50ch] gap-2.5"}>
            <span aria-hidden="true" className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Outcome({ text }: { text: string }) {
  return (
    <div className="border-l-2 border-accent pl-4">
      <p className={label}>Outcome</p>
      <p className={body + " mt-1 max-w-[50ch]"}>{text}</p>
    </div>
  );
}

/* Two entries in one spread: each page tells one story in full (years, title, role, line, photo, work, outcome). */
function EntryPage({ pg, id, tilt }: { pg: TLPage; id?: string; tilt: number }) {
  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {pg.years && <p className="font-serif text-4xl leading-none sm:text-[44px]">{pg.years}</p>}
        {pg.type && <p className={label}>{pg.type}</p>}
      </div>
      <EntryTitle pg={pg} id={id} />
      {pg.role && <p className={label}>{pg.role}</p>}
      {pg.oneLine && <p className={body + " max-w-[46ch]"}>{pg.oneLine}</p>}
      {pg.image && (
        <div className="mt-2 mb-1">
          <PagePhoto image={pg.image} small tilt={tilt} />
        </div>
      )}
      {pg.whatIDid && pg.whatIDid.length > 0 && <WhatIDid items={pg.whatIDid} />}
      {pg.outcome && <Outcome text={pg.outcome} />}
    </div>
  );
}

/* One entry over both pages. Left: years, type, title, role, line, photo. Right: the work and the outcome. */
function SoloLeft({ pg, id, extra }: { pg: TLPage; id: string; extra?: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-4">
      {pg.years && <p className="font-serif text-5xl leading-none sm:text-6xl">{pg.years}</p>}
      {pg.type && <p className={label}>{pg.type}</p>}
      <EntryTitle pg={pg} id={id} big />
      {pg.role && <p className={label}>{pg.role}</p>}
      {pg.oneLine && <p className={body + " max-w-[46ch]"}>{pg.oneLine}</p>}
      {pg.image &&
        (pg.besideImage ? (
          // Two prints side by side, tilted opposite ways (e.g. Hexagon: the layout and the etched boards).
          <div className="mt-3 grid grid-cols-2 gap-4 sm:gap-6">
            <PagePhoto image={pg.image} small tilt={-1.4} />
            <PagePhoto image={pg.besideImage} small tilt={1.6} />
          </div>
        ) : (
          <div className="mt-3">
            <PagePhoto image={pg.image} />
          </div>
        ))}
      {extra}
    </div>
  );
}

function SoloRight({ pg, intro, extra }: { pg: TLPage; intro?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6">
      {intro}
      {pg.whatIDid && pg.whatIDid.length > 0 && <WhatIDid items={pg.whatIDid} />}
      {pg.gallery && pg.gallery.length > 0 && (
        // Extra photos (e.g. Hexagon's boards), side by side and tilted opposite ways like prints taped in.
        // A single extra photo gets the normal size instead of half a grid.
        <div className={"mt-1 grid gap-4 sm:gap-6 " + (pg.gallery.length > 1 ? "grid-cols-2" : "")}>
          {pg.gallery.map((g, i) => (
            <PagePhoto key={g.src} image={g} small={pg.gallery!.length > 1} tilt={i % 2 ? 1.6 : -1.4} />
          ))}
        </div>
      )}
      {pg.chips && pg.chips.items.length > 0 && <Chips title={pg.chips.title} items={pg.chips.items} />}
      {pg.outcome && <Outcome text={pg.outcome} />}
      {pg.link && (
        <a href={pg.link} target="_blank" rel="noopener noreferrer" className={label + " -my-1 inline-flex items-center gap-1.5 self-start py-1 underline-offset-4 hover:text-foreground hover:underline"}>
          Visit {pg.title} <ArrowUpRight size={12} />
        </a>
      )}
      {extra}
    </div>
  );
}

/* Headline figures in one row of four, serif numbers over small labels (pencil-free: they are the big ones). */
function NumberRow({ title, items, note, small }: { title?: string; items: { value: string; label: string }[]; note?: string; small?: boolean }) {
  return (
    <div className="w-full">
      {title && <h4 className={label + " mb-2.5"}>{title}</h4>}
      <dl className="grid grid-cols-4 gap-x-3 border-y border-border py-3">
        {items.map((x) => (
          <div key={x.label} className="flex min-w-0 flex-col">
            <dt className="order-last mt-1.5 text-[11.5px] leading-snug text-muted">{x.label}</dt>
            <dd className={"font-serif leading-none tracking-[-0.01em] " + (small ? "text-[26px] sm:text-[30px]" : "text-[30px] sm:text-[36px]")}>{x.value}</dd>
          </div>
        ))}
      </dl>
      {note && <p className={label + " mt-2"}>{note}</p>}
    </div>
  );
}

/* Growth as two dated values (no computed %): e.g. Team 4 (2020) → 25+ (Jun 2025). */
function GrowthLine({ g }: { g: NonNullable<typeof S.metrics.growth> }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className={label}>{g.label} growth</span>
      <span className="font-serif text-2xl leading-none">{g.from.value}</span>
      <span className={label}>{g.from.date}</span>
      <span aria-label="to" className="text-accent">→</span>
      <span className="font-serif text-2xl leading-none">{g.to.value}</span>
      <span className={label}>{g.to.date}</span>
    </p>
  );
}

export default function VenturesBook({ coverKicker }: { coverKicker: string }) {
  const ref = React.useRef<HTMLDivElement>(null); // root; above 1024px also the tall pin wrapper
  const stickRef = React.useRef<HTMLDivElement>(null);
  const bookRef = React.useRef<HTMLDivElement>(null);
  const coverRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const pinTop = React.useRef(72); // the sticky top in px, measured
  const [spread, setSpread] = React.useState(0);
  // Photo preview: which photo is open, and the photo button to give focus back to when it closes.
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const opener = React.useRef<HTMLElement | null>(null);
  const openPreview = React.useCallback((p: Preview, from: HTMLElement) => {
    opener.current = from;
    setPreview(p);
  }, []);
  const closePreview = React.useCallback(() => {
    setPreview(null);
    opener.current?.focus({ preventScroll: true });
  }, []);
  // Phones/tablets: the page readout is written straight into the DOM while scrolling (a React re-render of the
  // whole book at every page change caused a stutter on small phones).
  const slideRef = React.useRef(0);
  const shadeRef = React.useRef<HTMLDivElement>(null);
  const rdName = React.useRef<HTMLSpanElement>(null);
  const rdCount = React.useRef<HTMLSpanElement>(null);

  // The phone/tablet book's leaves, in reading order: Spotmies, Reaidy, then each half of every timeline spread.
  const pages = () =>
    Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>(":scope > article:not(.vb-spread), :scope > .vb-spread > .vb-half") ?? [],
    );
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Phones/tablets book: where each page's stretch of scrolling starts (px from the book's pin point), how far
  // that page scrolls inside the book before it turns. Measured in the effect.
  const mSegs = React.useRef<{ start: number; read: number }[]>([]);
  const goTo = (i: number) => {
    const el = ref.current;
    const seg = mSegs.current[i];
    if (!el || !seg) return;
    const y = el.getBoundingClientRect().top + window.scrollY + seg.start + (i > 0 ? 2 : 0);
    window.scrollTo({ top: y, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  // Desktop: scroll to where spread n is fully shown (n = 0 is the opening spread).
  const goToSpread = (n: number) => {
    const el = ref.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - pinTop.current + (n + OPEN) * window.innerHeight;
    window.scrollTo({ top: y, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  // With focus inside the book: ←/→ or PageUp/PageDown move one page. Past either end, the key does what it
  // normally does (PageDown scrolls on to the next section).
  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "PageDown" ? 1 : e.key === "ArrowLeft" || e.key === "PageUp" ? -1 : 0;
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      if (reduceMotion()) return; // pages are stacked: normal scrolling
      const n = slideRef.current + dir;
      if (n < 0 || n >= SLIDES.length) return;
      e.preventDefault();
      goTo(n);
      return;
    }
    if (reduceMotion()) return; // spreads are stacked: normal scrolling
    const n = spread + dir;
    if (n < 0 || n > TURNS) return;
    e.preventDefault();
    goToSpread(n);
  };

  // Before paint: set --p (and the leaves) from the current scroll position (also right after a refresh).
  React.useLayoutEffect(() => {
    const el = ref.current;
    const stick = stickRef.current;
    const book = bookRef.current;
    const cover = coverRef.current;
    if (!el || !stick || !book || !cover) return;
    if (reduceMotion()) {
      cover.dataset.done = "";
      return;
    }
    const lg = window.matchMedia("(min-width: 1024px)");
    const face = (id: string) => el.querySelector<HTMLElement>(`[data-face="${id}"]`);
    const L = Array.from({ length: TURNS + 1 }, (_, i) => face("L" + i));
    const Rt = Array.from({ length: TURNS + 1 }, (_, i) => face("R" + i));
    let raf = 0;
    let curP = -1; // shown values (desktop): opening (0..1) and timeline position (0..TURNS)
    let curT = 0;
    let lastT = 0;
    let shownKey = "";
    let shownSpread = 0;
    let mbook = false;
    const grid = gridRef.current;
    const shade = shadeRef.current;

    // ---- Phones/tablets (< 1024px) ----
    // The pages are found once. Everything the scroll changes is written straight onto the element that uses it,
    // and only when it changed, at most once per frame.
    const P = pages();
    const N = P.length;
    let segs: { start: number; read: number }[] = [];
    let turn = 400;
    let openLen = 300; // phones: scrolling over which the cover opens, once the book is pinned
    let mTotal = 0;
    let fit = P.map(() => 1);
    let shownTf = P.map(() => "");
    let shownOn = P.map((): boolean | null => null);
    let shownShade = "";
    let shownShadeZ = "";
    let shownCoverP = "";
    let shownSlide = -1;
    let mframe = 0;
    let lastW = -1;
    let ready = false; // phones: painted once (data-mready)
    // Desktop: how many px the scaled-down book gives back (see measure), and the nav's bottom edge plus a gap.
    let bookShrink = 0;
    const NAV_CLEAR = 88;

    const clearMobile = () => {
      el.style.removeProperty("--mspace");
      cover.style.removeProperty("--p");
      P.forEach((pg) => {
        pg.style.removeProperty("--fit");
        pg.style.transform = "";
        pg.style.visibility = "";
        pg.style.willChange = "";
        pg.style.zIndex = "";
      });
      shownTf = P.map(() => "");
      shownOn = P.map(() => null);
      shownShade = shownShadeZ = shownCoverP = "";
    };

    // Switch the phone/tablet book on or off (below 1024px; reduced motion was handled above).
    const setMode = () => {
      const on = !lg.matches;
      if (on === mbook) return;
      mbook = on;
      shownKey = "";
      el.querySelectorAll<HTMLElement>("[data-off]").forEach((f) => delete f.dataset.off);
      if (on) {
        el.dataset.mbook = "";
        book.style.removeProperty("--bs"); // the desktop fit-to-screen scale
        book.style.marginBottom = "";
        bookShrink = 0;
      } else {
        delete el.dataset.mbook;
        cancelAnimationFrame(mframe);
        mframe = 0;
        clearMobile();
        curP = -1;
      }
    };

    // Desktop: pin just under the nav if the book fits; if it is taller than the screen, pin it with its bottom
    // 16px above the bottom of the screen instead (the turning pages' text is centred, so it stays visible).
    // Phones/tablets: the book fills the screen under the nav; each page is scaled to fit the page area (--fit:
    // measured at full width, then laid out 1/fit wider, which can only make it shorter, so it always fits) and
    // gets one turn's stretch of scrolling (~0.42 of a screen; the last page doesn't turn). `read` (a page
    // scrolling up inside the book before it turns) is only used where a page still doesn't fit at 0.8.
    const measure = () => {
      setMode();
      if (mbook && grid) {
        pinTop.current = 0;
        stick.style.top = "";
        const area = grid.clientHeight;
        turn = Math.round(stick.clientHeight * 0.42);
        openLen = Math.round(stick.clientHeight * 0.5);
        P.forEach((pg) => {
          pg.style.setProperty("--fit", "1");
          pg.style.minHeight = "0";
        });
        // Photos and graphs grow with the width, so a wider layout can be taller: re-measure until it fits.
        // Never below 0.8 (smaller text gets hard to read).
        fit = P.map(() => 1);
        for (let pass = 0; pass < 4; pass++) {
          let changed = false;
          P.forEach((pg, i) => {
            const f = Math.max(0.8, Math.min(fit[i], (area - 1) / pg.offsetHeight));
            if (f < fit[i] - 0.001) {
              fit[i] = f;
              changed = true;
            }
          });
          if (!changed) break;
          P.forEach((pg, i) => pg.style.setProperty("--fit", fit[i].toFixed(4)));
        }
        let acc = openLen; // the cover opens first
        segs = P.map((pg, i) => {
          const seg = { start: acc, read: Math.max(0, Math.round(pg.offsetHeight * fit[i] - area)) };
          acc += seg.read + (i < N - 1 ? turn : 0);
          return seg;
        });
        P.forEach((pg, i) => {
          pg.style.minHeight = "";
          pg.style.zIndex = String(2 * (N - i));
        });
        mSegs.current = segs;
        mTotal = acc;
        el.style.setProperty("--mspace", mTotal + "px");
        shownTf = P.map(() => ""); // repaint every visible page with the new fit
        return;
      }
      // Desktop: a book taller than the space under the nav (short screens, or the browser zoomed in) is scaled
      // down evenly to fit, instead of pinning by its bottom edge with its top under the nav (founder,
      // 2026-11-06). A transform doesn't change the layout box, so a negative bottom margin takes back the
      // space it frees and the readout row stays right under the book. Never below 0.5.
      const nat = book.offsetHeight; // unscaled (transforms don't change offsetHeight)
      const rest = stick.offsetHeight - nat + bookShrink; // the readout row and gaps under the book
      const f = Math.max(0.5, Math.min(1, (window.innerHeight - NAV_CLEAR - 16 - rest) / nat));
      bookShrink = Math.round(nat * (1 - f));
      book.style.setProperty("--bs", f.toFixed(4));
      book.style.marginBottom = bookShrink ? -bookShrink + "px" : "";
      const shown = nat - bookShrink + rest;
      pinTop.current = Math.round(Math.min(f < 1 ? NAV_CLEAR : 72, window.innerHeight - shown - 16));
      stick.style.top = pinTop.current + "px";
    };

    // Phones/tablets, one frame: the cover opens as the book arrives (quicker than on desktop, so it is fully
    // open before the book pins), then the visible page scrolls up by y and the leaf turns with r (0 → 1); the
    // page beneath gets the leaf's shadow. Only the current page and, while it turns, the next one are visible.
    const paintMobile = () => {
      mframe = 0;
      // The cover opens only once the book is pinned (whole book on screen), over the first openLen of scrolling.
      const s = Math.min(mTotal, Math.max(0, -el.getBoundingClientRect().top));
      const p = coverT(s / openLen);
      const ps = p.toFixed(3);
      if (ps !== shownCoverP) {
        shownCoverP = ps;
        cover.style.setProperty("--p", ps);
        if (p >= 0.999) cover.dataset.done = "";
        else delete cover.dataset.done;
      }
      const y = segs.map((g) => Math.min(g.read, Math.max(0, s - g.start)));
      // The turn uses almost its whole stretch (a short rest at each end), so there's no dead scroll between pages.
      const r = segs.map((g, i) => (i < N - 1 ? ease(clamp01(((s - g.start - g.read) / turn - 0.06) / 0.88)) : 0));
      let cur = r.findIndex((v) => v < 1);
      if (cur < 0) cur = N - 1;
      for (let i = 0; i < N; i++) {
        const pg = P[i];
        const on = i === cur || (i === cur + 1 && r[cur] > 0);
        if (on !== shownOn[i]) {
          shownOn[i] = on;
          pg.style.visibility = on ? "" : "hidden";
          pg.style.willChange = on ? "transform" : "auto"; // only the two visible pages get their own layer
        }
        if (!on) continue;
        const tf = `translate3d(0,${(-y[i]).toFixed(1)}px,0) rotateY(${(-r[i] * 180).toFixed(2)}deg) scale(${fit[i].toFixed(4)})`;
        if (tf !== shownTf[i]) {
          shownTf[i] = tf;
          pg.style.transform = tf;
        }
      }
      if (shade) {
        const o = cur + 1 < N ? Math.sin(Math.PI * r[cur]).toFixed(3) : "0";
        if (o !== shownShade) {
          shownShade = o;
          shade.style.opacity = o;
        }
        const z = String(2 * (N - cur - 1) + 1); // just above the page beneath, under the turning leaf
        if (z !== shownShadeZ) {
          shownShadeZ = z;
          shade.style.zIndex = z;
        }
      }
      const shown = Math.max(0, r.findIndex((v) => v < 0.5));
      if (shown !== shownSlide) {
        shownSlide = shown;
        slideRef.current = shown;
        if (rdName.current) rdName.current.textContent = SLIDES[shown];
        if (rdCount.current) rdCount.current.textContent = String(shown + 1);
      }
      // First paint done: each page's visibility is now set here, so the CSS "page 1 only" stand-in can go.
      if (!ready) {
        ready = true;
        el.dataset.mready = "";
      }
    };

    // ---- Desktop (>= 1024px) ----
    // The book arrives closed and pins; the first OPEN screens of pinned scrolling open the cover, then each
    // screen of scrolling turns one leaf.
    const target = (): [number, number] => {
      const vh = window.innerHeight;
      const o = (pinTop.current - el.getBoundingClientRect().top) / vh;
      return [coverT(o), Math.min(TURNS, Math.max(0, o - OPEN))];
    };
    const paint = (v: number, t: number) => {
      el.style.setProperty("--p", v.toFixed(4));
      el.style.setProperty("--s", Math.sin(Math.PI * v).toFixed(4));
      if (v >= 0.999) cover.dataset.done = "";
      else delete cover.dataset.done;
      if (v < 0.2) el.dataset.shut = "";
      else delete el.dataset.shut;
      let turned = 0;
      let past = 0;
      for (let k = 1; k <= TURNS; k++) {
        const tk = leafT(t, k);
        el.style.setProperty("--t" + k, tk.toFixed(4));
        el.style.setProperty("--s" + k, Math.sin(Math.PI * tk).toFixed(4));
        if (tk >= 0.999) turned = k;
        if (tk > 0.5) past = k;
      }
      // Only the top spread and, while a leaf turns, the spread under it are visible.
      const turning = turned < TURNS && leafT(t, turned + 1) > 0;
      const key = turned + (turning ? "+" : "");
      if (key !== shownKey) {
        shownKey = key;
        const on = new Set([turned, turning ? turned + 1 : turned]);
        [L, Rt].forEach((side) =>
          side.forEach((f, i) => {
            if (!f) return;
            if (on.has(i)) delete f.dataset.off;
            else f.dataset.off = "";
          }),
        );
      }
      if (past !== shownSpread) {
        shownSpread = past;
        setSpread(past);
      }
    };
    // The pages ease towards the scroll position (≈ lerp 0.11 per frame), so they move with weight
    // instead of snapping, without lagging far behind.
    const tick = (now: number) => {
      const dt = lastT ? Math.min(64, now - lastT) : 16.7;
      lastT = now;
      const [gp, gt] = target();
      const k = 1 - Math.exp(-dt / 140);
      curP += (gp - curP) * k;
      curT += (gt - curT) * k;
      if (Math.abs(gp - curP) < 0.0008) curP = gp;
      if (Math.abs(gt - curT) < 0.002) curT = gt;
      paint(curP, curT);
      if (curP !== gp || curT !== gt) raf = requestAnimationFrame(tick);
      else {
        raf = 0;
        lastT = 0;
      }
    };
    const update = () => {
      if (mbook) {
        // Phones/tablets: the book follows the finger exactly (no easing), painted once per frame.
        if (!mframe) mframe = requestAnimationFrame(paintMobile);
        return;
      }
      if (curP < 0) {
        [curP, curT] = target(); // first paint / refresh: jump straight to the right state
        paint(curP, curT);
        return;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    measure();
    if (mbook) paintMobile(); // before the first paint (also right after a refresh)
    lastW = window.innerWidth;
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(stick);
    P.forEach((pg) => ro.observe(pg)); // page heights change with fonts/images (phone book segments)
    const onScroll = update;
    const onResize = () => {
      // Phones: the address bar showing/hiding while scrolling fires resize with only the height changed.
      // The book is sized in svh, so there is nothing to re-measure (re-measuring here made the pages jump).
      if (mbook && !lg.matches && window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      measure();
      update();
    };
    // Only listen while the book is near the viewport.
    let listening = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !listening) {
          listening = true;
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onResize, { passive: true });
        } else if (!e.isIntersecting && listening) {
          listening = false;
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
        }
        onScroll();
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    io.observe(el);
    update();
    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mframe);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <PreviewCtx.Provider value={openPreview}>
    <div ref={ref} className="vb" style={{ "--turns": TURNS } as React.CSSProperties}>
      <style>{CSS_ALL}</style>
      {/* Without JS nothing would turn the pages, so stack the spreads instead of pinning an unmoving book. */}
      <noscript dangerouslySetInnerHTML={{ __html: `<style>@media (min-width:1024px){${STACKED}}</style>` }} />
      <div
        ref={stickRef}
        className="vb-stick rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-accent"
        role="region"
        aria-label="Ventures and timeline book. Use the arrow keys to turn the pages."
        tabIndex={0}
        onKeyDown={onKey}
      >
      {/* Beside the closed book (desktop): what's inside, and the headline figures. They fade out as it opens. */}
      <nav aria-label="Inside the book" className="vb-side vb-side-l">
        <p className={sideLabel}>Inside this book</p>
        <ol className="flex flex-col gap-3.5">
          {[{ years: S.meta?.match(/(?:19|20)\d{2}/)?.[0] ?? "", title: S.name }, ...TL.map((sp) => ({ years: sp.years ?? "", title: sp.title }))].map((it, n) => (
            <li key={it.title + n}>
              <button
                type="button"
                onClick={() => goToSpread(n)}
                className="group/toc flex w-full items-baseline gap-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <span className="font-mono text-[11px] tracking-[0.12em] text-accent tabular-nums">{pad2(2 * n + 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[19px] leading-tight transition-colors group-hover/toc:text-accent">{it.title}</span>
                  <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.12em] text-muted">{it.years}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <aside aria-label="At a glance" className="vb-side vb-side-r items-end text-right">
        <p className={sideLabel}>At a glance</p>
        <dl className="flex flex-col gap-4">
          {[SPOT_NUMBERS[1]!, SPOT_NUMBERS[3]!, { ...R.metrics.items[0]!, label: `Reaidy.io ${R.metrics.items[0]!.label}` }, { ...R.metrics.items[2]!, label: `${R.metrics.items[2]!.label} on Reaidy.io` }].map((x) => (
            <div key={x.label} className="flex flex-col items-end">
              <dt className="order-last mt-1 max-w-[16ch] text-[12.5px] leading-snug text-muted">{x.label}</dt>
              <dd className="font-serif text-[34px] leading-none tracking-[-0.01em]">{x.value}</dd>
            </div>
          ))}
        </dl>
        <p className={sideLabel + " inline-flex items-center gap-2"}>
          Scroll to open <span aria-hidden="true" className="vb-nudge inline-block text-accent">↓</span>
        </p>
      </aside>
      <div ref={bookRef} className="vb-book">
        <div aria-hidden="true" className="vb-shadow" />
        <div aria-hidden="true" className="vb-shadow-l" />
        <div aria-hidden="true" className="vb-board" />
        <div aria-hidden="true" className="vb-board-l" />
        <div ref={gridRef} className="vb-grid relative grid lg:grid-cols-2">
          {/* Opening spread: Spotmies over both pages (founder, 2026-11-07; the Reaidy overview moved to its own spread). */}
          {/* Page 1: who and what, with the founder's team photos */}
          <article id={S.id} data-face="L0" className={"vb-left rounded-2xl lg:rounded-r-none " + pageCls}>
            <span aria-hidden="true" className="vb-head left-6 sm:left-10"><span className="text-accent">01</span> · {S.name}</span>
            <span aria-hidden="true" className="vb-folio left-6 sm:left-10">1</span>
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <LogoPlate logo={S.logo} h={28} />
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-[30px] leading-tight sm:text-[34px]">
                    <NameLink name={S.name} href={S.href} />
                  </h3>
                  {S.meta && <p className={label}>{S.meta}</p>}
                </div>
              </div>
              {S.photo && (
                <div className="w-[40%] max-w-[220px] shrink-0 pt-1">
                  <PagePhoto image={S.photo} wide={S.photo.wide} tilt={2} small />
                </div>
              )}
            </div>
            <p className={body}>{S.summary}</p>
            <Chips title={S.chipsLabel} items={S.chips} />
            <div>
              <p className={label}>My part</p>
              <p className={body + " mt-1"}>{S.owned}</p>
            </div>
            {/* full page width, at the foot of the page (founder, 2026-11-07: the page had empty space) */}
            <div className="mt-1 px-1 lg:mt-auto">
              <PagePhoto image={S.wallPhoto} wide full tilt={-1} />
            </div>
          </article>

          {/* Page 2: the numbers (Achievements figures, then the company figures from spotmies.com) */}
          <article data-face="R0" className={"vb-right rounded-2xl lg:rounded-l-none " + pageCls}>
            <span aria-hidden="true" className="vb-head right-6 sm:right-10"><span className="text-accent">02</span> · {S.name}</span>
            <span aria-hidden="true" className="vb-folio right-6 sm:right-10">2</span>
            <NumberRow title="By the numbers" items={SPOT_NUMBERS} />
            <Graphs m={S.metrics} kind="spotmies" />
            {S.support && <p className={body + " text-muted"}>{S.support}</p>}
            {S.metrics.growth && <GrowthLine g={S.metrics.growth} />}
            <p className={label}>
              {S.metrics.scope}
              {S.metrics.asOf && <> · as of {S.metrics.asOf}</>}
            </p>
            {/* full page width (founder, 2026-11-07: the page had empty space) */}
            <div className="mt-1 px-1">
              <PagePhoto image={S.officePhoto} wide full tilt={1} />
            </div>
          </article>

          {/* Timeline spreads, newest first (addendum-02 §1; phase 2 content 2026-11-05). Both pages carry content:
              one entry runs over the spread (story left, work right); two entries get a page each. Spread n's left page
              is the back of leaf n; its right page is the front of leaf n + 1 (the last one doesn't turn). */}
          {TL.map((sp, i) => {
            const n = i + 1;
            const last = n === TURNS;
            const leftNo = 2 * n + 1;
            return (
              <article key={sp.title} id={isReaidy(sp) ? R.id : undefined} className="vb-spread scroll-mt-24" aria-labelledby={`vb-tl-${n}`}>
                <div
                  data-face={"L" + n}
                  className={"vb-half vb-hl vb-paper vb-pl " + halfCls}
                  style={{ "--t": `var(--t${n})`, "--sh": last ? "0" : `var(--s${n + 1})`, "--z": `${(1 + 0.15 * n).toFixed(2)}px` } as React.CSSProperties}
                >
                  <span aria-hidden="true" className="vb-head left-6 sm:left-10"><span className="text-accent">{pad2(leftNo)}</span></span>
                  <span aria-hidden="true" className="vb-folio left-6 sm:left-10">{leftNo}</span>
                  {sp.entries.length === 2 ? (
                    <EntryPage pg={sp.entries[0]} id={`vb-tl-${n}`} tilt={-1.2} />
                  ) : (
                    <SoloLeft
                      pg={sp.entries[0]}
                      id={`vb-tl-${n}`}
                      // Reaidy's figures (from the old overview page). Its "The product" chips are left out: they repeat
                      // the line above, and with them the page didn't fit.
                      extra={isReaidy(sp) ? (
                        <>
                          <Chips title={R.chipsLabel} items={R.chips} />
                          <NumberRow items={R.metrics.items} note={R.metrics.scope} small />
                        </>
                      ) : null}
                    />
                  )}
                </div>
                <div
                  data-face={"R" + n}
                  className={"vb-half vb-hr vb-paper vb-pr " + halfCls}
                  style={{ "--t": last ? "0" : `var(--t${n + 1})`, "--sh": `var(--s${n})`, "--z": `${(0.8 - 0.15 * n).toFixed(2)}px` } as React.CSSProperties}
                >
                  <span aria-hidden="true" className="vb-head right-6 sm:right-10"><span className="text-accent">{pad2(leftNo + 1)}</span></span>
                  <span aria-hidden="true" className="vb-folio right-6 sm:right-10">{leftNo + 1}</span>
                  {sp.entries.length === 2 ? (
                    <EntryPage pg={sp.entries[1]} tilt={1.2} />
                  ) : (
                    <SoloRight
                      pg={sp.entries[0]}
                      intro={isReaidy(sp) ? <p className={body + " max-w-[50ch]"}>{R.summary}</p> : null}
                      extra={isReaidy(sp) ? (
                        <blockquote className="self-start border-l border-foreground/30 pl-5 font-serif text-xl leading-snug">&ldquo;{R.lesson}&rdquo;</blockquote>
                      ) : null}
                    />
                  )}
                </div>
              </article>
            );
          })}

          {/* Phones/tablets: the turning leaf's shadow on the page beneath (opacity and z-index from JS) */}
          <div ref={shadeRef} aria-hidden="true" className="vb-mshade" />

          {/* Spine shadow down the middle of the open spread */}
          <div
            aria-hidden="true"
            className="vb-spine pointer-events-none absolute inset-y-0 left-1/2 hidden w-16 -translate-x-1/2 bg-linear-to-r from-transparent via-black/15 to-transparent lg:block"
          />
          <div aria-hidden="true" className="vb-crease pointer-events-none absolute inset-y-0 left-1/2 hidden w-3 -translate-x-1/2 lg:block" />
        </div>

        {/* Cover: its angle follows scroll */}
        <div ref={coverRef} className="vb-cover" aria-hidden="true">
          <div className="vb-sheen" />
          {/* Cover in the site's own UI language: mono accent label, serif title, the two logos, hairline footer */}
          <div className="relative flex h-full flex-col justify-between p-8 pl-12 sm:p-12 sm:pl-16">
            <span className="font-mono text-xs tracking-[0.2em] text-[#818cf8] uppercase">{coverKicker}</span>
            <div>
              {/* founder, 2026-11-07: the cover names OpenPlan AI, with its mark (the section heading stays "Before OpenPlan.") */}
              <OpenPlanLogo className="mb-6 size-12 text-[#fafaf9] sm:size-14" />
              <p className="font-serif text-4xl leading-[1.05] sm:text-6xl">Before OpenPlan AI.</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
                <CoverLogo logo={S.logo} h={34} />
                <CoverLogo logo={R.logo} h={22} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] tracking-[0.2em] text-stone-400 uppercase">
              <span>01 · {S.name}</span>
              <span>03 · {R.name}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Phones/tablets book: the page you're on, and a way past the book (shown only while it is a book). */}
      <div className="vb-mrow mt-3 hidden h-12 items-center justify-between gap-3 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
        <span aria-hidden="true" className="min-w-0 truncate">
          {/* count first, so a long name is what gets cut on a narrow phone */}
          <span className="text-accent"><span ref={rdCount}>1</span> / {SLIDES.length}</span> · <span ref={rdName}>{SLIDES[0]}</span>
        </span>
        <a href="#experience" className="inline-flex min-h-11 shrink-0 items-center underline-offset-4 transition hover:text-foreground hover:underline">
          {timeline.skipLabel}
        </a>
      </div>
      {/* Desktop: where you are in the book, and a way past it. Under the book, because a book taller than
          the screen pins by its bottom edge. */}
      <div className="mt-5 hidden items-center justify-between gap-4 font-mono text-xs tracking-[0.16em] text-muted uppercase lg:flex">
        <span className="vb-tl-ind" aria-hidden="true">
          {SPREADS[spread]} <span className="text-accent">· {spread + 1} / {SPREADS.length}</span>
        </span>
        <a href="#experience" className="ml-auto inline-flex min-h-11 items-center underline-offset-4 transition hover:text-foreground hover:underline">
          {timeline.skipLabel}
        </a>
      </div>
      </div>
      {/* Scroll room for the page turns while the book is pinned (desktop only) */}
      <div aria-hidden="true" className="vb-pinspace" />
    </div>
    <PhotoPreview preview={preview} onClose={closePreview} />
    </PreviewCtx.Provider>
  );
}

// Company name as an external link with a visible ↗ (opens in a new tab).
function NameLink({ name, href }: { name: string; href: string | null }) {
  if (!href) return <>{name}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition hover:underline">
      {name}
      <ArrowUpRight size={18} className="ml-1 align-super text-muted" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
