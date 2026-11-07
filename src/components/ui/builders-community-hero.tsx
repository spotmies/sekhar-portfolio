"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import CountUp from "@/components/CountUp";
import { cn } from "@/lib/utils";

/**
 * Orbit hero (adapted from the "builders community" component): items float on two arcs above count-up numbers.
 * Adapted for this site: `motion/react`, the site's theme tokens (light + dark), the site's CountUp, reveal on scroll
 * (not on mount), reduced-motion support, and no avatars/emoji (logos + animated lucide icons).
 *
 * Two layouts, each a fixed canvas scaled to fit its frame:
 * - "wide" (1200 wide): numbers in one row inside the canvas, under the arcs. For lg and up.
 * - "compact" (400 wide, 2026-11-07): a smaller arc for phones and tablets; numbers in a 2×2 grid under it.
 */

export type OrbitRing = "outer" | "inner";

interface OrbitBase {
  ring: OrbitRing;
  angle: number;
}

/** A brand logo on a card. `darkSrc` swaps in on dark mode; `plate` puts light-on-dark logos on a dark plate. */
export interface OrbitLogoItem extends OrbitBase {
  kind: "logo";
  src: string;
  darkSrc?: string;
  alt: string;
  width: number;
  plate?: boolean;
}

export interface OrbitPillItem extends OrbitBase {
  kind: "pill";
  icon: ReactNode;
  label: string;
}

export interface OrbitCheckItem extends OrbitBase {
  kind: "check";
  icon: ReactNode;
}

export type OrbitItem = OrbitLogoItem | OrbitPillItem | OrbitCheckItem;

export interface OrbitStat {
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export type OrbitLayout = "wide" | "compact";

export interface CommunityOrbitProps {
  items: OrbitItem[];
  stats: OrbitStat[];
  headline: ReactNode;
  description?: ReactNode;
  layout?: OrbitLayout;
  className?: string;
}

interface Geometry {
  w: number;
  h: number;
  /** empty strip above the top items, cut off the canvas */
  trim: number;
  center: { x: number; y: number };
  radius: Record<OrbitRing, number>;
  minScale: number;
  maxScale: number;
  /** largest share of the screen height the arcs may take (so the section fits one screen, also when zoomed) */
  maxHeightShare?: number;
}

const GEOMETRY: Record<OrbitLayout, Geometry> = {
  wide: { w: 1200, h: 490, trim: 96, center: { x: 600, y: 620 }, radius: { outer: 492, inner: 404 }, minScale: 0.5, maxScale: 1, maxHeightShare: 0.36 },
  compact: { w: 400, h: 214, trim: 18, center: { x: 200, y: 262 }, radius: { outer: 212, inner: 128 }, minScale: 0.7, maxScale: 1.5 },
};

function positionOnRing(g: Geometry, ring: OrbitRing, angle: number): CSSProperties {
  const rad = (angle * Math.PI) / 180;
  const r = g.radius[ring];
  // whole pixels: long floats serialise differently on server and client (hydration mismatch)
  return { left: Math.round(g.center.x + r * Math.cos(rad)), top: Math.round(g.center.y - r * Math.sin(rad)) };
}

// Path from the left, over the top, to the right.
function arcPath(g: Geometry, r: number) {
  const dy = g.center.y - g.h;
  const dx = Math.sqrt(r * r - dy * dy);
  return `M ${g.center.x - dx} ${g.h} A ${r} ${r} 0 0 1 ${g.center.x + dx} ${g.h}`;
}

const CHIP = "border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]";

function OrbitLogo({ src, darkSrc, alt, width, plate, compact }: OrbitLogoItem & { compact: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        compact ? "h-[44px] rounded-xl px-3.5" : "h-[56px] rounded-2xl px-5",
        plate ? "border border-white/10 bg-[#1c1917] shadow-[0_2px_8px_rgba(0,0,0,0.12)]" : CHIP,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} draggable={false} className={cn("h-auto select-none", darkSrc && "dark:hidden")} style={{ width }} />
      {darkSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={darkSrc} alt={alt} width={width} draggable={false} className="hidden h-auto select-none dark:block" style={{ width }} />
      )}
    </div>
  );
}

function OrbitPill({ icon, label }: OrbitPillItem) {
  return (
    <div className={cn("flex min-h-[34px] items-center gap-2 rounded-full py-1.5 pr-3.5 pl-3 text-[13.5px] font-medium whitespace-nowrap text-muted", CHIP)}>
      <span className="flex shrink-0 items-center text-accent">{icon}</span>
      <span className="leading-none">{label}</span>
    </div>
  );
}

function OrbitCheck({ icon, compact }: OrbitCheckItem & { compact: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        compact ? "h-[38px] w-[38px]" : "h-[50px] w-[50px]",
      )}
    >
      {icon}
    </div>
  );
}

function renderItem(item: OrbitItem, compact: boolean) {
  switch (item.kind) {
    case "logo":
      return <OrbitLogo {...item} compact={compact} />;
    case "pill":
      return <OrbitPill {...item} />;
    case "check":
      return <OrbitCheck {...item} compact={compact} />;
  }
}

const reveal = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function CommunityOrbit({ items, stats, headline, description, layout = "wide", className }: CommunityOrbitProps) {
  const g = GEOMETRY[layout];
  const compact = layout === "compact";
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const inView = useInView(frameRef, { once: true, amount: 0.35 });
  const calm = useReducedMotion();
  const state = inView || calm ? "show" : "hidden";

  // Start at full size, then shrink to fit the frame.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const byWidth = frame.clientWidth / g.w;
      const byHeight = g.maxHeightShare ? (window.innerHeight * g.maxHeightShare) / (g.h - g.trim) : Infinity;
      setScale(Math.min(g.maxScale, Math.max(g.minScale, Math.min(byWidth, byHeight))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    window.addEventListener("resize", measure); // zoom changes innerHeight without resizing the frame
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [g]);

  const statCell = (s: OrbitStat, i: number) => (
    <motion.div
      key={s.label}
      className={compact ? "border-t border-border pt-2.5" : "flex flex-col items-center"}
      variants={reveal}
      initial={calm ? "show" : "hidden"}
      animate={state}
      transition={{ duration: 0.6, delay: (compact ? 0.5 : 0.8) + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <dd className={cn("m-0 font-serif leading-none tracking-[-0.02em] text-foreground tabular-nums", compact ? "text-[34px]" : "text-[56px]")}>
        <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} />
      </dd>
      <dt className={cn("text-muted", compact ? "mt-1.5 text-[13px] leading-snug" : "mt-3 text-center text-[14px] leading-none whitespace-nowrap")}>
        {s.label}
      </dt>
    </motion.div>
  );

  return (
    <div className={cn("w-full", className)}>
      <div ref={frameRef} className="relative mx-auto w-full max-w-[1200px] overflow-hidden" style={{ height: (g.h - g.trim) * scale }}>
        <div
          className="absolute top-0 left-1/2"
          style={{ width: g.w, height: g.h, transform: `translate(-50%, ${-g.trim * scale}px) scale(${scale})`, transformOrigin: "top center" }}
        >
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={g.w}
            height={g.h}
            viewBox={`0 0 ${g.w} ${g.h}`}
            fill="none"
            style={{ maskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)" }}
          >
            <motion.path d={arcPath(g, g.radius.outer)} className="stroke-border" strokeWidth={2} initial={{ pathLength: calm ? 1 : 0 }} animate={{ pathLength: state === "show" ? 1 : 0 }} transition={{ duration: 1.4, ease: "easeOut" }} />
            <motion.path d={arcPath(g, g.radius.inner)} className="stroke-border" strokeWidth={compact ? 2 : 3} initial={{ pathLength: calm ? 1 : 0 }} animate={{ pathLength: state === "show" ? 1 : 0 }} transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }} />
          </svg>

          {items.map((item, i) => (
            <motion.div
              key={i}
              className="absolute w-max -translate-x-1/2 -translate-y-1/2"
              style={positionOnRing(g, item.ring, item.angle)}
              initial={{ opacity: calm ? 1 : 0, scale: calm ? 1 : 0.7 }}
              animate={state === "show" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={calm ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 4 + (i % 4) * 0.6, repeat: Infinity, ease: "easeInOut", delay: (i * 0.4) % 2 }}
                whileHover={{ scale: 1.06 }}
              >
                {renderItem(item, compact)}
              </motion.div>
            </motion.div>
          ))}

          {!compact && (
            // wide: the headline sits inside the arc, above the numbers (the space there was empty; one-screen fit)
            <motion.h3
              className="absolute top-[296px] left-1/2 m-0 w-[520px] -translate-x-1/2 text-center font-serif text-[42px] leading-[1.1] text-balance"
              variants={reveal}
              initial={calm ? "show" : "hidden"}
              animate={state}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {headline}
            </motion.h3>
          )}

          {!compact && (
            <dl className="absolute bottom-3 left-1/2 m-0 grid -translate-x-1/2 auto-cols-fr grid-flow-col gap-14">
              {stats.map(statCell)}
            </dl>
          )}
        </div>
      </div>

      {compact && <dl className="m-0 mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">{stats.map(statCell)}</dl>}

      <motion.div
        className={compact ? "mt-6" : "mx-auto mt-4 max-w-[880px] text-center"}
        variants={reveal}
        initial={calm ? "show" : "hidden"}
        animate={state}
        transition={{ duration: 0.7, delay: compact ? 0.8 : 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {compact && <h3 className="font-serif text-[26px] leading-[1.1] text-balance sm:text-[34px]">{headline}</h3>}
        {description && (
          <p className={cn("leading-relaxed text-pretty text-muted", compact ? "mt-3 text-[15px] sm:text-base" : "text-base")}>{description}</p>
        )}
      </motion.div>
    </div>
  );
}

export { CommunityOrbit as Component };
