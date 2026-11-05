"use client";

import { useEffect } from "react";

/**
 * Inertia ("glide") scrolling for mouse wheels and trackpads, hand-written (no package).
 * The page still scrolls natively — this only eases wheel input towards a target, so
 * keyboard, scrollbar, anchor links, find-in-page and touch keep their normal behaviour.
 * Off for prefers-reduced-motion, pinch-zoom (ctrl+wheel), horizontal gestures,
 * scrollable children and when the page is scroll-locked (e.g. the mobile menu).
 */

function canScrollInside(start: EventTarget | null, dy: number): boolean {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const s = getComputedStyle(el);
    if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let target = window.scrollY;
    let current = window.scrollY;
    let raf = 0;
    let lastT = 0;

    const max = () => root.scrollHeight - window.innerHeight;

    const step = (t: number) => {
      const dt = lastT ? Math.min(64, t - lastT) : 16.7;
      lastT = t;
      // Frame-rate independent easing (≈ 0.1 per 60fps frame).
      const k = 1 - Math.exp(-dt / 95);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.5) current = target;
      window.scrollTo({ top: current, behavior: "instant" });
      if (current !== target) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        lastT = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (motion.matches || e.ctrlKey || e.defaultPrevented) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (getComputedStyle(root).overflow === "hidden" || getComputedStyle(document.body).overflow === "hidden") return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dy = e.deltaY * unit;
      if (canScrollInside(e.target, dy)) return;
      e.preventDefault();
      if (!raf) current = target = window.scrollY; // resync after any native scroll
      target = Math.max(0, Math.min(max(), target + dy));
      if (!raf) raf = requestAnimationFrame(step);
    };

    // Any scroll we didn't drive (keys, scrollbar, anchors) resets the glide.
    const onScroll = () => {
      if (!raf) current = target = window.scrollY;
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastT = 0;
      current = target = window.scrollY;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", stop);
    window.addEventListener("pointerdown", stop);
    window.addEventListener("hashchange", stop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("hashchange", stop);
    };
  }, []);

  return null;
}
