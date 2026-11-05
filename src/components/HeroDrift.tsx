"use client";

import { useEffect } from "react";

/**
 * Fallback for browsers without CSS scroll-driven animations (`animation-timeline: view()`).
 * Mirrors the CSS: while the hero scrolls out (its exit-crossing range), "Hardware" drifts left and "Software."
 * drifts right by up to 6vw. Writes only `transform`. Native scrolling; nothing is hijacked.
 */
export default function HeroDrift({ heroId }: { heroId: string }) {
  useEffect(() => {
    if (CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = document.getElementById(heroId);
    if (!hero) return;
    const left = hero.querySelectorAll<HTMLElement>(".hero-drift-l");
    const right = hero.querySelectorAll<HTMLElement>(".hero-drift-r");

    let raf = 0;
    const update = () => {
      raf = 0;
      const { top, height } = hero.getBoundingClientRect();
      // Exit-crossing range: from the hero's top at the viewport top (0) to its bottom there (1).
      const p = Math.min(1, Math.max(0, -top / Math.max(1, height)));
      const x = p * 6;
      left.forEach((el) => (el.style.transform = `translate3d(${-x}vw,0,0)`));
      right.forEach((el) => (el.style.transform = `translate3d(${x}vw,0,0)`));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else {
        window.removeEventListener("scroll", onScroll);
      }
    });
    io.observe(hero);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [heroId]);

  return null;
}
