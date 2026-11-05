"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NotchedProjectCard
 *
 * A project card whose cover has a rounded notch bitten out of its
 * bottom-right corner, with the "open" arrow nested inside it. The cut is
 * concentric with the arrow disc, and filleted where it meets the cover's
 * edges, so the cover curves into it instead of ending on a point.
 *
 * The notch is drawn by three layers painted in the colour of the surface
 * BEHIND the card (`surface`, the page background by default). Put the card
 * on a different background and pass that colour, or the notch shows.
 *
 * Optional extras:
 * - `screen`: a product screen layered over the cover photo. The photo holds
 *   still and the screen grows on hover, so the card gains depth instead of
 *   just zooming.
 * - `monochrome`: the cover sits in black and white and takes its colours
 *   back on hover or keyboard focus.
 *
 * Site adaptations (2026-11-04):
 * - `href` is optional. Without it the card is a plain <article> (not clickable). The arrow disc still shows and
 *   animates on hover (founder's request); it becomes a real link as soon as the project has an `href`.
 * - The arrow swaps on hover (one flies out, one slides in), and cards rise in as they scroll into view.
 * - `meta`: a small mono line under the tags (used for "Built with the Spotmies team").
 * - The title uses the site's serif; the empty cover uses --color-card (--color-muted is a text grey here).
 */

export interface NotchedProjectCardProps {
  href?: string;
  title: string;
  description?: string;
  /** cover photograph */
  image: string;
  imageAlt?: string;
  /** a pill at the top of the cover, e.g. the year */
  badge?: string;
  tags?: string[];
  /** a small line under the tags */
  meta?: string;
  /** a product screen over the photo (transparent PNG/WebP works best) */
  screen?: { src: string; alt: string; className?: string };
  /** a dark wash between the photo and the screen, 0 to 1 */
  dim?: number;
  monochrome?: boolean;
  /** the colour behind the card; the notch is painted in it */
  surface?: string;
  /** the arrow disc's fill on hover (any CSS colour); defaults to the theme's primary */
  accent?: string;
  /** the arrow's colour on that fill; pick one that contrasts with `accent` */
  accentForeground?: string;
  /** position in the grid, used to stagger the scroll-in reveal across a row */
  revealIndex?: number;
  className?: string;
}

const DISC = 64; // the arrow disc, px
const BLOCK = 80; // the notch block, px (radius = BLOCK - DISC / 2)
const FILLET = 28; // the curve where the cut meets the cover's edges, px

export function NotchedProjectCard({
  href,
  title,
  description,
  image,
  imageAlt = "",
  badge,
  tags = [],
  meta,
  screen,
  dim = screen ? 0.45 : 0,
  monochrome = false,
  surface = "var(--color-background)",
  accent,
  accentForeground = "#0a0a0a",
  revealIndex,
  className,
}: NotchedProjectCardProps) {
  const tone = monochrome
    ? "grayscale transition-[filter,scale] duration-500 group-hover:grayscale-0 group-focus-visible:grayscale-0"
    : "transition-[scale] duration-500";

  const body = (
    <>
      <div className="relative">
        {/* the cover */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- cover photo, sized by its container */}
          <img
            src={image}
            alt={screen ? "" : imageAlt}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              tone,
              !screen && "group-hover:scale-[1.04]",
            )}
          />
          {dim > 0 && (
            <div aria-hidden className="absolute inset-0" style={{ backgroundColor: `rgb(0 0 0 / ${dim})` }} />
          )}
          {screen && (
            // eslint-disable-next-line @next/next/no-img-element -- product screen, sized by its container
            <img
              src={screen.src}
              alt={screen.alt}
              loading="lazy"
              decoding="async"
              className={cn(
                "absolute bottom-0 right-0 w-[82%] origin-bottom-right drop-shadow-[0_18px_40px_rgba(0,0,0,0.5)] group-hover:scale-[1.07]",
                tone,
                screen.className,
              )}
            />
          )}
          {badge && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-4">
              <span className="rounded-full border border-white/40 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* the notch: a block with a concave corner, and a fillet at each
            end where the cut meets the cover's right and bottom edges */}
        <div
          aria-hidden
          className="absolute bottom-0 right-0"
          style={{ width: BLOCK, height: BLOCK, borderTopLeftRadius: BLOCK - DISC / 2, background: surface }}
        />
        {[
          { bottom: BLOCK, right: 0 },
          { bottom: 0, right: BLOCK },
        ].map((pos, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute"
            style={{
              ...pos,
              width: FILLET,
              height: FILLET,
              background: `radial-gradient(circle at top left, transparent ${FILLET - 0.5}px, ${surface} ${FILLET}px)`,
            }}
          />
        ))}

        {/* the arrow, nested in the notch. On hover the disc fills with the accent and the arrow flies out to the
            top right while a second one slides in from the bottom left (transform only; off under reduced motion). */}
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 right-0 flex items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-foreground transition-[background-color,color,scale] duration-300 group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none",
            accent
              ? "group-hover:bg-[var(--card-accent)] group-hover:text-[var(--card-accent-fg)] group-focus-visible:bg-[var(--card-accent)] group-focus-visible:text-[var(--card-accent-fg)]"
              : "group-hover:bg-primary group-hover:text-primary-foreground",
          )}
          style={
            {
              width: DISC,
              height: DISC,
              "--card-accent": accent,
              "--card-accent-fg": accentForeground,
            } as React.CSSProperties
          }
        >
          <ArrowUpRight className="size-5 transition-transform duration-300 ease-out group-hover:translate-x-[160%] group-hover:-translate-y-[160%] motion-reduce:transition-none" />
          <ArrowUpRight className="absolute size-5 -translate-x-[160%] translate-y-[160%] transition-transform duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none" />
        </span>
      </div>

      <h3 className="mt-5 font-serif text-[28px] leading-tight text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
      {meta && <p className="mt-4 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{meta}</p>}
    </>
  );

  // `npc-reveal`: rises into place as it scrolls into view (globals.css; scroll-driven, so no JS). `revealIndex`
  // staggers cards in the same row.
  const reveal = revealIndex === undefined ? undefined : ({ "--npc-i": revealIndex % 3 } as React.CSSProperties);
  if (!href) {
    return (
      <article className={cn("group npc-reveal flex flex-col", className)} style={reveal}>
        {body}
      </article>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={reveal}
      className={cn(
        "group npc-reveal flex flex-col rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      {body}
    </a>
  );
}

export default NotchedProjectCard;
