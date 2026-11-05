"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import type { LanyardProps } from "@/components/ui/Lanyard";

// The lanyard's own textures. Warmed into the HTTP cache before the 3D badge mounts, so its first frame
// already has them (no blank card while they download).
const TEXTURES = ["/lanyard/card-front.jpg", "/lanyard/card-back.svg", "/lanyard/strap.svg"];

// The 3D badge, configured exactly as before the redesign (including its swing-in intro).
const LANYARD_PROPS: LanyardProps = {
  frontImage: "/lanyard/card-front.jpg",
  backImage: "/lanyard/card-back.svg",
  strapImage: "/lanyard/strap.svg",
  finish: "glossy",
  metal: "silver",
  size: 0.48,
  // Card top at ≈ 0.30·C (C = canvas height). globals.css (.hero) depends on these two numbers.
  strapLength: 0.55,
  intro: true,
};

// 1×1 transparent GIF: what the phone-only <picture> shows on wider screens (so nothing is downloaded).
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const PHONE_QUERY = "(max-width: 767px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

function warm(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // same mode Lanyard uses, so the cached response is reused
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

// After the page has loaded and the main thread is idle, so the 3D code never competes with first paint.
// (Founder: the badge must appear on open/refresh without any interaction. The step-P "wait for first
// interaction or 4s" timing was reverted; it saved blocking time but left the badge missing on load.)
function whenReady(run: () => void) {
  const idle = typeof window.requestIdleCallback === "function";
  let handle = 0;
  const schedule = () => {
    handle = idle ? window.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 600);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    window.removeEventListener("load", schedule);
    if (idle) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
}

/**
 * The hero's ID badge. Wrapper and canvas boxes are the same as before the redesign (the card's size is
 * derived from the canvas height, so these boxes must not change). The box is reserved on first paint;
 * the live 3D badge loads after the page and swings in with its original intro. Phones show a still first and
 * cross-fade to the live badge (at rest) once the page is idle. With reduced motion or without WebGL, the still stays.
 */
export default function HeroBadge({ alt, hint, className = "" }: { alt: string; hint: string; className?: string }) {
  const [Live, setLive] = useState<ComponentType<LanyardProps> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [still, setStill] = useState(false);
  // Tracked live, not read once: a window narrowed from desktop to phone width (or a rotated tablet) must
  // swap the live badge for the phone still, never show both (founder, 2026-11-05: two cards on screen).
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);

  useEffect(() => {
    if (Live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !supportsWebGL()) {
      if (!phone) setStill(true); // eslint-disable-line react-hooks/set-state-in-effect -- client-only capability check
      return; // phones keep their server-rendered still
    }
    let cancelled = false;
    const load = async () => {
      const [mod] = await Promise.all([import("@/components/ui/Lanyard"), ...TEXTURES.map(warm)]);
      if (!cancelled) setLive(() => mod.default);
    };
    // Phones too (founder, 2026-11-05): the still paints first (fast LCP), then the live badge loads after
    // the page is idle, like desktop, and cross-fades in at rest, so it is already draggable/flippable
    // when touched. (A "load on first touch" version made the first drag wait ~2s.)
    const cancelIdle = whenReady(load);
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [phone, Live]);

  // Give the canvas a few frames to draw its textured first frame, then cross-fade from the still.
  useEffect(() => {
    if (!Live) return;
    const t = window.setTimeout(() => setRevealed(true), 250);
    return () => window.clearTimeout(t);
  }, [Live]);

  return (
    <div className={`hero-badge ${className}`}>
      {/* The canvas box (position and size set by .hero-badge-stage in globals.css). */}
      <div className="hero-badge-stage">
        {/* Phones: the still is in the server HTML so it paints with the page instead of after hydration
            (measured 2026-11-05: rendered from an effect it became a 6.5s LCP). On wider screens the
            <source> swaps in a 1px blank, so the still is never downloaded there, and CSS hides it. */}
        <picture className="hero-badge-phone">
          <source media="(min-width: 768px)" srcSet={BLANK} />
          {/* A capture of the live badge at rest on a phone (whole canvas box, 0.75·C × C, 2026-11-05), so the
              cross-fade to the live badge doesn't jump (founder: the old still sat higher, with a shorter strap). */}
          <img
            src="/lanyard/badge-still-phone-1x.webp"
            srcSet="/lanyard/badge-still-phone-1x.webp 1x, /lanyard/badge-still-phone-2x.webp 2x, /lanyard/badge-still-phone-3x.webp 3x"
            width={280}
            height={373}
            alt=""
            fetchPriority="high" /* it is the phone LCP; without this, slow networks queue it behind the JS */
            className={`hero-badge-still pointer-events-none absolute left-1/2 h-full w-auto max-w-none -translate-x-1/2 transition-opacity duration-300 select-none ${Live && revealed ? "opacity-0" : ""}`}
            draggable={false}
          />
        </picture>
        {/* Still (tablet/desktop with reduced motion / no WebGL): a capture of the live badge at rest. The 3D card scales
            with the canvas height and is centred horizontally, so a full-height, centred image lines up. */}
        {/* Only for reduced motion / no WebGL. Not shown while the live badge waits: the brief requires the
            LCP element to be the hero text, and a still here becomes the LCP (measured: 1.1s → 3.3s). */}
        {still && !phone && (
          // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP with its own srcset
          <img
            src="/lanyard/badge-still-1x.webp"
            srcSet="/lanyard/badge-still-1x.webp 1x, /lanyard/badge-still.webp 2x"
            width={447}
            height={745}
            alt={alt}
            decoding="async"
            className="hero-badge-still pointer-events-none absolute left-1/2 h-full w-auto max-w-none -translate-x-1/2 select-none"
            draggable={false}
          />
        )}
        {Live && (
          <div className={`absolute inset-0 transition-opacity duration-300 ${revealed ? "opacity-100" : "opacity-0"}`}>
            {/* On phones it replaces a still that is already showing, so no swing-in: it starts at rest */}
            <Live {...LANYARD_PROPS} intro={!phone && LANYARD_PROPS.intro} />
          </div>
        )}
        {Live && !phone && <p className="hero-badge-hint pointer-events-none font-mono text-xs text-muted">{hint}</p>}
      </div>
      {/* Screen readers get the badge description whether the still or the live badge is showing. */}
      {(!still || phone) && <span className="sr-only">{alt}</span>}
    </div>
  );
}
