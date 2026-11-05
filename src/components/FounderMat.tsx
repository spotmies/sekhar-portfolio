"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import OpenPlanLogo from "@/components/OpenPlanLogo";
import { cn } from "@/lib/utils";
import type { StoryChapter, StoryMatText } from "@/data/portfolio";

export type FounderMatProps = { chapters: StoryChapter[]; text: StoryMatText };

type Visual = "round" | "id" | "pill" | "now";

// Which die-cut sticker each chapter gets (presentation only; all text comes from the chapter data).
const VISUAL: Record<string, Visual> = { tinkerer: "round", spotmies: "id", reaidy: "pill", openplan: "now" };

// Where each sticker starts on the mat (desktop only), as % of the badge area, plus its size and tilt.
// Laid out so the cut line runs 01 → 02 → 03 → 04 without crossing a sticker.
const LAYOUT: Record<Visual, { x: number; y: number; w: number; h: number; rot: number }> = {
  round: { x: 4, y: 5, w: 150, h: 150, rot: -8 },
  id: { x: 38, y: 2, w: 170, h: 232, rot: 6 },
  pill: { x: 5, y: 63, w: 224, h: 128, rot: -5 },
  now: { x: 62, y: 46, w: 180, h: 244, rot: -4 },
};

const DRAG_THRESHOLD = 5;
const DRAG_QUERY = "(min-width: 1024px) and (pointer: fine)";

const visualOf = (c: StoryChapter) => VISUAL[c.id] ?? "round";
// "Spotmies LLP · 2019" → { name: "Spotmies LLP", year: "2019" }
const splitBadge = (badge: string) => {
  const [name, year] = badge.split(" · ");
  return { name, year };
};
const pad = (n: number) => String(n).padStart(2, "0");

export default function FounderMat({ chapters, text }: FounderMatProps) {
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(() => chapters.map((c) => ({ x: LAYOUT[visualOf(c)].x, y: LAYOUT[visualOf(c)].y })));
  const [order, setOrder] = useState(() => chapters.map((_, i) => i));
  const [dragging, setDragging] = useState<number | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  // This component only ever renders on the client (it is imported on demand), so matchMedia is safe here.
  const [canDrag, setCanDrag] = useState(() => window.matchMedia(DRAG_QUERY).matches);
  const areaRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ i: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // Track the badge area's size (for the cut line) and whether we're on a desktop layout (for dragging).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const mq = window.matchMedia(DRAG_QUERY);
    const update = () => {
      setArea({ w: el.clientWidth, h: el.clientHeight });
      setCanDrag(mq.matches);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    mq.addEventListener("change", update);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  const bringToFront = (i: number) => setOrder((o) => [...o.filter((n) => n !== i), i]);

  const select = (i: number, { focus = false } = {}) => {
    setActive(i);
    bringToFront(i);
    const btn = badgeRefs.current[i];
    const row = areaRef.current;
    if (!btn || !row) return;
    if (focus) btn.focus({ preventScroll: true });
    // In the snap-scroll row (no drag), keep the selected sticker in view without scrolling the page.
    if (!canDrag && row.scrollWidth > row.clientWidth) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      row.scrollTo({ left: btn.offsetLeft - (row.clientWidth - btn.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    }
  };

  const step = (delta: number, opts?: { focus?: boolean }) =>
    select((active + delta + chapters.length) % chapters.length, opts);

  // ← / → anywhere inside the mat change chapter. Focus follows only when it was on a sticker.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const onBadge = badgeRefs.current.includes(document.activeElement as HTMLButtonElement);
    step(e.key === "ArrowRight" ? 1 : -1, { focus: onBadge });
  };

  const onPointerDown = (i: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!canDrag || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { i, sx: e.clientX, sy: e.clientY, ox: pos[i].x, oy: pos[i].y, moved: false };
    bringToFront(i);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || !area.w) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(d.i);
    }
    const { w, h } = LAYOUT[visualOf(chapters[d.i])];
    const maxX = 100 - (w / area.w) * 100;
    const maxY = 100 - (h / area.h) * 100;
    const x = Math.min(Math.max(d.ox + (dx / area.w) * 100, 0), maxX);
    const y = Math.min(Math.max(d.oy + (dy / area.h) * 100, 0), maxY);
    setPos((p) => p.map((v, n) => (n === d.i ? { x, y } : v)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (d && !d.moved) select(d.i);
  };

  // A dashed "cut line" joining the stickers in story order (desktop only).
  const centers = chapters.map((c, i) => {
    const { w, h } = LAYOUT[visualOf(c)];
    return { x: (pos[i].x / 100) * area.w + w / 2, y: (pos[i].y / 100) * area.h + h / 2 };
  });
  const cutPath = centers.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = centers[i - 1];
    const mx = (prev.x + p.x) / 2;
    return `${acc} C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const chapter = chapters[active];
  const navBtn =
    "inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 font-mono text-xs text-stone-700 transition hover:border-indigo-500 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

  return (
    <div
      role="group"
      aria-label={text.groupLabel}
      onKeyDown={onKeyDown}
      className="cutting-mat relative overflow-hidden rounded-[28px] p-4 pt-10 pl-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)] sm:p-8 sm:pt-14 sm:pb-14 sm:pl-14"
    >
      <MatMarkings print={text.print} />

      {/* Label-maker tape */}
      <div className="relative z-10 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-6">
        <span className="dymo -rotate-1">{text.tape}</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-white">
          {canDrag ? text.hintPointer : text.hintTouch}
        </span>
        <span className="hidden font-mono text-[11px] uppercase tracking-widest text-white lg:inline">· {text.hintKeys}</span>
      </div>

      <div className="relative z-10 grid gap-3 sm:gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-6">
        {/* Sticker area: free-form and draggable on desktop, a snap-scroll row everywhere else */}
        <div
          ref={areaRef}
          className="story-row relative -mx-4 flex max-md:[&_.badge]:[zoom:0.6] snap-x snap-mandatory items-center gap-5 overflow-x-auto px-6 pt-3 pb-4 scrollbar-none sm:gap-8 sm:pt-4 sm:pb-6 sm:-mx-8 sm:px-10 lg:mx-0 lg:block lg:h-140 lg:overflow-visible lg:p-0"
        >
          {canDrag && area.w > 0 && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <path d={cutPath} className="cut-line" fill="none" />
            </svg>
          )}

          {chapters.map((c, i) => {
            const l = LAYOUT[visualOf(c)];
            const isActive = i === active;
            const isDragging = i === dragging;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  badgeRefs.current[i] = el;
                }}
                type="button"
                onPointerDown={onPointerDown(i)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={(e) => {
                  // Pointer handlers already select on desktop; keyboard and touch land here.
                  if (!canDrag || e.detail === 0) select(i);
                }}
                aria-pressed={isActive}
                aria-label={`${pad(i + 1)} ${text.chapter} ${i + 1}: ${c.kicker}, ${[splitBadge(c.badge).name, splitBadge(c.badge).year].filter(Boolean).join(" ")}`}
                style={
                  {
                    "--x": `${pos[i].x}%`,
                    "--y": `${pos[i].y}%`,
                    "--rot": `${isDragging ? 0 : l.rot}deg`,
                    "--lift": isDragging ? 1.08 : isActive ? 1.04 : undefined,
                    zIndex: order.indexOf(i) + 1,
                    touchAction: canDrag ? "none" : undefined,
                  } as CSSProperties
                }
                className={cn(
                  "badge group relative shrink-0 snap-center select-none outline-none lg:absolute lg:top-(--y) lg:left-(--x)",
                  canDrag && (isDragging ? "cursor-grabbing" : "cursor-grab"),
                  isActive && "is-active",
                  isDragging && "is-dragging",
                )}
              >
                <span className="badge-num">{pad(i + 1)}</span>
                <Sticker chapter={c} />
              </button>
            );
          })}
        </div>

        {/* Reading card */}
        <article className="note-card relative self-start max-md:px-[18px]! max-md:pt-[22px]! max-md:pb-4! lg:mt-6 lg:rotate-[1.5deg]">
          <span className="tape" aria-hidden />
          <div aria-live="polite">
            <div key={chapter.id} className="note-enter">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-stone-600">
                <span>{chapter.act}</span>
                <span>
                  {text.chapter} {pad(active + 1)} / {pad(chapters.length)}
                </span>
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-700 sm:mt-5">{chapter.kicker}</p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-balance text-stone-900 sm:mt-2 sm:text-3xl">
                {chapter.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-stone-700 sm:mt-4 sm:text-base">{chapter.body}</p>

              {typeof chapter.learned === "string" ? (
                <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-amber-50/60 p-3 sm:mt-5 sm:p-4">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-stone-600">{text.learned}</p>
                  <p className="mt-1 text-[15px] font-medium text-stone-800 sm:text-base">{chapter.learned}</p>
                </div>
              ) : (
                <a
                  href={chapter.learned.href}
                  className="mt-5 inline-flex min-h-11 items-center rounded-full bg-indigo-600 px-5 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {chapter.learned.label}
                </a>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3 sm:mt-6 sm:pt-4">
            <button type="button" onClick={() => step(-1)} className={navBtn}>
              {text.prev}
            </button>
            <div className="flex gap-1.5" aria-hidden>
              {chapters.map((c, i) => (
                <span
                  key={c.id}
                  className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-indigo-500" : "w-1.5 bg-stone-300")}
                />
              ))}
            </div>
            <button type="button" onClick={() => step(1)} className={navBtn}>
              {text.next}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

/* ---------- Stickers: each chapter is a different die-cut sticker ---------- */

function Sticker({ chapter }: { chapter: StoryChapter }) {
  const { name, year } = splitBadge(chapter.badge);
  switch (visualOf(chapter)) {
    case "round":
      return (
        <span className="sticker flex h-37.5 w-37.5 flex-col items-center justify-center rounded-full bg-amber-400 text-stone-900">
          <ChipIcon className="h-10 w-10" />
          <span className="mt-2 text-lg font-bold tracking-tight">{name}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]">{chapter.act.split(" · ")[1]}</span>
        </span>
      );
    case "id":
      return (
        <span className="sticker flex h-58 w-42.5 flex-col overflow-hidden rounded-2xl bg-white text-left text-stone-900">
          {/* Founder request: the Spotmies logo replaces the name. Its lettering is white, so the band is dark. */}
          <span className="relative flex h-24 flex-col items-center bg-stone-950 pt-3">
            <span className="h-2 w-10 rounded-full bg-stone-700" />
            <BadgeLogo src="/brand/spotmies-logo.webp" width={518} height={112} h={28} alt={name} className="mt-auto mb-4" />
          </span>
          <span className="flex flex-1 flex-col p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-600">{chapter.kicker}</span>
            <span className="mt-auto flex items-end justify-between">
              <span className="font-mono text-[10px] text-stone-600">{year}</span>
              <Barcode />
            </span>
          </span>
        </span>
      );
    case "pill":
      return (
        <span className="sticker flex h-32 w-56 flex-col justify-between rounded-[28px] bg-[#ff6b4a] p-4 text-left text-white">
          {/* Founder request: the Reaidy logo replaces the name, on a small dark plate (its "AI" is the same orange as the badge). */}
          <span className="self-start rounded-md bg-stone-950 px-2.5 py-2">
            <BadgeLogo src="/brand/reaidy-logo.webp" width={428} height={64} h={16} alt={name} />
          </span>
          <Waveform />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]">{chapter.kicker}</span>
        </span>
      );
    case "now":
      return (
        <span className="sticker flex h-61 w-45 flex-col rounded-2xl bg-stone-950 p-4 text-left text-white">
          <span className="mx-auto h-2 w-10 rounded-full bg-stone-700" />
          <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            {chapter.kicker}
          </span>
          <OpenPlanLogo className="mt-auto h-12 w-12 text-white" />
          <span className="mt-3 text-xl font-bold tracking-tight">{name}</span>
          {year && <span className="font-mono text-[10px] text-stone-400">{year}</span>}
        </span>
      );
  }
}

// Company logo on a badge: fixed size, not draggable on its own (the whole badge is the drag target).
function BadgeLogo(props: { src: string; width: number; height: number; h: number; alt: string; className?: string }) {
  const { src, width, height, h, alt, className } = props;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small pre-optimised WebP, fixed size
    <img
      src={src}
      width={Math.round((width / height) * h)}
      height={h}
      alt={alt}
      draggable={false}
      decoding="async"
      className={cn("pointer-events-none block select-none", className)}
      style={{ height: h, width: "auto" }}
    />
  );
}

function ChipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="10" y="10" width="20" height="20" rx="3" />
      <rect x="16" y="16" width="8" height="8" rx="1" fill="currentColor" />
      {[15, 20, 25].map((p) => (
        <g key={p}>
          <line x1={p} y1="4" x2={p} y2="10" />
          <line x1={p} y1="30" x2={p} y2="36" />
          <line x1="4" y1={p} x2="10" y2={p} />
          <line x1="30" y1={p} x2="36" y2={p} />
        </g>
      ))}
    </svg>
  );
}

function Barcode() {
  const bars = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2];
  return (
    <svg viewBox="0 0 40 22" className="h-5 w-10" aria-hidden>
      {bars.reduce<{ x: number; els: React.ReactNode[] }>(
        (acc, w, i) => {
          if (i % 2 === 0) acc.els.push(<rect key={i} x={acc.x} y="0" width={w} height="22" className="fill-stone-900" />);
          acc.x += w + 1;
          return acc;
        },
        { x: 0, els: [] },
      ).els}
    </svg>
  );
}

function Waveform() {
  const heights = [6, 14, 22, 12, 28, 18, 8, 24, 30, 16, 10, 20, 26, 12, 6, 18, 22, 10];
  return (
    <svg viewBox="0 0 190 32" className="h-7 w-full" aria-hidden>
      {heights.map((h, i) => (
        <rect key={i} x={i * 10.5} y={16 - h / 2} width="5" height={h} rx="2.5" className="wave-bar fill-white" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </svg>
  );
}

/* ---------- Mat printing: rulers, angle guides, circle template (decorative) ---------- */

function MatMarkings({ print }: { print: string }) {
  const nums = Array.from({ length: 30 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* top ruler */}
      <div className="mat-ruler-x absolute top-0 right-0 left-0 h-8 sm:left-14" />
      <div className="absolute top-1 left-4 flex sm:left-14">
        {nums.map((n) => (
          <span key={n} className="w-30 shrink-0 pl-1 font-mono text-[9px] text-white/55">
            {n}
          </span>
        ))}
      </div>
      {/* left ruler */}
      <div className="mat-ruler-y absolute top-12 bottom-0 left-0 hidden w-10 sm:top-14 sm:block" />
      <div className="absolute top-12 left-1.5 hidden flex-col sm:top-14 sm:flex">
        {nums.slice(0, 12).map((n) => (
          <span key={n} className="h-30 shrink-0 pt-1 font-mono text-[9px] text-white/55">
            {n}
          </span>
        ))}
      </div>
      {/* angle guides + circle template from the bottom-right corner */}
      <svg className="absolute right-0 bottom-0 h-105 w-105 opacity-40" viewBox="0 0 420 420">
        <g fill="none" stroke="white" strokeWidth="1">
          <line x1="420" y1="420" x2="0" y2="0" strokeDasharray="6 6" />
          <line x1="420" y1="420" x2="0" y2="177" strokeDasharray="2 6" />
          <line x1="420" y1="420" x2="177" y2="0" strokeDasharray="2 6" />
          <circle cx="420" cy="420" r="140" />
          <circle cx="420" cy="420" r="260" strokeDasharray="1 5" />
        </g>
        <text x="300" y="296" fill="white" className="font-mono text-[10px]">45°</text>
        <text x="232" y="350" fill="white" className="font-mono text-[10px]">30°</text>
        <text x="345" y="235" fill="white" className="font-mono text-[10px]">60°</text>
      </svg>
      <p className="absolute bottom-5 left-14 hidden font-mono text-[10px] tracking-[0.3em] text-white/45 uppercase sm:block">
        {print}
      </p>
    </div>
  );
}
