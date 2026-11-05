"use client";

import * as React from "react";
import { translateAlong } from "./iso-kit";
import {
  BENCH_SVG,
  P,
  PART_LIFT,
  PIN_LIFT,
  PROBE_AT,
  PROBE_REST,
  STAMP_DOWN,
  STAMP_REST,
  STAND_X,
  probeRod,
  stampRod,
  tape,
  wheelPointer,
} from "./geometry";
import { ASSEMBLIES, FIRST_ECO, PARTS, REST_PART, RESTING_READOUT, TOUR, assembliesOf, readoutOf, revLabel } from "./model";
import "./iso.css";
import "./bench.css";

/**
 * Fig 02 — the Change Bench. Static art comes from ./geometry as one SVG string; this component
 * moves its groups by writing attributes on refs (no React re-render per frame).
 *
 * One change, in seconds from the moment the probe reaches its part:
 *   0.00–0.45 probe descends · 0.60 pulse runs part → rack · 1.50 Part module
 *   1.85 Assembly pins rise · 2.20 revision steps · 2.55–3.50 stamp (ECO number at 2.80)
 *   2.80 pulses run back to every touched part, which lifts at 3.80 · 3.15 tasks tick up
 *   6.60 everything settles · 7.80 done
 */

const T = {
  probeDown: 0.45,
  probeHold: 0.75,
  probeUp: 1.2,
  cableOut: [0.6, 1.5],
  links: [
    [1.5, 1.85],
    [1.85, 2.2],
    [2.2, 2.55],
    [2.8, 3.15],
  ],
  rev: 2.2,
  stampDown: [2.55, 2.8],
  stampUp: [2.95, 3.5],
  back: [2.8, 3.8],
  tasks: 3.15,
  taskStep: 0.2,
  settle: 6.6,
  done: 7.8,
};
const IDLE_GAP = 1.1;
const PULSE = 12;

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const span = (t: number, [a, b]: number[]) => ease((t - a) / (b - a));

export default function ChangeBench() {
  const root = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;
    const q = <E extends Element>(sel: string) => svg.querySelector<E>(sel)!;
    const qa = <E extends Element>(sel: string) => Array.from(svg.querySelectorAll<E>(sel));

    const carriage = q<SVGGElement>('[data-part="carriage"]');
    const probe = q<SVGGElement>("[data-probe-rod]");
    const parts = PARTS.map((_, i) => q<SVGGElement>(`[data-part="part-${i}"]`));
    const pins = qa<SVGGElement>("[data-pin]");
    const stamp = q<SVGGElement>('[data-part="stamp"]');
    const stampRodEl = q<SVGGElement>("[data-stamp-rod]");
    const wheel = q<SVGPathElement>("[data-wheel]");
    const tapeEl = q<SVGGElement>("[data-tape]");
    const leds = new Map(qa<SVGCircleElement>("[data-led]").map((n) => [n.dataset.led!, n]));
    const shows = new Map(qa<SVGTextElement>("[data-display]").map((n) => [n.dataset.display!, n]));
    const pulses = new Map(
      qa<SVGPathElement>("[data-pulse]").map((n) => {
        const len = n.getTotalLength();
        n.style.strokeDasharray = `${PULSE} 100000`;
        n.style.strokeDashoffset = String(PULSE + 999);
        return [n.dataset.pulse!, { n, len, shown: -999 }];
      }),
    );
    const readout = el.querySelector<HTMLElement>("[data-readout]");
    const live = el.querySelector<HTMLElement>("[data-live]");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ---- state ---- */
    let part = REST_PART;
    let eco = FIRST_ECO;
    let revs = 1; // "B"
    let x = STAND_X[REST_PART];
    let clock = -1; // seconds into the current change; -1 = travelling, Infinity = idle
    let idle = 0;
    let tourAt = 0;
    let touring = !still.matches;
    let printed = 0;
    let wheelTurn = revs / 20;
    let wheelFrom = wheelTurn;
    let changed = false; // ECO already bumped this change
    let stepped = false; // revision already stepped this change
    const lift = PARTS.map(() => ({ at: 0, v: 0 }));
    const pinLift = pins.map(() => ({ at: 0, v: 0 }));
    let tapeLen = 4;
    let last = 0;
    let frame = 0;
    let visible = false;
    let resume = 0;

    const cache = new Map<Element, string>();
    const put = (node: Element, attr: string, value: string) => {
      if (cache.get(node) === `${attr}=${value}`) return;
      cache.set(node, `${attr}=${value}`);
      node.setAttribute(attr, value);
    };
    const html = new Map<Element, string>();
    const setHtml = (node: Element, value: string) => {
      if (html.get(node) === value) return;
      html.set(node, value);
      node.innerHTML = value;
    };
    const flag = (node: Element | undefined, on: boolean) => {
      if (!node) return;
      if (on) node.setAttribute("data-on", "");
      else node.removeAttribute("data-on");
    };
    const say = (id: string, text: string) => {
      const n = shows.get(id);
      if (n && n.textContent !== text) {
        n.textContent = text;
        n.setAttribute("data-fresh", "");
        window.setTimeout(() => n.removeAttribute("data-fresh"), 500);
      }
    };
    const pulseAt = (id: string, pos: number) => {
      const p = pulses.get(id);
      if (!p) return;
      const rounded = Math.round(pos * 10) / 10;
      if (p.shown === rounded) return;
      p.shown = rounded;
      p.n.style.strokeDashoffset = String(PULSE - pos);
    };
    /** A pulse along a chain of paths; s = 0..1 from the chain's first path to its last. */
    const chain = (ids: string[], s: number, reverse = false) => {
      const lens = ids.map((id) => pulses.get(id)?.len ?? 0);
      const total = lens.reduce((a, b) => a + b, 0);
      const active = s > 0 && s < 1;
      let u = (reverse ? 1 - s : s) * (total + PULSE);
      ids.forEach((id, i) => {
        pulseAt(id, active ? u : -999);
        u -= lens[i];
      });
    };
    const spring = (s: { at: number; v: number }, target: number, dt: number) => {
      if (still.matches) {
        s.at = target;
        s.v = 0;
        return true;
      }
      for (let i = 0; i < 4; i++) {
        s.v += ((target - s.at) * 260 - s.v * 24) * (dt / 4);
        s.at += s.v * (dt / 4);
      }
      if (Math.abs(target - s.at) < 0.01 && Math.abs(s.v) < 0.01) {
        s.at = target;
        s.v = 0;
        return true;
      }
      return false;
    };

    const start = (next: number) => {
      part = next;
      clock = -1;
      changed = false;
      stepped = false;
      printed = 0;
      PARTS.forEach((_, i) => flag(parts[i], false));
      leds.forEach((n) => flag(n, false));
      pulses.forEach((_, id) => pulseAt(id, -999));
    };

    /* ---- one frame ---- */
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const calm = still.matches;
      let busy = false;

      // travel, then run the change clock
      const goal = STAND_X[part];
      if (clock < 0) {
        x = calm ? goal : x + (goal - x) * (1 - Math.exp(-dt / 0.32));
        if (Math.abs(goal - x) < 0.15) {
          x = goal;
          clock = calm ? T.done : 0;
        }
        busy = true;
      } else if (clock < T.done) {
        clock += dt;
        busy = true;
      } else if (touring) {
        idle += dt;
        if (idle > IDLE_GAP) {
          idle = 0;
          tourAt = (tourAt + 1) % TOUR.length;
          start(TOUR[tourAt]);
        }
        busy = true;
      }
      const t = clock < 0 ? -1 : clock;
      const p = PARTS[part];
      const touched = new Set(p.touches);
      const asm = new Set<number>(assembliesOf(part));

      // probe
      const down = span(t, [0, T.probeDown]) * (1 - span(t, [T.probeHold, T.probeUp]));
      const tip = PROBE_REST + (PROBE_AT[part] - PROBE_REST) * down;
      put(carriage, "transform", translateAlong(P, [x, 0, 0]));
      setHtml(probe, probeRod(Math.round(tip * 20) / 20));

      // pulse out along the part's cable, then down the rack links
      const window01 = ([a, b]: number[]) => (t > a && t < b ? (t - a) / (b - a) : 0);
      chain([`part-a-${part}`, `part-b-${part}`], window01(T.cableOut));
      T.links.forEach((w, i) => chain([`link-${i}`], window01(w)));
      const at = (time: number) => t >= time;
      flag(leds.get(`part-${part}`), at(T.cableOut[1]) && t < T.settle);
      flag(leds.get("mod-0"), at(T.links[0][0]) && t < T.settle);
      flag(leds.get("mod-1"), at(T.links[1][0]) && t < T.settle);
      flag(leds.get("mod-2"), at(T.rev) && t < T.settle);
      flag(leds.get("mod-3"), at(T.stampDown[1]) && t < T.settle);
      flag(leds.get("mod-4"), at(T.tasks) && t < T.settle);
      if (at(T.links[0][0])) say("part", p.no);
      if (at(T.links[1][0])) say("assembly", ASSEMBLIES[p.assembly].split(" ")[0]);

      // revision: the letter steps and the wheel turns one notch
      if (at(T.rev) && !stepped) {
        stepped = true;
        revs += 1;
        wheelFrom = wheelTurn;
        say("revision", `REV ${revLabel(revs)}`);
      }
      const turn = stepped ? wheelFrom + (revs / 20 - wheelFrom) * span(t, [T.rev, T.rev + 0.4]) : wheelTurn;
      wheelTurn = turn;
      put(wheel, "d", wheelPointer(turn));

      // stamp
      const sDown = span(t, T.stampDown) * (1 - span(t, T.stampUp));
      const headZ = STAMP_REST + (STAMP_DOWN - STAMP_REST) * (t < 0 ? 0 : sDown);
      put(stamp, "transform", translateAlong(P, [0, 0, headZ - STAMP_REST]));
      setHtml(stampRodEl, stampRod(Math.round(headZ * 20) / 20));
      if (at(T.stampDown[1]) && !changed) {
        changed = true;
        eco += 1;
        say("change", `ECO ${eco}`);
        const text = readoutOf(part, eco);
        if (readout) readout.textContent = text;
        if (live) live.textContent = text;
      }

      // pulses back to every touched part
      const back = window01(T.back);
      p.touches.forEach((i) => {
        if (i === part && back === 0) return;
        chain([`part-a-${i}`, `part-b-${i}`], back, true);
      });
      PARTS.forEach((_, i) => {
        const on = touched.has(i) && at(T.back[1]) && t < T.settle;
        flag(parts[i], on);
        if (on) flag(leds.get(`part-${i}`), true);
        else if (i !== part || t >= T.settle) flag(leds.get(`part-${i}`), false);
        if (!spring(lift[i], on ? PART_LIFT : 0, dt)) busy = true;
        put(parts[i], "transform", translateAlong(P, [0, 0, lift[i].at]));
      });
      pins.forEach((pin, i) => {
        const on = asm.has(i) && at(T.links[1][1]) && t < T.settle;
        flag(pin, on);
        if (!spring(pinLift[i], on ? PIN_LIFT : 0, dt)) busy = true;
        put(pin, "transform", translateAlong(P, [0, 0, pinLift[i].at]));
      });

      // tasks: the counter ticks and the printer feeds one line per task
      const due = at(T.tasks) ? Math.min(p.tasks, 1 + Math.floor((t - T.tasks) / T.taskStep)) : 0;
      if (t >= 0 && due !== printed) printed = due;
      say("task", `TASKS ${t < 0 ? 0 : printed}`);
      const want = 4 + (t < 0 ? 0 : printed) * 2.6;
      tapeLen = calm ? want : tapeLen + (want - tapeLen) * (1 - Math.exp(-dt / 0.12));
      if (Math.abs(want - tapeLen) > 0.02) busy = true;
      else tapeLen = want;
      setHtml(tapeEl, tape(Math.round(tapeLen * 10) / 10, t < 0 ? 0 : printed));

      frame = visible && (busy || touring) ? requestAnimationFrame(tick) : 0;
    };

    const run = () => {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const choose = (next: number) => {
      touring = false;
      window.clearTimeout(resume);
      resume = window.setTimeout(() => {
        touring = !still.matches;
        run();
      }, 9000);
      start(next);
      run();
    };

    const onClick = (e: MouseEvent) => {
      const hit = (e.target as Element).closest<SVGPathElement>("[data-pick]");
      if (hit) choose(Number(hit.dataset.pick));
    };
    const onOver = (e: PointerEvent) => {
      const hit = (e.target as Element).closest<SVGPathElement>("[data-pick]");
      parts.forEach((g, i) => (hit && Number(hit.dataset.pick) === i ? g.setAttribute("data-hover", "") : g.removeAttribute("data-hover")));
    };
    const onLeave = () => parts.forEach((g) => g.removeAttribute("data-hover"));
    const stage = el.querySelector<HTMLElement>("[data-stage]")!;
    const onKey = (e: KeyboardEvent) => {
      let next: number | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (part + 1) % PARTS.length;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (part + PARTS.length - 1) % PARTS.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = PARTS.length - 1;
      if (e.key === "Enter" || e.key === " ") next = part;
      if (next === null) return;
      e.preventDefault();
      choose(next);
    };
    stage.addEventListener("click", onClick);
    stage.addEventListener("pointerover", onOver);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("keydown", onKey);
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) run();
        else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "80px 0px" },
    );
    io.observe(stage);
    // start the tour from the resting part; under reduced motion stay still until asked
    if (touring) start(REST_PART);
    else clock = Infinity;

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(resume);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("pointerover", onOver);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <figure ref={root} className="iso bench" aria-labelledby="bench-title">
      <div className="iso-plate bench-plate">
        <div className="iso-plate-corners" aria-hidden="true">
          <span className="iso-plate-corner" data-corner="fig">
            Fig 02
          </span>
          <span className="iso-plate-corner" data-corner="title" id="bench-title">
            Change bench
          </span>
          <span className="iso-plate-corner" data-corner="hint">
            <span className="bench-hint-wide">Click a part to raise a change</span>
            <span className="bench-hint-narrow">Tap a part</span>
          </span>
          <span className="iso-plate-corner" data-corner="readout" data-readout="">
            {RESTING_READOUT}
          </span>
        </div>
        <div className="bench-scroll">
          <div
            className="iso-stage bench-stage"
            data-stage=""
            tabIndex={0}
            role="group"
            aria-roledescription="interactive figure"
            aria-label="Change bench. Use the left and right arrow keys to raise a change on another part."
            dangerouslySetInnerHTML={{ __html: BENCH_SVG }}
          />
        </div>
        <p className="sr-only" aria-live="polite" data-live="">
          {RESTING_READOUT}
        </p>
      </div>
      <figcaption className="iso-legend bench-legend">
        <span className="iso-keys">
          <span className="iso-key">
            <Swatch mark="lit" />
            Change order: the stamp that raises a change
          </span>
          <span className="iso-key">
            <Swatch mark="raised" />
            Parts: each one wired to its record in the rack
          </span>
          <span className="iso-key">
            <Swatch mark="edge" />
            A pulse: the change travelling along the links
          </span>
        </span>
        <span className="iso-caption">
          A sample product, a motor-controller pod, laid out as seven parts on a fixture plate. Each part is wired to the plan rack: Part,
          Assembly, Revision, Change order and Task. Raise a change on a part and the rack stamps a change order, steps the revision and lights up every part and task the change touches.
        </span>
      </figcaption>
    </figure>
  );
}

function Swatch({ mark }: { mark: "lit" | "raised" | "edge" }) {
  if (mark === "edge")
    return (
      <svg className="iso-swatch" data-mark="edge" viewBox="0 0 16 10" aria-hidden="true">
        <path d="M1.5 5h13" />
      </svg>
    );
  return (
    <svg className="iso-swatch" data-mark={mark} viewBox="0 0 16 10" aria-hidden="true">
      <path d="M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z" />
      <path className="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5" />
    </svg>
  );
}
