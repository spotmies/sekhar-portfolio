"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Calendar-style timeline, adapted from the 21st.dev `gantt-chart` look (founder, 2026-11-05): a tinted panel
 * with a title, hint and zoom switch; a sunken list column of lanes and rows beside a month grid; a hover band,
 * outline and tooltip; and two-tone bars.
 * Kept from the original: panel header, zoom switch with inner scroll, lanes, list column, grid, two-tone bars,
 * hover band + outline, tooltip, arrow-key cursor, hidden table.
 * Left out by the founder's choice: today line, dependency arrows, milestones, "% complete".
 * Two-tone here has a real meaning, never a made-up progress: the bright part runs to `brightUntil`
 * (e.g. the CTO years), the dim part is the rest of the bar. `approx` bars (known to the year only) are hatched.
 * Month view has a two-row header (years above, every month below), so January is never replaced by the year.
 * Time is in whole months (index = year * 12 + month). "Year" fits the width; "Month" widens the chart, which
 * then scrolls inside its own box, so the page never scrolls sideways.
 */

export type GanttTimelineZoom = "year" | "month";

export interface GanttTimelineTask {
  id: string;
  lane: string;
  label: string;
  start: number; // month index, inclusive
  end: number; // month index, inclusive
  brightUntil?: number; // month index, inclusive: bright up to here, dim after
  approx?: boolean; // dates known to the year only: drawn hatched
  ongoing?: boolean; // still running: a pulsing dot at the bar's end (founder, 2026-11-05)
  tooltip: { label: string; value: string }[];
}

export interface GanttTimelineProps {
  tasks: GanttTimelineTask[];
  label: string; // accessible name
  title?: string;
  hint?: string;
  touchHint?: string; // shown instead of `hint` on touch screens (no hover)
  axisStart: number; // month index of the first column (a January)
  axisEnd: number; // month index after the last column
  now?: number; // month index of "now": draws a Now line across the chart (founder, 2026-11-05)
  rowHeight?: number;
  className?: string;
}

const HEADER_YEAR = 30; // Year view: one row of year labels
const HEADER_MONTH = 46; // Month view: years above, months below
const LIST_MIN = 108; // phones: narrow enough to leave the chart ~230px at 390px; names wrap to two lines
const MONTH_PX = 30; // pixels per month in Month view
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function GanttTimeline({ tasks, label, title, hint, touchHint, axisStart, axisEnd, now, rowHeight = 34, className }: GanttTimelineProps) {
  const uid = useId().replace(/:/g, "");
  const boxRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [listWidth, setListWidth] = useState(200);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [zoom, setZoom] = useState<GanttTimelineZoom>("year");

  useEffect(() => {
    const plot = plotRef.current;
    const box = boxRef.current;
    if (!plot || !box) return;
    const measure = () => {
      if (plot.clientWidth > 0) setWidth(plot.clientWidth);
      setListWidth(box.clientWidth - plot.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // Draw in once, when the chart scrolls into view (a DOM flag, so the no-JS / reduced-motion render is final).
  useEffect(() => {
    const el = boxRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.armed = "";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Month view opens on the most recent years (the right end); Year view has nothing to scroll.
  const switchZoom = (next: GanttTimelineZoom) => {
    setZoom(next);
    requestAnimationFrame(() => {
      const plot = plotRef.current;
      if (plot) plot.scrollLeft = next === "month" ? plot.scrollWidth : 0;
    });
  };

  // Rows: a lane heading, then its tasks.
  const rows: ({ kind: "lane"; lane: string } | { kind: "task"; task: GanttTimelineTask; order: number })[] = [];
  const ordered: GanttTimelineTask[] = [];
  for (const lane of [...new Set(tasks.map((t) => t.lane))]) {
    rows.push({ kind: "lane", lane });
    for (const task of tasks.filter((t) => t.lane === lane)) {
      rows.push({ kind: "task", task, order: ordered.length });
      ordered.push(task);
    }
  }

  const HEADER = zoom === "month" ? HEADER_MONTH : HEADER_YEAR;
  const months = axisEnd - axisStart;
  const chartWidth = zoom === "month" ? Math.max(width, months * MONTH_PX) : width;
  const unit = chartWidth / months;
  const height = HEADER + rows.length * rowHeight + 6;
  const toX = (month: number) => (month - axisStart) * unit;
  const rowY = new Map<string, number>();
  rows.forEach((r, i) => r.kind === "task" && rowY.set(r.task.id, HEADER + i * rowHeight + rowHeight / 2));
  const current = active === null ? null : ordered[active];
  const showMonths = unit >= 5; // month gridlines only when they don't turn into a grey wash

  // Keep the active bar in view when stepping with the keyboard in Month view.
  useEffect(() => {
    const plot = plotRef.current;
    if (!plot || !current || zoom !== "month") return;
    const x = toX(current.start);
    if (x < plot.scrollLeft + 16 || x > plot.scrollLeft + plot.clientWidth - 48) plot.scrollLeft = Math.max(0, x - 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Touch (founder, 2026-11-05): a tap opens the bar's tooltip, tapping the same row again or anywhere outside the
  // chart closes it. Hover stays mouse-only, because a tap also fires pointerleave right after it.
  const rowAt = (clientY: number, top: number) => {
    const r = rows[Math.floor((clientY - top - HEADER) / rowHeight)];
    return r?.kind === "task" ? r.order : null;
  };
  const tapRow = (order: number | null) => setActive((a) => (order === null || a === order ? null : order));
  useEffect(() => {
    if (active === null) return;
    const close = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !boxRef.current?.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = ordered.length;
    if (["ArrowDown", "ArrowRight"].includes(e.key)) setActive((a) => (a === null ? 0 : Math.min(n - 1, a + 1)));
    else if (["ArrowUp", "ArrowLeft"].includes(e.key)) setActive((a) => (a === null ? n - 1 : Math.max(0, a - 1)));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const yearLabel = (month: number) => {
    const y = Math.floor(month / 12);
    return unit * 12 < 34 ? `’${String(y).slice(2)}` : String(y);
  };

  return (
    <div className={cn("gt-root w-full rounded-2xl border border-border p-3 sm:p-5", className)} style={{ background: "var(--gt-panel)" }}>
      {/* Header: title + hint, zoom switch */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {title && <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>}
          {hint && (
            <p className="mt-0.5 text-xs text-muted">
              {/* touch screens (no hover) get their own hint when one is given */}
              <span className={touchHint ? "[@media(hover:none)]:hidden" : undefined}>{hint}</span>
              {touchHint && <span className="hidden [@media(hover:none)]:inline">{touchHint}</span>}
            </p>
          )}
        </div>
        <div role="radiogroup" aria-label="Timeline zoom" className="inline-flex rounded-full border border-border p-0.5" style={{ background: "var(--gt-sunken)" }}>
          {(["year", "month"] as const).map((z) => (
            <button
              key={z}
              type="button"
              role="radio"
              aria-checked={zoom === z}
              onClick={() => switchZoom(z)}
              className={cn(
                "min-h-9 rounded-full px-4 text-xs font-medium capitalize transition-colors",
                zoom === z ? "bg-accent text-background" : "text-muted hover:text-foreground",
              )}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div ref={boxRef} className="gt-box flex w-full overflow-hidden rounded-xl border border-border bg-background">
          {/* List column */}
          <div aria-hidden="true" className="w-[32%] max-w-55 shrink-0 border-r border-border sm:w-[34%]" style={{ minWidth: LIST_MIN, background: "var(--gt-sunken)" }}>
            <div style={{ height: HEADER }} className="border-b border-border" />
            {rows.map((r) => (
              <div
                key={r.kind === "lane" ? `lane-${r.lane}` : r.task.id}
                style={{ height: rowHeight }}
                // a tap on a name opens that bar's details too (mouse users hover the chart)
                onPointerUp={(e) => r.kind === "task" && e.pointerType !== "mouse" && tapRow(r.order)}
                className={cn(
                  "flex items-center overflow-hidden px-3 transition-colors",
                  r.kind === "lane"
                    ? "font-mono text-[10px] font-semibold tracking-[0.14em] text-muted uppercase"
                    : cn("text-[13px]", r.order === active ? "text-foreground" : "text-(--gt-soft)"),
                )}
              >
                {/* Task names wrap to two lines on narrow screens instead of being cut ("Karkinos Healthc…") */}
                <span className={r.kind === "lane" ? "truncate" : "line-clamp-2 leading-[1.15]"}>{r.kind === "lane" ? r.lane : r.task.label}</span>
              </div>
            ))}
          </div>

          {/* Plot: scrolls sideways inside itself in Month view */}
          <div
            ref={plotRef}
            className={cn("gt-plot min-w-0 flex-1", zoom === "month" ? "overflow-x-auto" : "overflow-hidden")}
            onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
          >
            <svg
              role="img"
              aria-label={`${label}. ${ordered.length} roles; use the arrow keys to step through them.`}
              aria-describedby={`${uid}-table`}
              width={chartWidth}
              height={height}
              tabIndex={0}
              className="block outline-none"
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse") return;
                setActive(rowAt(e.clientY, e.currentTarget.getBoundingClientRect().top));
              }}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              onPointerUp={(e) => {
                if (e.pointerType === "mouse") return;
                tapRow(rowAt(e.clientY, e.currentTarget.getBoundingClientRect().top));
              }}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
            >
              <defs>
                <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="var(--gt-dim)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" strokeWidth="2.5" />
                </pattern>
              </defs>

              {/* Lane bands and the hover band */}
              {rows.map((r, i) =>
                r.kind === "lane" ? (
                  <rect key={`band-${r.lane}`} x={0} y={HEADER + i * rowHeight} width={chartWidth} height={rowHeight} fill="var(--gt-sunken)" />
                ) : (
                  r.order === active && <rect key="hover" x={0} y={HEADER + i * rowHeight} width={chartWidth} height={rowHeight} fill="var(--gt-hover)" />
                ),
              )}

              {/* Month grid, labels */}
              {Array.from({ length: months + 1 }, (_, k) => {
                const month = axisStart + k;
                const isYear = month % 12 === 0;
                if (!isYear && !showMonths) return null;
                const x = Math.round(toX(month)) + 0.5;
                const inside = k < months;
                return (
                  <g key={month}>
                    <line
                      x1={x}
                      x2={x}
                      y1={isYear ? 0 : zoom === "month" ? HEADER - 18 : HEADER}
                      y2={height}
                      stroke={isYear ? "var(--gt-line-strong)" : "var(--gt-line-soft)"}
                      strokeWidth="1"
                    />
                    {/* Narrow (year column < 34px): "'20" with normal tracking, so every year fits from 24px a year;
                        below that, every other year. The last label is drawn only if it fits. */}
                    {inside && isYear && (zoom === "month" || ((unit * 12 >= 24 || Math.floor(month / 12) % 2 === 0) && x + (unit * 12 < 34 ? 22 : 28) <= chartWidth)) && (
                      <text x={x + 4} y={19} className={cn("fill-(--foreground) font-mono text-[10px]", unit * 12 < 34 && zoom !== "month" ? "tracking-normal" : "tracking-widest")}>
                        {zoom === "month" ? Math.floor(month / 12) : yearLabel(month)}
                      </text>
                    )}
                    {inside && zoom === "month" && (
                      <text x={x + unit / 2} y={HEADER - 6} textAnchor="middle" className="fill-(--muted) font-mono text-[10px] tracking-wider">
                        {MONTHS[month % 12]}
                      </text>
                    )}
                  </g>
                );
              })}
              {zoom === "month" && <line x1={0} x2={chartWidth} y1={HEADER - 18} y2={HEADER - 18} stroke="var(--gt-line-soft)" strokeWidth="1" />}
              <line x1={0} x2={chartWidth} y1={HEADER} y2={HEADER} stroke="var(--border)" strokeWidth="1" />

              {/* Bars: bright, then dim after `brightUntil` */}
              {ordered.map((task, index) => {
                const y = rowY.get(task.id) ?? 0;
                const x = toX(task.start);
                const w = Math.max(unit, toX(task.end + 1) - x);
                const brightW = task.brightUntil === undefined ? w : Math.min(w, Math.max(0, toX(task.brightUntil + 1) - x));
                const h = Math.min(18, rowHeight - 14);
                const dim = active !== null && active !== index;
                return (
                  <g key={task.id} opacity={dim ? 0.5 : 1} className="gt-bar" style={{ "--d": `${index * 90}ms` } as React.CSSProperties}>
                    {task.approx ? (
                      <rect x={x + 0.5} y={y - h / 2 + 0.5} width={w - 1} height={h - 1} rx={5} fill={`url(#${uid}-hatch)`} stroke="var(--accent)" strokeWidth="1" />
                    ) : (
                      <>
                        <rect x={x} y={y - h / 2} width={w} height={h} rx={5} fill="var(--gt-dim)" />
                        <rect x={x} y={y - h / 2} width={brightW} height={h} rx={5} fill="var(--accent)" />
                      </>
                    )}
                    {active === index && (
                      <rect x={x - 1.5} y={y - h / 2 - 1.5} width={w + 3} height={h + 3} rx={6} fill="none" stroke="var(--foreground)" strokeWidth="1.5" />
                    )}
                    {/* Still running: a live dot at the end of the bar */}
                    {task.ongoing && (
                      <g className="gt-live" transform={`translate(${x + w} ${y})`}>
                        <circle r={9} fill="var(--accent)" className="gt-pulse" />
                        <circle r={4.5} fill="var(--background)" stroke="var(--accent)" strokeWidth="2.5" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Now: a dashed line through every lane and a "Now" tag in the header, so ongoing work reads as ongoing */}
              {now !== undefined && now >= axisStart && now < axisEnd && (() => {
                const nx = Math.round(toX(now + 0.5)) + 0.5;
                const tagW = 38;
                const tx = Math.min(chartWidth - tagW - 2, Math.max(2, nx - tagW / 2));
                return (
                  <g aria-hidden="true" className="gt-now">
                    <line x1={nx} x2={nx} y1={HEADER - 4} y2={height} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <rect x={tx} y={zoom === "month" ? 2 : 3} width={tagW} height={16} rx={8} fill="var(--accent)" />
                    <text x={tx + tagW / 2} y={zoom === "month" ? 13.5 : 14.5} textAnchor="middle" className="fill-(--background) font-mono text-[9.5px] font-semibold tracking-widest uppercase">
                      Now
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Tooltip, outside the clipped box */}
        {current && active !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-20 min-w-45 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(0,0,0,.25)]"
            style={{
              left: Math.min(listWidth + width - 190, Math.max(listWidth + 4, listWidth + toX(current.start) - scrollLeft)),
              top: (rowY.get(current.id) ?? 0) + rowHeight / 2 + 2,
            }}
          >
            <p className="mb-1.5 font-medium text-foreground">
              {current.label} <span className="text-muted">· {current.lane}</span>
            </p>
            {current.tooltip.map((row) => (
              <p key={row.label} className="flex justify-between gap-6 text-muted">
                <span>{row.label}</span>
                <span className="whitespace-nowrap text-foreground tabular-nums">{row.value}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* The same facts as a table, for screen readers. Wrapped: a table ignores sr-only's 1px width. */}
      <div className="sr-only">
        <table id={`${uid}-table`}>
          <caption>{label}</caption>
          <tbody>
            {ordered.map((t) => (
              <tr key={t.id}>
                <th scope="row">
                  {t.label}, {t.lane}
                </th>
                {t.tooltip.map((row) => (
                  <td key={row.label}>
                    {row.label}: {row.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .gt-root{--gt-panel:color-mix(in srgb,var(--foreground) 2.5%,var(--background));--gt-sunken:color-mix(in srgb,var(--foreground) 3.5%,var(--background));--gt-hover:color-mix(in srgb,var(--accent) 7%,var(--background));--gt-soft:color-mix(in srgb,var(--foreground) 72%,var(--background));--gt-line-strong:color-mix(in srgb,var(--foreground) 16%,var(--background));--gt-line-soft:color-mix(in srgb,var(--border) 55%,transparent);--gt-dim:color-mix(in oklab,var(--accent) 30%,var(--background))}
        .gt-box:has(svg:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
        .gt-plot{scrollbar-width:thin;scrollbar-color:var(--gt-line-strong) transparent}
        .gt-bar{transform-box:fill-box;transform-origin:left center;transition:opacity 200ms}
        [data-armed] .gt-bar{transform:scaleX(0);transition:transform 900ms var(--ease-std) var(--d,0ms),opacity 200ms}
        [data-armed][data-in] .gt-bar{transform:scaleX(1)}
        .gt-pulse{transform-box:fill-box;transform-origin:center;opacity:.35;animation:gt-pulse 1.8s ease-out infinite}
        @keyframes gt-pulse{0%{transform:scale(.5);opacity:.55}100%{transform:scale(1.6);opacity:0}}
        @media (prefers-reduced-motion:reduce){.gt-pulse{animation:none;opacity:.25}}
      `}</style>
    </div>
  );
}

export default GanttTimeline;
