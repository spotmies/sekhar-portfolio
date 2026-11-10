"use client";

import * as React from "react";
import type { SceneHandle } from "./cubesat";
import "./iso.css";
import "./bench.css";

export interface AssemblyStep {
  group: string; // "The problem" / "What it does"
  title: string;
  body: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Scroll length of each step, in units of 62vh. Steps 6 (the parts fly into the CubeSat) and 7 (it lifts off,
 * wings and antennas deploy) carry the most motion, so they get more scroll and play out more slowly.
 */
const STEP_WEIGHT = [1, 1, 1, 1.75, 1.6]; // five steps (2026-11-09): the last two carry the most motion
const weightOf = (i: number) => STEP_WEIGHT[i] ?? 1;

/** Width from which the steps sit as layer cards on either side of the centred model (founder, 2026-11-09). */
const LAYERS_MIN = 1040;

/**
 * The scene follows the scroll in both directions: scrolling down moves it forward through its seven
 * states, scrolling back up reverses them. The on-screen value eases toward the scroll position.
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

/** One step as a layer card beside the model. Cards appear one after another as their step starts. */
function LayerCard({ step, index, total, state, side }: { step: AssemblyStep; index: number; total: number; state: "done" | "active" | "hidden"; side: "l" | "r" }) {
  return (
    <div className={"asm-layer asm-layer-" + side} data-state={state}>
      <span className="asm-layer-link" aria-hidden="true" />
      <div className="asm-layer-head">
        <span className="asm-layer-num">{pad2(index + 1)}</span>
        <span className="asm-layer-meta">
          <span>{step.group}</span>
          <span className="asm-layer-of">
            Step {pad2(index + 1)} of {pad2(total)}
          </span>
        </span>
      </div>
      <h3 className="asm-layer-title">{step.title}</h3>
      <p className="asm-layer-body">{step.body.charAt(0).toUpperCase() + step.body.slice(1)}</p>
    </div>
  );
}

/**
 * Fig 03: "Scattered data → built product". Seven statements (the problem, then what OpenPlan
 * does) are shown one at a time in an information panel with a seven-segment progress bar; each
 * statement drives one visual state of the 3D scene in ./cubesat.ts (scattered data tiles → BOM tree
 * → real parts → a change rippling to its dependents → an assembled, finished CubeSat).
 */
export default function AssemblySteps({ steps }: { steps: AssemblyStep[] }) {
  const track = React.useRef<HTMLDivElement>(null);
  const [{ active, previous }, setSteps] = React.useState({ active: 0, previous: -1 });
  const N = steps.length;
  const totalWeight = steps.reduce((sum, _, i) => sum + weightOf(i), 0);

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

    let rover: SceneHandle | null = null;
    let cancelled = false;
    let reading = 0; // where the reader is (0…1): drives the active statement and the assembly
    let p = 0; // smoothed assembly progress shown on screen
    let frame = 0;
    let last = 0;
    let shown = -1;

    /** Side by side on wide stages: shift the rover right by half the panel's footprint. */
    // Phones show / hide the address bar while scrolling, which changes the window height by ~50–110px. Centring
    // on that height made the pinned figure jump mid-scroll, so the height only counts when the width changes or
    // the height changes a lot (rotation, split screen).
    let screenW = window.innerWidth;
    let screenH = window.innerHeight;
    const stableHeight = () => {
      if (window.innerWidth !== screenW || Math.abs(window.innerHeight - screenH) > 160) {
        screenW = window.innerWidth;
        screenH = window.innerHeight;
      }
      return screenH;
    };
    const layout = () => {
      const vh = stableHeight();
      // centre the pinned box on screen (never under the navigation bar)
      const minTop = window.innerWidth <= 640 ? 64 : 76;
      sticky.style.top = `${Math.max(minTop, Math.round((vh - sticky.offsetHeight) / 2))}px`;
      // wide screens: the steps are layer cards on either side of the model, which stays centred
      const layers = viewport.clientWidth >= LAYERS_MIN;
      // short landscape screens (phones turned sideways): the single panel beside the model, as before
      const shortLandscape = !layers && vh <= 520 && window.innerWidth > vh && viewport.clientWidth >= 600;
      viewport.toggleAttribute("data-layers", layers);
      viewport.toggleAttribute("data-side", shortLandscape);
      rover?.shift(shortLandscape ? (panel.offsetWidth + 48) / 2 : 0);
    };

    /** Scroll reading (0…1) → position in steps (0…N), honouring each step's scroll length. */
    const toSteps = (r: number) => {
      let x = clamp(r, 0, 1) * totalWeight;
      for (let i = 0; i < N; i++) {
        const w = weightOf(i);
        if (x <= w) return i + x / w;
        x -= w;
      }
      return N;
    };

    const measure = () => {
      // pinned from when the track top reaches the sticky offset until the track runs out
      const rect = el.getBoundingClientRect();
      const pin = parseFloat(getComputedStyle(sticky).top) || 0;
      const total = el.offsetHeight - sticky.offsetHeight;
      reading = total > 0 ? clamp((pin - rect.top) / total, 0, 1) : 0;
    };
    const draw = () => {
      rover?.set(toSteps(p) / N);
      figure.toggleAttribute("data-done", p >= 0.999);
      const at = toSteps(reading);
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
      // a slightly calmer follow in the last two steps, where the most parts move at once
      const lag = toSteps(p) >= 4.8 ? 0.32 : 0.18;
      p = still.matches ? goal : p + (goal - p) * (1 - Math.exp(-dt / lag));
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
        import("./cubesat").then(({ mountCubesat }) => {
          if (cancelled) return;
          rover = mountCubesat(stage, { dark: isDark() });
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
  }, [N, totalWeight]);

  return (
    <div ref={track} className="asm-track" style={{ height: `calc(${totalWeight} * 62vh + 100vh)` }}>
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
          aria-label="Fig 03: scattered product data organises into a bill of materials, becomes the real parts of a small satellite, a part revision ripples to the parts it affects, and the satellite assembles as you scroll, beside the OpenPlan story."
        >
          <div className="iso-plate bench-plate asm-plate">
            <div className="asm-viewport" data-viewport="">
              {/* wide: layer cards on the left (steps 1, 3, 5, 7) and right (2, 4, 6), the model centred between them */}
              <div className="asm-layers asm-layers-l" aria-hidden="true">
                {steps.map((s, i) =>
                  i % 2 === 0 ? <LayerCard key={s.title} step={s} index={i} total={N} side="l" state={i < active ? "done" : i === active ? "active" : "hidden"} /> : null,
                )}
              </div>
              <div className="rover-stage" data-stage="" />
              <div className="asm-layers asm-layers-r" aria-hidden="true">
                {steps.map((s, i) =>
                  i % 2 === 1 ? <LayerCard key={s.title} step={s} index={i} total={N} side="r" state={i < active ? "done" : i === active ? "active" : "hidden"} /> : null,
                )}
              </div>
              {/* narrow screens: one statement at a time under the model */}
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
              </aside>
              <div className="asm-progress">
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
              </div>
            </div>
          </div>
        </figure>
      </div>
    </div>
  );
}
