// Built using Hyperiux Vault: https://vault.hyperiux.com
// Site adaptations (2026-11-04): entries come from props (was hard-coded demo data); track width, slide distance
// and reveal positions are derived from the entry count (were tuned for exactly 7); reduced motion renders a static
// list (no pin, no sideways slide); colours default to the site's tokens; headings use the site's serif.
"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/* Inline stand-in for @gsap/react's useGSAP. Mirrors its default
   `revertOnUpdate: false`: one gsap.context lives for the component's
   lifetime, the callback is re-added when dependencies change, and the
   context is reverted only on unmount. A callback may return its own
   cleanup, which runs before the next re-add and on unmount. */
function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export type JourneyItem = {
  id: string;
  /** Heading of the milestone, e.g. "2019" or "2016 — 2019". */
  year: string;
  /** Optional, shown after the year (e.g. "July"). */
  month?: string;
  content: string;
};

type SplitTextInstance = InstanceType<typeof SplitText>;

export type TimelineProps = {
  /** Milestones in display order; they alternate above and below the line. */
  items: JourneyItem[];
  id?: string;
  title?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** CSS object-position for the image panel (e.g. "50% 35%"); defaults to centre */
  imagePosition?: string;
  /** Photo width / height. When set, the card takes the photo's own shape (no crop, no empty sides):
      desktop keeps the 26vw height and narrows; phones get a portrait card up to 300px wide. Default: square / 4:3. */
  imageAspect?: number;
  /** Reveal animation duration, in seconds. */
  duration?: number;
  /** Fallback reveal duration when `duration` is omitted, in seconds. */
  scrollDuration?: number;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

/* Phones (< 768px, the site's md breakpoint) get a vertical timeline instead of the pinned sideways slide (founder,
   2026-11-05: the slide showed one item per screen, cut the title off and put entries under the nav). Both layouts
   are in the HTML and CSS picks one, so nothing jumps on load; this flag only decides which animations to set up. */
const PHONE_QUERY = "(max-width: 767px)";

function subscribeToPhone(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(PHONE_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function useIsPhone() {
  return useSyncExternalStore(
    subscribeToPhone,
    () => window.matchMedia?.(PHONE_QUERY)?.matches ?? false,
    () => false,
  );
}

// Left edge of the site's max-w-6xl column (72rem, with its 1.5rem padding), never less than the original 5vw.
const COLUMN_LEFT = "max(5vw, calc((100vw - 72rem) / 2 + 1.5rem))";

/* Entry text: the qualification (first sentence) stands out; the institution and grade follow, lighter.
   Founder (2026-11-05): the old single block read like a big grey paragraph. */
function EntryText({ text }: { text: string }) {
  const i = text.indexOf(". ");
  const head = i > 0 ? text.slice(0, i + 1) : text;
  const rest = i > 0 ? text.slice(i + 2) : "";
  return (
    <>
      <strong className="font-semibold" style={{ color: "var(--color-foreground)" }}>{head}</strong>
      {rest && <> {rest}</>}
    </>
  );
}

// Class-safe key for the per-item selectors (.jl-*, .jd-*, .title-*, .description-*).
const key = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "-");

/* Geometry, derived from the item count (the original was tuned for exactly 7: a 240vw / 800vw track).
   The track is sized so both rows fit: top row = title column (20% of the inner width) + items + gaps; bottom row =
   period column (34%, 30% on phones) + 7vw + items + gaps. How far it slides is measured from the DOM at refresh. */
function geometry(n: number, imgW = 26) {
  const count = Math.max(1, n);
  const nTop = Math.ceil(count / 2);
  const nBot = Math.floor(count / 2);
  const row = (k: number, item: number, gap: number) => (k ? k * item + (k - 1) * gap : 0);
  const deskInner = Math.max(row(nTop, 30, 15) / 0.8, (7 + row(nBot, 25, 20)) / 0.66) + 10;
  const mobInner = Math.max(row(nTop, 70, 40) / 0.8, (7 + row(nBot, 70, 40)) / 0.7) + 10;
  return {
    deskW: Math.round(deskInner + 15 + imgW), // + image (26vw square, narrower for a portrait photo) + gap 5 + padding 10 (vw)
    mobW: Math.round(mobInner + 95), // + image 76 + gap 5 + padding 14 (vw); image was 85vw
    positions: (mobile: boolean) =>
      Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1);
        // Desktop: the original 6→65% left the last entry finishing after the pin released; 6→52% (+20) ends by ~72%,
        // inside the slide (which ends at "92% bottom"). Phones keep the original 22→69% (+10), which already fits.
        const start = mobile ? 22 + t * 47 : 6 + t * 46;
        return [start, start + (mobile ? 10 : 20)] as const;
      }),
  };
}

export default function Timeline({
  items,
  id = "journey",
  title = "Product Storyline",
  periodLabel = "2020-2026",
  textColor = "var(--color-foreground, #000000)",
  mutedTextColor = "var(--color-muted-foreground, #3f3f46)",
  activeColor = "var(--color-accent, #ff5f00)",
  backgroundColor = "var(--color-background, #ffffff)",
  imageUrl,
  imageAlt = "",
  imagePosition,
  imageAspect,
  duration,
  scrollDuration = 1.2,
}: TimelineProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isPhone = useIsPhone();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);
  const topItems = items.filter((_, i) => i % 2 === 0);
  const bottomItems = items.filter((_, i) => i % 2 === 1);
  const deskImgW = imageAspect ? Math.round(26 * imageAspect * 10) / 10 : 26; // vw
  const geo = geometry(items.length, deskImgW);
  const sectionStyle: CSSProperties = {
    color: textColor,
    backgroundColor,
  };
  const activeStyle: CSSProperties = {
    backgroundColor: activeColor,
  };
  const mutedTextStyle: CSSProperties = {
    color: mutedTextColor,
  };

  /* ScrollTrigger measures its start/end points once, on creation and on window resize/load. Content above this
     section can change height later (on this site the Story mat swaps a 648px stand-in for the 782px mat once it
     nears the screen, so the section moves 134px). Without a re-measure the reveals fire at stale positions and
     entries stay hidden while on screen. Re-measure whenever the page height changes, and once fonts are ready. */
  useLayoutEffect(() => {
    if (reducedMotion) return;
    let timer = 0;
    let lastHeight = document.body.scrollHeight;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    const observer = new ResizeObserver(() => {
      const height = document.body.scrollHeight;
      if (Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      refresh();
    });
    observer.observe(document.body);
    document.fonts?.ready.then(refresh);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [reducedMotion]);

  // Phone layout: light, one-shot motion. The photo card settles in, each entry fades up once as it enters (no
  // scrubbed line masks, so text is never left half cut), and the connector line draws down with the scroll.
  useLayoutEffect(() => {
    const root = phoneRef.current;
    if (!root || reducedMotion || !isPhone) return;
    const ctx = gsap.context(() => {
      const card = root.querySelector(".jm-card");
      if (card) {
        gsap.fromTo(
          card,
          { scale: 0.94, rotate: -1.5, y: 24 },
          {
            scale: 1, rotate: 0, y: 0, ease: "power2.out",
            scrollTrigger: { trigger: card, start: "top 95%", end: "top 55%", scrub: true },
          },
        );
        gsap.fromTo(
          ".jm-photo",
          { scale: 1.1 },
          { scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } },
        );
      }
      gsap.utils.toArray<HTMLElement>(".jm-item").forEach((item) => {
        gsap.from(item.querySelectorAll(".jm-dot, .jm-text"), {
          autoAlpha: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: item, start: "top 88%", once: true },
        });
        const seg = item.querySelector(".jm-seg");
        if (seg) {
          gsap.from(seg, {
            scaleY: 0,
            ease: "none",
            scrollTrigger: { trigger: item, start: "top 75%", end: "bottom 65%", scrub: true },
          });
        }
      });
    }, root);
    return () => ctx.revert();
  }, [reducedMotion, isPhone, items.length]);

  useGSAP(() => {
    const section = sectionRef.current;

    if (!section || reducedMotion || isPhone) return;

    const isMobile = window.innerWidth < 600;
    const slider = wholeSliderRef.current;
    // Slide until the end of the track sits ~10% in from the right edge (measured, so any item count works).
    const slideX = () => (slider ? -Math.max(0, slider.scrollWidth - window.innerWidth * 0.9) : 0);
    const lineWidth = isMobile ? "65%" : "98%";
    const lineStart = isMobile ? "top 30%" : "top 25%";
    const slideEnd = isMobile ? "82% 50%" : "92% bottom";
    const lineEnd = isMobile ? "80% 50%" : "92% bottom";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: slideEnd,
        scrub: true,
        invalidateOnRefresh: true,
      },
      defaults: {
        ease: "none",
      },
    });

    tl.fromTo(
      slider,
      { x: 0 },
      { x: slideX },
    );

    gsap.to(".journey-line", {
      width: lineWidth,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: lineStart,
        end: lineEnd,
        scrub: true,
      },
    });

    // Site addition (2026-11-04): the image card animates, transform-only and tied to scroll.
    // 1) As the section arrives, the card settles in: smaller, a little tilted and lower, to its place.
    gsap.fromTo(
      ".journey-card",
      { scale: 0.88, rotate: -2.5, y: 40 },
      {
        scale: 1,
        rotate: 0,
        y: 0,
        ease: "power2.out",
        scrollTrigger: { trigger: section, start: "top 90%", end: "top 15%", scrub: true },
      },
    );
    // 2) While the track slides, the photo drifts inside the card (a slow zoom-out and pan: parallax depth).
    //    Skipped for a photo-shaped card (imageAspect): the founder wants the photo shown as it is, never zoomed.
    if (!imageAspect) gsap.fromTo(
      ".journey-photo",
      { scale: 1.12, xPercent: -2 }, // gentle enough to keep the edges of the photo (e.g. the Reaidy.io sign) in view
      {
        scale: 1,
        xPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: slideEnd, scrub: true },
      },
    );
  }, { dependencies: [reducedMotion, isPhone, items.length, imageAspect], scope: sectionRef });

  useGSAP(() => {
    const section = sectionRef.current;

    if (!section || reducedMotion || isPhone) return;

    items.forEach((item) => {
      const k = key(item.id);
      gsap.set(`.jl-${k}`, {
        scaleY: 0,
        transformOrigin: "bottom bottom",
      });
      gsap.set(`.jd-${k}`, { scale: 0 });
      gsap.set(`.title-${k}`, { opacity: 1 });
      gsap.set(`.description-${k}`, { opacity: 1 });
    });

    const titleSplits: Partial<Record<string, SplitTextInstance>> = {};
    const descriptionSplits: Partial<Record<string, SplitTextInstance>> = {};

    items.forEach((item) => {
      const k = key(item.id);
      titleSplits[k] = new SplitText(`.title-${k}`, {
        type: "chars, words, lines",
        mask: "lines",
      });

      descriptionSplits[k] = new SplitText(`.description-${k}`, {
        type: "chars, words, lines",
        mask: "lines",
        // "auto" would put aria-label on the <p>, which ARIA forbids (Lighthouse, 2026-11-05). The split copy
        // is hidden instead and an sr-only copy (next to each <p>) is read.
        aria: "hidden",
      });
    });

    const createItemTimeline = (
      item: JourneyItem,
      isTop: boolean,
      startPos: number,
      endPos: number,
    ) => {
      const k = key(item.id);
      const lineSelector = `.jl-${k}`;
      const dotSelector = `.jd-${k}`;
      const titleLines = titleSplits[k]?.lines || [];
      const descriptionLines = descriptionSplits[k]?.lines || [];

      if (!isTop) {
        gsap.set(lineSelector, { transformOrigin: "top top" });
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: `${startPos}% 30%`,
          end: `${endPos}% 50%`,
          scrub: true,
        },
      });

      timeline
        .to(lineSelector, {
          scaleY: 1,
          duration: normalizedDuration * 0.4,
        })
        .to(
          dotSelector,
          {
            scale: 1,
            duration: normalizedDuration * 0.4,
          },
          "<",
        )
        .fromTo(
          titleLines,
          { y: 100 },
          {
            y: 0,
            delay: -0.8 * normalizedDuration,
            duration: normalizedDuration,
            stagger: 0.02,
            ease: "power2.out",
          },
        )
        .fromTo(
          descriptionLines,
          { y: 100 },
          {
            y: 0,
            duration: normalizedDuration,
            stagger: 0.02,
            ease: "power2.out",
          },
          "<",
        );

      return timeline;
    };

    const positions = geo.positions(window.innerWidth < 600);

    items.forEach((item, index) => {
      const [startPos, endPos] = positions[index];
      createItemTimeline(item, index % 2 === 0, startPos, endPos);
    });

    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      Object.values(titleSplits).forEach((split) => split?.revert?.());
      Object.values(descriptionSplits).forEach((split) => split?.revert?.());
      window.removeEventListener("resize", handleResize);
    };
  }, { dependencies: [normalizedDuration, reducedMotion, isPhone, items], scope: sectionRef });

  // Reduced motion: no pin, no sideways slide, no reveals. The same content as a plain, ordered list.
  // The two layouts get different keys so React remounts instead of reusing elements that gsap has transformed.
  if (reducedMotion) {
    return (
      <section key="static" id={id} className="w-full py-16" style={sectionStyle}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-4xl leading-[0.95]">{title}</h2>
            <p className="text-lg" style={mutedTextStyle}>{periodLabel}</p>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- decorative panel image
              <img
                src={imageUrl}
                alt={imageAlt}
                className={"w-full rounded-2xl object-cover " + (imageAspect ? "max-w-[300px]" : "aspect-[4/3]")}
                style={{ objectPosition: imagePosition, aspectRatio: imageAspect }}
              />
            )}
          </div>
          <ol className="flex flex-col">
            {items.map((item) => (
              <li key={item.id} className="relative border-l pb-8 pl-6 last:pb-0" style={{ borderColor: activeColor }}>
                <span aria-hidden="true" className="absolute top-1 -left-[5px] size-2.5 rounded-full" style={activeStyle} />
                <h3 className="font-serif text-2xl leading-none">
                  {item.year} {item.month}
                </h3>
                <p className="mt-2 text-base font-medium leading-normal" style={mutedTextStyle}><EntryText text={item.content} /></p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  const trackStyle = {
    "--tw-desk": `${geo.deskW}vw`,
    "--tw-mob": `${geo.mobW}vw`,
  } as CSSProperties;

  return (
    <section key="motion" id={id} className="w-full" style={sectionStyle}>
    {/* Phones: vertical timeline (hidden from md up). */}
    <div ref={phoneRef} className="px-4 pt-8 pb-16 sm:px-6 md:hidden">
      <h2 className="font-serif text-[2.5rem] leading-[0.95]">{title}</h2>
      <p className="mt-3 text-base" style={mutedTextStyle}>{periodLabel}</p>
      {imageUrl && (
        <div
          className={"jm-card mt-8 w-full overflow-hidden rounded-2xl shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] " + (imageAspect ? "max-w-[min(300px,72vw)]" : "aspect-[4/3]")}
          // Phones: same width, but a 4:5 card instead of the full 9:16 photo (founder, 2026-11-06: the height
          // was too much); the top of the photo (the face) stays in frame.
          style={imageAspect ? { aspectRatio: Math.max(imageAspect, 4 / 5) } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative panel image */}
          <img
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
            className="jm-photo h-full w-full object-cover"
            style={{ objectPosition: imageAspect ? "50% 18%" : imagePosition }}
          />
        </div>
      )}
      <ol className="mt-10">
        {items.map((item, i) => (
          <li key={item.id} className="jm-item relative pb-10 pl-8 last:pb-0">
            {i < items.length - 1 && (
              // Connector from this dot to the next one.
              <span
                aria-hidden="true"
                className="jm-seg absolute top-[calc(0.55rem+5px)] -bottom-[calc(0.55rem+5px)] left-[5px] w-px origin-top"
                style={activeStyle}
              />
            )}
            <span
              aria-hidden="true"
              className="jm-dot absolute top-[0.55rem] left-0 size-[11px] rounded-full"
              style={activeStyle}
            />
            <div className="jm-text">
              <h3 className="font-serif text-[1.75rem] leading-none">
                {item.year} {item.month}
              </h3>
              <p className="mt-2 max-w-[34ch] text-[0.9375rem] font-medium leading-normal" style={mutedTextStyle}>
                <EntryText text={item.content} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>

    {/* Tablets and up: the pinned sideways slide. */}
    <div
      ref={sectionRef}
      className="relative hidden h-[200vw] w-full md:block"
    >
      <div className="h-screen w-full sticky top-[0%] pt-[10%] overflow-hidden max-[600px]:top-[5%]">
        <div
          ref={wholeSliderRef}
          className="mr-[2vw] flex h-[30vw] w-(--tw-desk) items-center gap-[5vw] px-[5vw] max-[600px]:h-[80vh] max-[600px]:w-(--tw-mob) max-[600px]:px-[7vw]"
          style={{
            ...trackStyle,
            // Founder (2026-11-05): start at the page's content column (where the "02 — Education" label sits), not the
            // screen edge; the slide then carries it left. The track grows by the same amount so nothing is squeezed.
            paddingLeft: COLUMN_LEFT,
            width: `calc(var(--tw-desk) + ${COLUMN_LEFT} - 5vw)`,
          }}
        >
          {imageUrl && (
            <div
              style={imageAspect ? { width: `${deskImgW}vw` } : undefined}
              className="journey-card h-[26vw] w-[26vw] shrink-0 overflow-hidden rounded-[1vw] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] transition-shadow duration-500 hover:shadow-[0_26px_60px_-18px_color-mix(in_oklab,var(--color-accent)_55%,transparent)] max-[600px]:h-[58vw] max-[600px]:w-[76vw] max-[600px]:rounded-[5vw]">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative panel image */}
              <img
                src={imageUrl}
                alt={imageAlt}
                draggable={false}
                className="journey-photo h-full w-full object-cover"
                style={{ objectPosition: imagePosition }}
              />
            </div>
          )}

          <div className="relative h-full w-full">
            <div className="w-full absolute left-0 top-[49%] flex items-center h-fit">
              <div
                className="h-[.8vw] max-[600px]:h-[2vw] max-[600px]:w-[2vw] w-[.8vw] shrink-0 rounded-full"
                style={activeStyle}
              ></div>
              <div
                className="h-px w-[0%] rounded-full journey-line"
                style={activeStyle}
              ></div>
              <div
                className="h-[.8vw] max-[600px]:h-[2vw] max-[600px]:w-[2vw] w-[.8vw] shrink-0 rounded-full"
                style={activeStyle}
              ></div>
            </div>

            <div className="flex h-1/2 w-full items-center justify-start gap-[.5vw]">
              <div className="h-full w-[20%] shrink-0 pt-[2vw] max-[600px]:h-fit max-[600px]:pt-[5vw]">
                <h2 className="w-[65%] font-serif text-[3vw] leading-[0.95] max-[600px]:text-[8.5vw]">
                  {title}
                </h2>
              </div>

              <div className="w-full flex h-full gap-x-[15vw] max-[600px]:gap-x-[40vw]">
                {topItems.map((item) => {
                  const k = key(item.id);
                  return (
                    <div
                      key={`top-${item.id}`}
                      className="relative h-full w-[30vw] shrink-0 px-[3vw] max-[600px]:flex max-[600px]:w-[70vw] max-[600px]:flex-col max-[600px]:px-[7vw]"
                    >
                      <div className="w-full absolute left-0 bottom-0 top-0 h-full">
                        <div
                          className={`size-[1vw] max-[600px]:size-[2.5vw] translate-x-[-50%] relative aspect-square rounded-full jd-${k}`}
                          style={activeStyle}
                        ></div>
                        <div
                          className={`h-[94%] w-px origin-bottom rounded-full jl-${k}`}
                          style={activeStyle}
                        ></div>
                      </div>

                      <div className="mt-[-1vw] space-y-[1vw] max-[600px]:mt-[-2vw]">
                        <h3
                          className={`title-${k} font-serif text-[2.5vw] leading-none max-[600px]:text-[6.4vw]`}
                        >
                          {item.year} {item.month}
                        </h3>
                        <p
                          className={`description-${k} w-[90%] max-w-[30ch] text-[1.1vw] font-medium leading-[1.4] max-[600px]:w-[90%] max-[600px]:text-[4.8vw]`}
                          style={mutedTextStyle}
                        >
                          <EntryText text={item.content} />
                        </p>
                        <span className="sr-only">{item.content}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-1/2 flex items-center justify-start w-full">
              <div className="w-[34%] shrink-0 pt-[2vw] max-[600px]:pt-[5vw] max-[600px]:w-[30%] h-full">
                <p
                  className="text-[1.65vw] leading-none max-[600px]:text-[4.2vw]"
                  style={mutedTextStyle}
                >
                  {periodLabel}
                </p>
              </div>

              <div className="w-full flex h-full gap-x-[20vw] ml-[7vw] max-[600px]:gap-x-[40vw] max-[600px]:ml-[7vw]">
                {bottomItems.map((item) => {
                  const k = key(item.id);
                  return (
                    <div
                      key={`bottom-${item.id}`}
                      className="relative h-full w-[25vw] shrink-0 px-[3vw] max-[600px]:w-[70vw] max-[600px]:px-[7vw]"
                    >
                      <div className="w-full absolute left-0 bottom-[-1%] h-full">
                        <div
                          className={`h-[94%] origin-top w-px rounded-full max-[600px]:h-full jl-${k}`}
                          style={activeStyle}
                        ></div>
                        <div
                          className={`size-[1vw] max-[600px]:size-[2.5vw] translate-x-[-50%] relative w-auto aspect-square rounded-full jd-${k}`}
                          style={activeStyle}
                        ></div>
                      </div>

                      {/* Starts a little below the line (founder, 2026-11-05: it sat right under it), like the
                          top entries keep clear of it; the connector and dot stay at the bottom. */}
                      <div className="flex h-full w-full flex-col justify-start space-y-[1vw] pt-[2.6vw]">
                        <h3
                          className={`title-${k} font-serif text-[2.5vw] leading-none max-[600px]:text-[6.4vw]`}
                        >
                          {item.year} {item.month}
                        </h3>
                        <p
                          className={`description-${k} w-[90%] max-w-[30ch] text-[1.1vw] font-medium leading-[1.4] max-[600px]:w-[90%] max-[600px]:text-[4.8vw]`}
                          style={mutedTextStyle}
                        >
                          <EntryText text={item.content} />
                        </p>
                        <span className="sr-only">{item.content}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </section>
  );
}
