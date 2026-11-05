"use client";

import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Pinned notes on ruled paper, adapted from the 21st.dev `how-it-works` look (founder, 2026-11-05).
 * Vertical zigzag, one card after another (founder's choice), with compact cards: from 768px the cards alternate
 * left and right, overlap a little in height, and a dashed path runs from each card's side into the next card's
 * pin. Stacked below 768px, without the path. Site palette and serif number instead of the demo's
 * orange/blue/purple and handwritten number. The path stands still with reduced motion.
 */

export interface PinnedCard {
  id: string;
  number: React.ReactNode; // serif line at the top of the panel
  emphasis?: boolean; // accent pin and tint (e.g. a current role)
  label?: string; // accessible name for the focusable card
  children: React.ReactNode;
}

const PIN =
  "M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z";

export function PinnedCards({ cards, className }: { cards: PinnedCard[]; className?: string }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pinRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [path, setPath] = useState<{ d: string; w: number; h: number } | null>(null);

  // From each card's inner side to the next card's pin. Layout offsets ignore the tilt and the rise-in
  // translate, so the path lands where the cards come to rest.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      if (window.innerWidth < 768 || cards.length < 2) return setPath(null);
      let d = "";
      for (let i = 0; i < cards.length - 1; i++) {
        const a = cardRefs.current[i];
        const b = cardRefs.current[i + 1];
        const pin = pinRefs.current[i + 1];
        if (!a || !b || !pin) continue;
        const goingRight = b.offsetLeft > a.offsetLeft;
        const x1 = goingRight ? a.offsetLeft + a.offsetWidth : a.offsetLeft;
        const y1 = a.offsetTop + a.offsetHeight * 0.55;
        const x2 = b.offsetLeft + pin.offsetLeft + pin.offsetWidth / 2;
        const y2 = b.offsetTop + pin.offsetTop + pin.offsetHeight * 0.3;
        const bend = Math.max(50, Math.abs(x2 - x1) * 0.6);
        d += `M ${x1} ${y1} C ${x1 + (goingRight ? bend : -bend)} ${y1}, ${x2} ${y2 - 70}, ${x2} ${y2} `;
      }
      setPath({ d, w: wrap.offsetWidth, h: wrap.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [cards.length]);

  // Rise in once on arrival (a DOM flag, so the no-JS / reduced-motion render is final).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.armed = "";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <div className={cn("pc-root relative py-8 sm:py-12", className)}>
        {/* Ruled paper, fading out at the sides */}
        <div aria-hidden="true" className="pc-rules pointer-events-none absolute inset-0" />

        <div ref={wrapRef} className="relative flex flex-col gap-8 md:block">
          {path && (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden md:block" width={path.w} height={path.h}>
              <m.path
                d={path.d}
                fill="none"
                stroke="var(--pc-path)"
                strokeWidth="1.75"
                strokeDasharray="7 6"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 0 }}
                animate={reduce ? undefined : { strokeDashoffset: -130 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          )}

          {cards.map((card, i) => {
            const left = i % 2 === 0;
            return (
              <div
                key={card.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                tabIndex={0}
                aria-label={card.label}
                className={cn(
                  "pc-card group relative z-10 w-full rounded-[22px] outline-none transition-transform duration-300 hover:z-30 focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-(--accent) md:w-[44%] lg:w-[40%]",
                  left ? "rotate-[0.6deg] md:ml-[3%] md:rotate-[1.5deg] lg:ml-[6%]" : "-rotate-[0.6deg] md:ml-[53%] md:-rotate-[1.5deg] lg:ml-[54%]",
                  i > 0 && "md:-mt-20",
                )}
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="rounded-[22px] border border-border bg-card p-1.5 shadow-[0_10px_20px_0_var(--pc-shadow)]">
                  <span
                    ref={(el) => {
                      pinRefs.current[i] = el;
                    }}
                    className="relative z-20 mx-auto mt-1 mb-2 block h-6 w-6"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("h-6 w-6", card.emphasis ? "text-accent" : "text-muted")} fill="currentColor">
                      <path d={PIN} />
                    </svg>
                  </span>
                  <div
                    className="relative flex flex-col rounded-[15px] border p-4"
                    style={{
                      background: card.emphasis ? "var(--pc-tint-accent)" : "var(--pc-tint)",
                      borderColor: card.emphasis ? "var(--pc-border-accent)" : "var(--border)",
                    }}
                  >
                    <span className={cn("mb-2 font-serif text-[30px] leading-none", card.emphasis ? "text-accent" : "text-foreground")}>{card.number}</span>
                    {card.children}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          .pc-root{--pc-path:color-mix(in srgb,var(--foreground) 28%,var(--background));--pc-shadow:color-mix(in srgb,var(--foreground) 10%,transparent);--pc-tint:color-mix(in srgb,var(--foreground) 3%,var(--card));--pc-tint-accent:color-mix(in srgb,var(--accent) 7%,var(--card));--pc-border-accent:color-mix(in srgb,var(--accent) 22%,var(--background))}
          .dark .pc-root{--pc-shadow:transparent}
          .pc-rules{background-image:linear-gradient(color-mix(in srgb,var(--foreground) 7%,transparent) 1px,transparent 1px);background-size:100% 32px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)}
          @media (hover:hover){.pc-card:hover{rotate:0deg;scale:1.02}}
          .pc-card:focus-visible{rotate:0deg}
          [data-armed] .pc-card{opacity:0;translate:0 20px;transition:opacity 700ms var(--ease-std) calc(var(--i)*110ms),translate 700ms var(--ease-std) calc(var(--i)*110ms),rotate 300ms,scale 300ms}
          [data-armed][data-in] .pc-card{opacity:1;translate:0 0}
          @media (prefers-reduced-motion:reduce){.pc-card{transition:none}.pc-card:hover{scale:none}}
        `}</style>
      </div>
    </LazyMotion>
  );
}

export default PinnedCards;
