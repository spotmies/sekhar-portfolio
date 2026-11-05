"use client";

import * as React from "react";
import {
  clamp01,
  dotRadius,
  idleAt,
  lightFrom,
  moonDots,
  project,
  resist,
  starField,
  tearDecision,
  tiltFrom,
  turnFor,
} from "@/components/ui/lunar-boarding-pass";
import { openplan } from "@/data/portfolio";

/**
 * OpenPlan boarding pass, adapted from ui/lunar-boarding-pass (halftone Moon,
 * flip, tear-off stub). Front: the product diagram; back: the boarding pass.
 * Landscape when the container is ≥ 720px wide, a vertical ticket below that.
 */

type Side = "front" | "back";
const T = openplan.ticket;
const L = T.labels;
const NODES = openplan.visual.diagram;
const ACCENT_NODE = 3; // "Change order"
const CAPS = openplan.capabilities.map((c) => c.title);

// The front is dark in both themes, so its colours are fixed (canvas needs real hex).
const NIGHT = "#1c1917"; // stone-900 (site --foreground / dark --card)
const INK = "#fafaf9"; // site --background
const LAT = 0.67416; // decorative landing marker on the Moon
const LON = 23.47314;

const VIEW_W = 1000;
const VIEW_H = 360;
const STARS = starField(2026, 110, 240, 990, 10, 350);
const P_STARS = starField(7, 60, 0, 400, 0, 600);

type Geom = (w: number, h: number) => { cx: number; cy: number; r: number };
const LAND_MOON: Geom = (w, h) => ({ cx: w * 0.235, cy: h * 0.6, r: w * 0.566 });
const PORT_MOON: Geom = (w, h) => ({ cx: w - h * 0.32, cy: h * 0.62, r: h * 0.72 });

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The halftone Moon on a canvas, lit from the pointer (or a slow idle sway). */
function useMoon(
  ref: React.RefObject<HTMLCanvasElement | null>,
  geom: Geom,
  reduced: boolean,
  frontRef: React.RefObject<boolean>,
  pointer: React.RefObject<number[] | null>,
) {
  const redraw = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas && canvas.getContext("2d");
    if (!canvas || !ctx) return;
    let dots: number[] = [];
    let cell = 1;
    let W = 0;
    let H = 0;
    let g = { cx: 0, cy: 0, r: 0 };
    let dpr = 1;
    const turn = turnFor(LON);
    const here = project(LAT, LON + turn);
    let light = lightFrom(idleAt(0), 0.38);
    let raf = 0;
    let visible = true;

    const draw = (pulse: number) => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = INK;
      ctx.beginPath();
      for (let i = 0; i < dots.length; i += 6) {
        const r = dotRadius(dots[i + 5], dots[i + 2], dots[i + 3], dots[i + 4], light, cell);
        if (r < 0.3) continue;
        ctx.moveTo(dots[i] + r, dots[i + 1]);
        ctx.arc(dots[i], dots[i + 1], r, 0, Math.PI * 2);
      }
      ctx.fill();
      if (here[2] > 0.05) {
        const mx = g.cx + g.r * here[0];
        const my = g.cy + g.r * here[1];
        const s = g.r * 0.034;
        ctx.lineWidth = 3.2 * dpr;
        ctx.strokeStyle = NIGHT;
        ctx.beginPath();
        ctx.arc(mx, my, s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1.2 * dpr;
        ctx.strokeStyle = INK;
        ctx.stroke();
        if (pulse > 0) {
          ctx.globalAlpha = 1 - pulse;
          ctx.beginPath();
          ctx.arc(mx, my, s + g.r * 0.1 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    };

    const build = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(canvas.clientWidth * dpr);
      H = Math.round(canvas.clientHeight * dpr);
      if (!W || !H) return; // hidden layout: nothing to draw
      canvas.width = W;
      canvas.height = H;
      g = geom(W, H);
      cell = Math.max(2.1 * dpr, g.r / 36);
      dots = moonDots(g.cx, g.cy, g.r, cell, turn);
      draw(0);
    };

    const target = (t: number) => {
      const p = pointer.current;
      return p ? lightFrom(p[0], p[1]) : lightFrom(idleAt(t), 0.38);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!frontRef.current || !W) return;
      const to = target(now / 1000);
      for (let k = 0; k < 3; k++) light[k] += (to[k] - light[k]) * 0.09;
      const n = Math.hypot(light[0], light[1], light[2]) || 1;
      light = [light[0] / n, light[1] / n, light[2] / n];
      draw(((now / 1000) % 2.4) / 2.4);
    };
    const start = () => {
      if (!raf && visible && !reduced) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    // Reduced motion: no drift or pulse, but the light still follows the pointer.
    redraw.current = () => {
      if (raf) return;
      light = target(0);
      draw(0);
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && canvas.clientWidth > 0;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      redraw.current = () => {};
    };
  }, [ref, geom, reduced, frontRef, pointer]);
  return redraw;
}

const CSS = `
.opt{--paper:#e7e5e4;--ink:#1c1917;--rule:color-mix(in srgb,#1c1917 40%,transparent);--edge:rgba(250,250,249,.1);--stamp:#4f46e5;--acc:#818cf8;container-type:inline-size;width:100%}
.dark .opt{--paper:#d6d3d1;--edge:rgba(250,250,249,.18)}
.opt-serif{font-family:var(--font-instrument-serif),Georgia,serif;font-weight:400;letter-spacing:-.01em;line-height:1}
.opt-mono{font-family:var(--font-geist-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;line-height:1.1}
.opt-lab{display:block;font-family:var(--font-geist-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;opacity:.7;white-space:nowrap}
.opt-land{display:none}
@container (min-width:720px){.opt-land{display:block}.opt-port{display:none}}

.opt-stage,.opt-pflip{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.opt-stage{position:relative;width:100%;aspect-ratio:${VIEW_W}/${VIEW_H};perspective:1800px;touch-action:pan-y;container-type:inline-size}
.opt-tilt,.opt-flip{position:absolute;inset:0;transform-style:preserve-3d}
.opt-tilt{transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.opt-flip{cursor:pointer;transition:transform 1.05s cubic-bezier(.65,-0.2,.25,1.2)}
.opt-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;filter:drop-shadow(0 12px 18px rgba(0,0,0,.14)) drop-shadow(0 2px 4px rgba(0,0,0,.1))}
.opt-back{transform:rotateY(180deg)}
.opt-night{position:absolute;inset:0;overflow:hidden;border-radius:14px;background:${NIGHT};color:${INK};box-shadow:inset 0 0 0 1px var(--edge)}
.opt-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;max-width:none}
.opt-glow{background:radial-gradient(circle at var(--mx,50%) var(--my,40%),rgba(250,250,249,.1),transparent 42%)}
.opt-grain{opacity:.14;mix-blend-mode:screen}
.opt-piece .opt-grain{opacity:.28;mix-blend-mode:multiply}
.opt-at{position:absolute;white-space:nowrap}
.opt-piece{position:absolute;top:0;bottom:0;overflow:hidden;color:var(--ink);background:linear-gradient(162deg,color-mix(in srgb,var(--paper) 80%,#fff) 0%,var(--paper) 50%,color-mix(in srgb,var(--paper) 90%,#000) 100%)}
.opt-main{left:0;width:77.4%;border-radius:14px 0 0 14px;padding:2.3cqw 2.6cqw 2.1cqw;display:flex;flex-direction:column;
-webkit-mask:radial-gradient(circle at 100% 50%,#0000 .22cqw,#000 .26cqw) 0 0/100% .9cqw repeat-y;mask:radial-gradient(circle at 100% 50%,#0000 .22cqw,#000 .26cqw) 0 0/100% .9cqw repeat-y}
.opt-stub{left:77.4%;width:22.6%;border-radius:0 14px 14px 0;padding:2.3cqw 1.9cqw 2.1cqw;display:flex;flex-direction:column;font:inherit;text-align:left;border:0;margin:0;cursor:grab;touch-action:pan-y;transform-origin:0 100%;transition:transform .75s cubic-bezier(.2,.9,.25,1.25);
-webkit-mask:radial-gradient(circle at 0 50%,#0000 .22cqw,#000 .26cqw) 0 0/100% .9cqw repeat-y;mask:radial-gradient(circle at 0 50%,#0000 .22cqw,#000 .26cqw) 0 0/100% .9cqw repeat-y}
.opt-stub:active{cursor:grabbing}
.opt-stub:focus-visible,.opt-pstub:focus-visible{outline:2px solid var(--stamp);outline-offset:-4px}
.opt-stub.is-torn{transform:translate(1.6cqw,1cqw) rotate(3deg);cursor:pointer}
.opt-foil{background:linear-gradient(115deg,transparent calc(var(--mx,50%) - 24%),rgba(255,255,255,.6) var(--mx,50%),transparent calc(var(--mx,50%) + 24%)) no-repeat;mix-blend-mode:soft-light}
.opt-main .opt-foil{background-size:129.2% 100%}
.opt-stub .opt-foil{background-size:442.5% 100%;background-position:100% 0}
.opt-head{display:flex;align-items:baseline;justify-content:space-between;gap:1.5cqw;padding-bottom:1cqw;border-bottom:1px solid var(--rule)}
.opt-grid{display:grid;grid-template-columns:1.1fr 1fr .8fr;border-bottom:1px solid var(--rule)}
.opt-cell{padding:1.1cqw 1.2cqw 1.1cqw 0;min-width:0}
.opt-cell+.opt-cell,.opt-grid>:nth-child(5),.opt-grid>:nth-child(6){border-left:1px solid var(--rule);padding-left:1.2cqw}
.opt-grid>:nth-child(4){border-left:0;padding-left:0}
.opt-grid>:nth-child(n+4){border-top:1px solid var(--rule)}
.opt-row{display:flex;gap:2.4cqw}
.opt-foot{flex:1;display:flex;align-items:center;gap:2cqw;padding-top:1.1cqw}
.opt-sf{display:block;margin-top:1.4cqw;min-width:0}
.opt-l{font-size:max(9px,.72cqw);margin-bottom:.5cqw}
.opt-v{display:block;font-family:var(--font-geist-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.02em;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.opt-stamp{position:absolute;left:31%;top:54%;padding:.35cqw;border:.2cqw solid var(--stamp);border-radius:.45cqw;color:var(--stamp);opacity:0;transform:rotate(-8deg);pointer-events:none;mix-blend-mode:multiply}
.opt-stamp>span{display:block;padding:.45cqw 1.1cqw;border:.08cqw solid var(--stamp);border-radius:.25cqw;text-align:center}
.is-torn .opt-stamp{opacity:.88;animation:opt-stamp .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes opt-stamp{0%{opacity:0;transform:rotate(-4deg) scale(1.9)}100%{opacity:.88;transform:rotate(-8deg) scale(1)}}
.opt-hint{position:absolute;left:77.4%;bottom:1.6cqw;transform:translateX(-50%) rotate(180deg);writing-mode:vertical-rl;font-family:var(--font-geist-mono),monospace;font-size:max(8px,.55cqw);letter-spacing:.3em;text-transform:uppercase;color:var(--ink);opacity:.5;pointer-events:none;white-space:nowrap;transition:opacity .3s}
.is-torn .opt-hint{opacity:0}
.opt-printed .opt-v{animation:opt-type .8s steps(14,end) both}
@keyframes opt-type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.opt-caps{left:25.6%;right:3%;bottom:8%;display:flex;justify-content:space-between;gap:1.5cqw;font-size:max(9px,.9cqw);opacity:.85}
@container (max-width:940px){.opt-caps{display:grid;grid-template-columns:1fr 1fr;gap:.9cqw 2cqw;bottom:7%}}
.opt-tw{animation:opt-tw 3.4s ease-in-out infinite}
@keyframes opt-tw{0%,100%{opacity:1}50%{opacity:.2}}

/* vertical ticket (< 720px container) */
.opt-pflip{display:grid;transform-style:preserve-3d;transition:transform 1.05s cubic-bezier(.65,-0.2,.25,1.2);cursor:pointer;perspective:1800px}
.opt-pface{grid-area:1/1;position:relative;backface-visibility:hidden;-webkit-backface-visibility:hidden;filter:drop-shadow(0 10px 16px rgba(0,0,0,.14))}
.opt-pface.opt-back{transform:rotateY(180deg)}
.opt-pnight{position:relative;height:100%;overflow:hidden;border-radius:14px;background:${NIGHT};color:${INK};box-shadow:inset 0 0 0 1px var(--edge)}
.opt-pback{display:flex;flex-direction:column;height:100%}
.opt-pmain,.opt-pstub{position:relative;overflow:hidden;color:var(--ink);background:linear-gradient(170deg,color-mix(in srgb,var(--paper) 80%,#fff) 0%,var(--paper) 50%,color-mix(in srgb,var(--paper) 90%,#000) 100%)}
.opt-pmain{flex:1;border-radius:14px 14px 0 0;padding:18px 18px 16px;
-webkit-mask:radial-gradient(circle at 50% 100%,#0000 3px,#000 3.5px) 0 0/10px 100% repeat-x;mask:radial-gradient(circle at 50% 100%,#0000 3px,#000 3.5px) 0 0/10px 100% repeat-x}
.opt-pstub{width:100%;border-radius:0 0 14px 14px;padding:16px 18px 18px;font:inherit;text-align:left;border:0;margin:0;cursor:pointer;transition:transform .75s cubic-bezier(.2,.9,.25,1.25);transform-origin:0 0;
-webkit-mask:radial-gradient(circle at 50% 0,#0000 3px,#000 3.5px) 0 0/10px 100% repeat-x;mask:radial-gradient(circle at 50% 0,#0000 3px,#000 3.5px) 0 0/10px 100% repeat-x}
.opt-pstub.is-torn{transform:translateY(12px) rotate(-2.5deg)}
.opt-pgrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--rule)}
.opt-pgrid>*{padding:10px 10px 10px 0;border-bottom:1px solid var(--rule);min-width:0}
.opt-pgrid>:nth-child(even){border-left:1px solid var(--rule);padding-left:10px}
.opt-pmain .opt-stamp{left:auto;right:14px;top:auto;bottom:18px;border-width:2px;padding:3px;border-radius:5px}
.opt-pmain .opt-stamp>span{padding:4px 10px;border-width:1px;border-radius:3px}

@media (prefers-reduced-motion: reduce){.opt-tilt,.opt-flip,.opt-pflip,.opt-stub,.opt-pstub{transition-duration:.01ms}.opt-tw,.opt-v,.opt-stamp{animation:none!important}}
`;

function Grain({ id }: { id: string }) {
  return (
    <svg className="opt-layer opt-grain" aria-hidden="true">
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={"url(#" + id + ")"} />
    </svg>
  );
}

function Star({ size }: { size: string }) {
  const p: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 ? 0.34 : 1;
    p.push(Math.round((12 + Math.cos(a) * r * 11) * 100) / 100 + "," + Math.round((12 + Math.sin(a) * r * 11) * 100) / 100);
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-0.1em" }}>
      <polygon points={p.join(" ")} fill="currentColor" />
    </svg>
  );
}

function Field({ label, value, size, d, px }: { label: string; value: string; size: number; d?: number; px?: boolean }) {
  return (
    <span style={{ display: "block", minWidth: 0 }}>
      <span className={"opt-lab" + (px ? "" : " opt-l")} style={px ? { fontSize: 9, marginBottom: 4 } : undefined}>
        {label}
      </span>
      <span className="opt-v" style={{ fontSize: px ? size : `max(11px, ${size}cqw)`, animationDelay: (d || 0) + "s", ...(px ? { whiteSpace: "normal", lineHeight: 1.35 } : null) }}>
        {value}
      </span>
    </span>
  );
}

/** Part → Assembly → Revision → Change order → Task, engraved on the night side. */
function Diagram() {
  const w = 118;
  const gap = 31;
  const x0 = 256;
  const y = 150;
  const h = 50;
  return (
    <g>
      {NODES.map((n, i) => {
        const x = x0 + i * (w + gap);
        const acc = i === ACCENT_NODE;
        return (
          <g key={n}>
            <rect x={x} y={y} width={w} height={h} rx={9} fill={acc ? "var(--acc)" : "rgba(250,250,249,.04)"} stroke={acc ? "var(--acc)" : INK} strokeOpacity={acc ? 1 : 0.55} strokeWidth={1} />
            <text x={x + w / 2} y={y + h / 2 + 4.5} textAnchor="middle" fontSize={12.5} letterSpacing={0.6} fill={acc ? NIGHT : INK} style={{ fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase", fontWeight: acc ? 600 : 400 }}>
              {n}
            </text>
            {i < NODES.length - 1 && (
              <g stroke={INK} strokeOpacity={0.6} strokeWidth={1} fill="none">
                <path d={`M${x + w + 5} ${y + h / 2} H${x + w + gap - 6}`} />
                <path d={`M${x + w + gap - 10} ${y + h / 2 - 3.5} L${x + w + gap - 6} ${y + h / 2} L${x + w + gap - 10} ${y + h / 2 + 3.5}`} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function OpenPlanTicket() {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const [turns, setTurns] = React.useState(0);
  const side: Side = turns % 2 ? "back" : "front";
  const front = side === "front";
  const [printed, setPrinted] = React.useState(false);
  const [torn, setTorn] = React.useState(false);
  const reduced = React.useSyncExternalStore(subscribeMotion, getMotion, () => false);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const tiltRef = React.useRef<HTMLDivElement>(null);
  const landMoon = React.useRef<HTMLCanvasElement>(null);
  const portMoon = React.useRef<HTMLCanvasElement>(null);
  const pointer = React.useRef<number[] | null>(null);
  const noPointer = React.useRef<number[] | null>(null);
  const frontRef = React.useRef(true);
  React.useEffect(() => {
    frontRef.current = front;
  }, [front]);
  const drag = React.useRef<{ x: number; t: number; dx: number; v: number; moved: boolean } | null>(null);
  const swallowClick = React.useRef(false);

  const redrawLand = useMoon(landMoon, LAND_MOON, reduced, frontRef, pointer);
  useMoon(portMoon, PORT_MOON, reduced, frontRef, noPointer);

  const flip = () => {
    if (front) setPrinted(true);
    setTurns((t) => t + 1);
  };
  const show = (s: Side) => {
    if (s !== side) flip();
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    const t = tiltRef.current;
    if (!el || !t) return;
    const r = el.getBoundingClientRect();
    const px = clamp01((e.clientX - r.left) / r.width);
    const py = clamp01((e.clientY - r.top) / r.height);
    t.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    t.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    if (!reduced && e.pointerType === "mouse") {
      const a = tiltFrom(px, py, 5);
      t.style.setProperty("--rx", a[0].toFixed(2) + "deg");
      t.style.setProperty("--ry", a[1].toFixed(2) + "deg");
    }
    pointer.current = [px, py];
    redrawLand.current();
  };
  const onLeave = () => {
    const t = tiltRef.current;
    if (t) {
      t.style.setProperty("--rx", "0deg");
      t.style.setProperty("--ry", "0deg");
    }
    pointer.current = null;
    redrawLand.current();
  };

  const stubDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (torn || e.button !== 0) return;
    drag.current = { x: e.clientX, t: performance.now(), dx: 0, v: 0, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const stubMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const el = e.currentTarget;
    if (!d) return;
    const now = performance.now();
    const dx = Math.max(0, e.clientX - d.x);
    d.v = (dx - d.dx) / Math.max(1, now - d.t);
    d.t = now;
    d.dx = dx;
    if (dx > 4) d.moved = true;
    const w = el.offsetWidth;
    const shown = resist(dx, w);
    el.style.transition = "none";
    el.style.transform = `translateX(${shown.toFixed(1)}px) rotate(${((shown / Math.max(1, w)) * 7).toFixed(2)}deg)`;
  };
  const stubUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const el = e.currentTarget;
    drag.current = null;
    if (!d) return;
    el.style.transition = "";
    el.style.transform = "";
    if (d.moved) {
      swallowClick.current = true;
      if (tearDecision(d.dx, d.v, el.offsetWidth)) setTorn(true);
    }
  };
  const stubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    setTorn((v) => !v);
  };
  const stubProps = {
    type: "button" as const,
    tabIndex: front ? -1 : 0,
    "aria-pressed": torn,
    "aria-label": torn ? L.reattach : L.tearAction,
    onPointerDown: stubDown,
    onPointerMove: stubMove,
    onPointerUp: stubUp,
    onPointerCancel: stubUp,
    onClick: stubClick,
  };

  const at = (x: number, y: number): React.CSSProperties => ({ left: x / 10 + "%", top: (y / VIEW_H) * 100 + "%" });
  const flipStyle = { transform: `rotateY(${turns * 180}deg)` };
  const stamp = (
    <div className="opt-stamp" aria-hidden="true">
      <span>
        <span className="opt-mono" style={{ display: "block", fontSize: "max(12px, 1.7cqw)", letterSpacing: ".14em", fontWeight: 600 }}>
          {T.stamp}
        </span>
        <span className="opt-mono" style={{ display: "block", fontSize: "max(8px, .7cqw)", marginTop: ".35em" }}>
          {T.site}
        </span>
      </span>
    </div>
  );
  const backCls = "opt-back" + (printed ? " opt-printed" : "") + (torn ? " is-torn" : "");

  return (
    <div className="opt">
      <style>{CSS}</style>

      {/* ---------------- landscape ---------------- */}
      <div className="opt-land">
        <div ref={stageRef} className="opt-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
          <div ref={tiltRef} className="opt-tilt">
            <div className="opt-flip" style={flipStyle} onClick={flip}>
              <div className="opt-face" aria-hidden={!front}>
                <div className="opt-night">
                  <div className="opt-layer" style={{ width: "22.6%" }}>
                    <canvas ref={landMoon} className="opt-layer" aria-hidden="true" />
                  </div>
                  <svg className="opt-layer" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
                    {STARS.map((s, i) => (
                      <circle key={i} cx={s[0]} cy={s[1]} r={s[2]} fill={INK} opacity={0.8} className={s[3] ? "opt-tw" : undefined} style={s[3] ? { animationDelay: s[4] + "s" } : undefined} />
                    ))}
                    <line x1={226} x2={226} y1={0} y2={VIEW_H} stroke={INK} strokeWidth={1} strokeDasharray="3 3.5" opacity={0.6} />
                    <Diagram />
                  </svg>
                  <Grain id={uid + "gf"} />
                  <div className="opt-layer opt-glow" />

                  <div className="opt-at opt-mono" style={{ ...at(22, 26), fontSize: "max(11px, 1.15cqw)", display: "flex", alignItems: "center", gap: ".5em" }}>
                    <Star size="1em" />
                    {T.tier}
                  </div>
                  <div className="opt-at opt-serif" style={{ left: "2.2%", bottom: "7%", fontSize: "2.6cqw", whiteSpace: "normal", width: "17%", textShadow: `0 0 .5cqw ${NIGHT}, 0 0 1.2cqw ${NIGHT}` }}>
                    {T.passenger}
                  </div>
                  <div className="opt-at opt-serif" style={{ ...at(256, 22), fontSize: "3.6cqw" }}>
                    {openplan.title}
                  </div>
                  <div className="opt-at opt-mono" style={{ right: "3%", top: (30 / VIEW_H) * 100 + "%", fontSize: "max(11px, 1.15cqw)" }}>
                    {T.date}
                  </div>
                  <div className="opt-at opt-mono opt-caps">
                    {CAPS.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={"opt-face " + backCls} aria-hidden={front}>
                <div className={"opt-piece opt-main" + (torn ? " is-torn" : "")}>
                  <Grain id={uid + "gm"} />
                  <div className="opt-layer opt-foil" />
                  <div className="opt-head">
                    <span className="opt-mono" style={{ fontSize: "max(11px, 1.3cqw)", fontWeight: 600 }}>{L.pass}</span>
                    <span className="opt-serif" style={{ fontSize: "3cqw" }}>{openplan.title}</span>
                    <span className="opt-mono" style={{ fontSize: "max(11px, 1.3cqw)", fontWeight: 600 }}>{T.tier}</span>
                  </div>
                  <div className="opt-grid">
                    <div className="opt-cell"><Field label={L.passenger} value={T.passenger} size={1.45} d={0.1} /></div>
                    <div className="opt-cell"><Field label={L.modules} value={T.modules} size={1.45} d={0.25} /></div>
                    <div className="opt-cell"><Field label={L.since} value={T.since} size={1.45} d={0.4} /></div>
                    <div className="opt-cell opt-row">
                      <Field label={L.from} value={T.from} size={1.3} d={0.55} />
                      <Field label={L.to} value={T.to} size={1.3} d={0.65} />
                    </div>
                    <div className="opt-cell"><Field label={L.status} value={T.status} size={1.3} d={0.75} /></div>
                    <div className="opt-cell"><Field label={L.site} value={T.site} size={1.3} d={0.85} /></div>
                  </div>
                  <div className="opt-foot">
                    <div style={{ minWidth: 0, flex: "0 0 40%" }}>
                      <span className="opt-lab opt-l">{L.route}</span>
                      <span className="opt-v" style={{ fontSize: "max(10px, 1.1cqw)", animationDelay: "1s" }}>{NODES.slice(0, 3).join(" → ")}</span>
                      <span className="opt-v" style={{ fontSize: "max(10px, 1.1cqw)", marginTop: ".4cqw", animationDelay: "1.1s" }}>→ {NODES.slice(3).join(" → ")}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                      <div className="opt-serif" style={{ fontSize: "3.6cqw", whiteSpace: "nowrap" }}>{T.headline}</div>
                    </div>
                  </div>
                  {stamp}
                </div>
                <button {...stubProps} className={"opt-piece opt-stub" + (torn ? " is-torn" : "")}>
                  <Grain id={uid + "gs"} />
                  <span className="opt-layer opt-foil" />
                  <span className="opt-mono" style={{ display: "block", fontSize: "max(11px, 1.3cqw)", fontWeight: 600, paddingBottom: "1cqw", borderBottom: "1px solid var(--rule)" }}>
                    {L.pass}
                  </span>
                  <span className="opt-sf"><Field label={L.passenger} value={T.passenger} size={1.2} d={0.3} /></span>
                  <span className="opt-sf opt-row" style={{ gap: "1.6cqw" }}>
                    <Field label={L.from} value={T.from} size={1.1} d={0.45} />
                  </span>
                  <span className="opt-sf"><Field label={L.to} value={T.to} size={1.1} d={0.55} /></span>
                  <span className="opt-sf"><Field label={L.modules} value={T.modules} size={1.1} d={0.65} /></span>
                  <span className="opt-sf"><Field label={L.site} value={T.site} size={1.1} d={0.75} /></span>
                </button>
                <span className="opt-hint" aria-hidden="true">{L.tear}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- vertical (phones) ---------------- */}
      <div className="opt-port">
        <div className="opt-pflip" style={flipStyle} onClick={flip}>
          <div className="opt-pface" aria-hidden={!front}>
            <div className="opt-pnight">
              <svg className="opt-layer" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                {P_STARS.map((s, i) => (
                  <circle key={i} cx={s[0]} cy={s[1]} r={s[2]} fill={INK} opacity={0.7} className={s[3] ? "opt-tw" : undefined} style={s[3] ? { animationDelay: s[4] + "s" } : undefined} />
                ))}
              </svg>
              <Grain id={uid + "pf"} />
              <div style={{ position: "relative", height: 136 }}>
                <canvas ref={portMoon} className="opt-layer" aria-hidden="true" />
                <div className="opt-mono" style={{ position: "absolute", left: 18, top: 18, fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size="1em" />
                  {T.tier}
                </div>
                <div className="opt-serif" style={{ position: "absolute", left: 18, bottom: 16, fontSize: 24, textShadow: `0 0 4px ${NIGHT}, 0 0 10px ${NIGHT}` }}>
                  {T.passenger}
                </div>
              </div>
              <div style={{ position: "relative", borderTop: `1px dashed rgba(250,250,249,.55)`, padding: "18px 18px 20px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span className="opt-serif" style={{ fontSize: 30 }}>{openplan.title}</span>
                  <span className="opt-mono" style={{ fontSize: 10, opacity: 0.85 }}>{T.date}</span>
                </div>
                <ol style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {NODES.map((n, i) => {
                    const acc = i === ACCENT_NODE;
                    return (
                      <li key={n} style={{ display: "grid", justifyItems: "start", gap: 6 }}>
                        <span className="opt-mono" style={{ fontSize: 11, padding: "8px 12px", borderRadius: 8, border: `1px solid ${acc ? "var(--acc)" : "rgba(250,250,249,.5)"}`, background: acc ? "var(--acc)" : "rgba(250,250,249,.04)", color: acc ? NIGHT : INK, fontWeight: acc ? 600 : 400, marginLeft: i * 10 }}>
                          {n}
                        </span>
                        {i < NODES.length - 1 && (
                          <span aria-hidden="true" style={{ marginLeft: i * 10 + 14, fontSize: 11, opacity: 0.6, lineHeight: 1 }}>↓</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <ul className="opt-mono" style={{ margin: "18px 0 0", padding: "14px 0 0", listStyle: "none", borderTop: "1px solid rgba(250,250,249,.18)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", fontSize: 10, opacity: 0.85 }}>
                  {CAPS.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className={"opt-pface " + backCls} aria-hidden={front}>
            <div className="opt-pback">
              <div className={"opt-pmain" + (torn ? " is-torn" : "")}>
                <Grain id={uid + "pm"} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span className="opt-mono" style={{ fontSize: 11, fontWeight: 600 }}>{L.pass}</span>
                  <span className="opt-mono" style={{ fontSize: 11, fontWeight: 600 }}>{T.tier}</span>
                </div>
                <div className="opt-serif" style={{ fontSize: 28, margin: "12px 0 14px" }}>{openplan.title}</div>
                <div className="opt-pgrid">
                  <Field px label={L.passenger} value={T.passenger} size={12} d={0.1} />
                  <Field px label={L.modules} value={T.modules} size={12} d={0.2} />
                  <Field px label={L.from} value={T.from} size={12} d={0.3} />
                  <Field px label={L.to} value={T.to} size={12} d={0.4} />
                  <Field px label={L.status} value={T.status} size={12} d={0.5} />
                  <Field px label={L.since} value={T.since} size={12} d={0.6} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <span className="opt-lab" style={{ fontSize: 9, marginBottom: 4 }}>{L.route}</span>
                  <span className="opt-mono" style={{ display: "block", fontSize: 10.5, lineHeight: 1.5, textTransform: "uppercase" }}>{NODES.join(" → ")}</span>
                </div>
                <div className="opt-serif" style={{ fontSize: 24, marginTop: 16, marginBottom: 44 }}>{T.headline}</div>
                {stamp}
              </div>
              <button {...stubProps} className={"opt-pstub" + (torn ? " is-torn" : "")}>
                <Grain id={uid + "ps"} />
                <span style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end" }}>
                  <Field px label={L.passenger} value={T.passenger} size={12} d={0.7} />
                  <Field px label={L.site} value={T.site} size={12} d={0.8} />
                </span>
                <span className="opt-lab" style={{ fontSize: 9, marginTop: 12, opacity: 0.55 }}>✂ {L.tear}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4 sm:gap-6" role="group" aria-label={L.sides}>
        {(["front", "back"] as Side[]).map((s, i) => (
          <button
            key={s}
            type="button"
            aria-pressed={side === s}
            onClick={() => show(s)}
            className={
              "flex min-h-11 items-center gap-2 font-mono text-[11px] tracking-[0.12em] whitespace-nowrap uppercase transition-colors sm:tracking-[0.2em] " +
              (side === s ? "text-foreground" : "text-muted hover:text-foreground")
            }
          >
            <span className={"h-px bg-current transition-all duration-500 motion-reduce:transition-none " + (side === s ? "w-6" : "w-2 opacity-50")} />
            <span>0{i + 1}</span>
            <span>{T.sideLabels[i]}</span>
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {front
          ? `${openplan.title}. ${openplan.visual.diagramDescription}`
          : `${L.pass}: ${T.passenger}, ${L.from.toLowerCase()} ${T.from} ${L.to.toLowerCase()} ${T.to}. ${T.modules}. ${T.status}. ${T.site}.` +
            (torn ? ` ${T.stamp}.` : "")}
      </p>
    </div>
  );
}
