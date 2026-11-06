"use client";

import * as React from "react";
import type { RoverHandle } from "./rover";
import "./iso.css";
import "./bench.css";

export interface AssemblyStep {
  group: string; // "The problem" / "What it does"
  title: string;
  body: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Width at which the information panel sits beside the rover instead of under it. */
const SIDE_BY_SIDE = 980;

/**
 * Assembly follows the scroll in both directions: scrolling down assembles the rover, scrolling
 * back up takes it apart again. The on-screen value eases toward the scroll position.
 */

/** One statement as the panel shows it (number, label, title, body), with a staggered entrance. */
function PanelStep({ step, index, total, state }: { step: AssemblyStep; index: number; total: number; state: "in" | "out" | "sizer" }) {
  return (
    <div className="asm-panel-step" data-state={state} aria-hidden={state !== "in" ? true : undefined}>
      <div className="asm-panel-head">
        <span className="asm-panel-num">
          <span className="asm-rise" style={{ "--d": "0ms" } as React.CSSProperties}>
            {pad2(index + 1)}
          </span>
        </span>
        <span className="asm-panel-meta asm-rise" style={{ "--d": "70ms" } as React.CSSProperties}>
          <span>{step.group}</span>
          <span className="asm-panel-of">
            Step {pad2(index + 1)} of {pad2(total)}
          </span>
        </span>
      </div>
      <h3 className="asm-panel-title asm-rise" style={{ "--d": "130ms" } as React.CSSProperties}>
        {step.title}
      </h3>
      <p className="asm-panel-body asm-rise" style={{ "--d": "190ms" } as React.CSSProperties}>
        {step.body.charAt(0).toUpperCase() + step.body.slice(1)}
      </p>
    </div>
  );
}

/**
 * Fig 03. Two stories share one scroll position but stay independent:
 *  · the software story: seven statements (the problem, then what OpenPlan does), shown one at a
 *    time in an information panel with a seven-segment progress bar;
 *  · the hardware story: a rover that goes from a CAD exploded view to fully assembled.
 * No statement is tied to any part of the rover.
 */
export default function AssemblySteps({ steps }: { steps: AssemblyStep[] }) {
  const track = React.useRef<HTMLDivElement>(null);
  const [{ active, previous }, setSteps] = React.useState({ active: 0, previous: -1 });
  const N = steps.length;

  // a short glow on the panel whenever a new step arrives (skipped on the very first render)
  const firstStep = React.useRef(true);
  React.useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const panel = track.current?.querySelector<HTMLElement>("[data-panel]");
    if (!panel) return;
    panel.removeAttribute("data-flash");
    void panel.offsetWidth; // restart the animation
    panel.setAttribute("data-flash", "");
    const done = window.setTimeout(() => panel.removeAttribute("data-flash"), 1200);
    return () => window.clearTimeout(done);
  }, [active]);

  React.useEffect(() => {
    const el = track.current;
    if (!el) return;
    const sticky = el.querySelector<HTMLElement>("[data-sticky]");
    const stage = el.querySelector<HTMLElement>("[data-stage]");
    const viewport = el.querySelector<HTMLElement>("[data-viewport]");
    const panel = el.querySelector<HTMLElement>("[data-panel]");
    const figure = el.querySelector<HTMLElement>("[data-figure]");
    const fills = Array.from(el.querySelectorAll<HTMLElement>("[data-fill]"));
    const remaining = el.querySelector<HTMLElement>("[data-remaining]");
    if (!sticky || !stage || !viewport || !panel || !figure) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isDark = () => document.documentElement.classList.contains("dark");

    let rover: RoverHandle | null = null;
    let cancelled = false;
    let reading = 0; // where the reader is (0…1): drives the active statement and the assembly
    let p = 0; // smoothed assembly progress shown on screen
    let frame = 0;
    let last = 0;
    let shown = -1;

    /** Side by side on wide stages: shift the rover right by half the panel's footprint. */
    const layout = () => {
      // centre the pinned box on screen (never under the navigation bar)
      const minTop = window.innerWidth <= 640 ? 64 : 76;
      sticky.style.top = `${Math.max(minTop, Math.round((window.innerHeight - sticky.offsetHeight) / 2))}px`;
      const side = viewport.clientWidth >= SIDE_BY_SIDE;
      viewport.toggleAttribute("data-side", side);
      rover?.shift(side ? (panel.offsetWidth + 48) / 2 : 0);
    };

    const measure = () => {
      // pinned from when the track top reaches the sticky offset until the track runs out
      const rect = el.getBoundingClientRect();
      const pin = parseFloat(getComputedStyle(sticky).top) || 0;
      const total = el.offsetHeight - sticky.offsetHeight;
      reading = total > 0 ? clamp((pin - rect.top) / total, 0, 1) : 0;
    };
    const draw = () => {
      rover?.set(p);
      figure.toggleAttribute("data-done", p >= 0.999);
      const at = reading * N;
      const step = Math.min(N - 1, Math.floor(at));
      // seven segments: past ones full, the active one fills as you read through it
      fills.forEach((fill, i) => {
        const share = i < step ? 1 : i > step ? 0 : clamp(at - step, 0.06, 1);
        fill.style.transform = `scaleX(${share.toFixed(3)})`;
      });
      if (step !== shown) {
        const from = shown;
        shown = step;
        setSteps({ active: step, previous: from });
        if (remaining) {
          const left = N - 1 - step;
          remaining.textContent = left === 0 ? "Final step" : `${left} remaining`;
        }
      }
    };
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const goal = reading; // assembly tracks the scroll position, down and up
      // eased towards the scroll position in either direction
      p = still.matches ? goal : p + (goal - p) * (1 - Math.exp(-dt / 0.18));
      if (Math.abs(goal - p) < 0.0004) p = goal;
      draw();
      frame = p !== goal ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      measure();
      draw();
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    // three.js loads only on the client, and only once the reader nears this section (about one screen
    // away), so it never adds to page-load blocking time (2026-11-05 Lighthouse: it was ~2s of main thread).
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        import("./rover").then(({ mountRover }) => {
          if (cancelled) return;
          rover = mountRover(stage, { dark: isDark() });
          layout();
          measure();
          p = reading;
          draw();
        });
      },
      { rootMargin: "100% 0px" },
    );
    near.observe(el);
    const themeWatch = new MutationObserver(() => rover?.theme(isDark()));
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const ro = new ResizeObserver(layout);
    ro.observe(viewport);

    measure();
    p = reading;
    draw();
    // Follow the scroll only while this section is on or near the screen (2026-11-06): it used to measure and
    // redraw on every scroll anywhere on the page, which cost frames in the Ventures book's page turns on
    // phones. One last update when it leaves, so it rests fully built (below) or taken apart (above).
    let following = false;
    const onScreen = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !following) {
          following = true;
          window.addEventListener("scroll", kick, { passive: true });
        } else if (!e.isIntersecting && following) {
          following = false;
          window.removeEventListener("scroll", kick);
        }
        kick();
      },
      { rootMargin: "25% 0px" },
    );
    onScreen.observe(el);
    const onResize = () => {
      layout();
      kick();
    };
    window.addEventListener("resize", onResize);
    layout();
    return () => {
      cancelled = true;
      near.disconnect();
      onScreen.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      themeWatch.disconnect();
      ro.disconnect();
      cancelAnimationFrame(frame);
      rover?.dispose();
    };
  }, [N]);

  return (
    <div ref={track} className="asm-track" style={{ height: `calc(${N} * 62vh + 100vh)` }}>
      <div data-sticky="" className="asm-sticky">
        {/* the full story for screen readers; the panel shows one statement at a time */}
        <ol className="sr-only">
          {steps.map((s, i) => (
            <li key={s.title}>
              {s.group}, {pad2(i + 1)}: {s.title} {s.body}
            </li>
          ))}
        </ol>
        <figure
          data-figure=""
          className="iso bench asm-figure"
          aria-label="Fig 03: a six-wheel planetary exploration rover in an exploded engineering view that assembles as you scroll, beside the OpenPlan story."
        >
          <div className="iso-plate bench-plate asm-plate">
            <div className="asm-viewport" data-viewport="">
              <div className="rover-stage" data-stage="" />
              <aside className="asm-panel" data-panel="">
                {/* every statement sits in one grid cell: the cell is as tall as the longest, so the panel never jumps */}
                <div className="asm-panel-stack" aria-live="polite">
                  {steps.map((s, i) => (
                    <PanelStep
                      key={i === active ? `in-${active}` : i === previous ? `out-${previous}` : `sizer-${i}`}
                      step={s}
                      index={i}
                      total={N}
                      state={i === active ? "in" : i === previous ? "out" : "sizer"}
                    />
                  ))}
                </div>
                <div className="asm-panel-track" aria-hidden="true">
                  {steps.map((s, i) => (
                    <span
                      key={s.title}
                      data-on={i === active ? "" : undefined}
                      data-past={i < active ? "" : undefined}
                      data-gap={i > 0 && steps[i - 1].group !== s.group ? "" : undefined}
                    >
                      <i data-fill="" />
                    </span>
                  ))}
                </div>
                <p className="asm-panel-remaining" data-remaining="">
                  {N - 1} remaining
                </p>
              </aside>
            </div>
          </div>
        </figure>
      </div>
    </div>
  );
}
