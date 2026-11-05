"use client"

// Adapted from the features section of ink-orbit-saas-template: a bento of
// three live diagrams. This copy is changed for the portfolio:
// - colours, fonts and light/dark come from the site's tokens (globals.css),
//   so there is no theme prop; the accent marks the live parts
// - no hatched page, header or panel of its own: it sits inside <Section>
// - every visible word is a prop (the content lives in data/portfolio.ts)
// - each copy block takes an optional number, drawn mono in the accent
// - the brand glyph is a neutral three-node mark
//
// No dependencies, no assets. React is the only import.

import React from "react"

export type InkFeatureCopy = { number?: string; title: string; description: string }

export type InkOrbitFeaturesProps = {
  /** Wide card: people → hub → a stack of outputs that keeps growing. */
  flow: {
    label: string // aria-label of the diagram
    hub: string // hub chip text (uppercased)
    people: string[] // up to 5 hover labels; the 5th is drawn as idle
    output: string // "SESSION" → "SESSION #128"
    left: InkFeatureCopy
    right: InkFeatureCopy
  }
  /** Hub with four parts, lit one at a time. */
  parts: InkFeatureCopy & {
    label: string
    items: string[] // 4
    verb: string // "adding" → "adding · memory"
    idle: string // shown when nothing is lit (reduced motion)
  }
  /** Line chart you can scrub, with a projected tail. Shows no numbers. */
  chart: InkFeatureCopy & {
    label: string
    values: number[]
    projectedFrom: number
    point: string // "wk" → "wk 3"
    projected: string // marker and tooltip after projectedFrom
  }
  className?: string
}

/* ------------------------------------------------------------------ logic */

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

// Smooth line + closed area through values, inside a w×h box.
function chartPaths(values: number[], w: number, h: number, pad: number) {
  const n = values.length
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map(
    (v, i) =>
      [pad + (n < 2 ? 0 : (i / (n - 1)) * (w - pad * 2)), h - pad - ((v - lo) / span) * (h - pad * 2)] as [number, number],
  )
  let line = ""
  pts.forEach(([x, y], i) => {
    if (i === 0) {
      line = "M" + x.toFixed(1) + "," + y.toFixed(1)
      return
    }
    const [px, py] = pts[i - 1]
    const cx = (px + x) / 2
    line +=
      " C" + cx.toFixed(1) + "," + py.toFixed(1) + " " + cx.toFixed(1) + "," + y.toFixed(1) + " " + x.toFixed(1) + "," + y.toFixed(1)
  })
  const area = n
    ? line + " L" + pts[n - 1][0].toFixed(1) + "," + (h - pad) + " L" + pts[0][0].toFixed(1) + "," + (h - pad) + " Z"
    : ""
  return { line, area, points: pts }
}

function nearestIndex(xs: number[], x: number): number {
  let best = 0
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i
  return best
}

/* -------------------------------------------------------------- component */

export default function InkOrbitFeatures({ flow, parts, chart, className = "" }: InkOrbitFeaturesProps) {
  const uid = "ib" + React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(motion.matches)
    sync()
    motion.addEventListener?.("change", sync)
    return () => motion.removeEventListener?.("change", sync)
  }, [])

  const [featRef, featIn] = useInView(0.12)

  // Load timing (step P): everything that moves runs only while the bento is on screen. CSS animations
  // pause via [data-paused], SMIL packets via pauseAnimations(), timers via `live` below.
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = React.useState(false)
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "100px 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  React.useEffect(() => {
    rootRef.current?.querySelectorAll("svg").forEach((s) => {
      if (onScreen) s.unpauseAnimations?.()
      else s.pauseAnimations?.()
    })
  }, [onScreen])
  const live = onScreen && !reduced

  return (
    <div ref={rootRef} className={"ib-root " + className} data-paused={onScreen ? undefined : ""}>
      <style>{IB_CSS}</style>
      <div className="ib-shell">
        <div className="ib-reveal" ref={featRef as never} data-in={featIn}>
          <div className="ib-bento">
            <FlowCard flow={flow} uid={uid} reduced={reduced} inView={featIn && onScreen} />
            <PartsCard copy={parts} reduced={reduced} live={live} />
            <ChartCard copy={chart} uid={uid} reduced={reduced} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- pieces */

// true once the element has been on screen
function useInView(threshold = 0.2) {
  const ref = React.useRef(null as HTMLElement | null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, threshold])
  return [ref, inView] as const
}

function Brackets() {
  return (
    <>
      <span className="ib-c ib-c-tl" aria-hidden="true" />
      <span className="ib-c ib-c-tr" aria-hidden="true" />
      <span className="ib-c ib-c-bl" aria-hidden="true" />
      <span className="ib-c ib-c-br" aria-hidden="true" />
    </>
  )
}

function Copy({ copy }: { copy: InkFeatureCopy }) {
  return (
    <div className="ib-copy">
      {copy.number && <span className="ib-num">{copy.number}</span>}
      <h3>{copy.title}</h3>
      <p>{copy.description}</p>
    </div>
  )
}

function Mark({ size = 18 }: { size?: number }) {
  // neutral glyph: three linked nodes
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M6.5 7.5 12 16.5M17.5 7.5 12 16.5M7.5 6h9" />
      </g>
      <circle cx="5.5" cy="6" r="2.6" fill="currentColor" />
      <circle cx="18.5" cy="6" r="2.6" fill="currentColor" />
      <circle cx="12" cy="18" r="2.6" fill="var(--ib-accent)" />
    </svg>
  )
}

/* drawn portraits — greyscale, so they sit in the palette */
const PORTRAITS = [
  { hair: "short", beard: true, glasses: false, skin: "#b9b4ae", hairC: "#2b2a29", shirt: "#3a3a3a", bg: "#d9d6d2" },
  { hair: "long", beard: false, glasses: false, skin: "#d6d0c9", hairC: "#8d7f6c", shirt: "#7b7b7b", bg: "#e6e3df" },
  { hair: "buzz", beard: false, glasses: true, skin: "#a7a19a", hairC: "#3d3c3a", shirt: "#1f1f1f", bg: "#cfcfcf" },
  { hair: "bun", beard: false, glasses: true, skin: "#9a8f84", hairC: "#1e1d1c", shirt: "#5a5a5a", bg: "#dedbd6" },
  { hair: "curly", beard: false, glasses: false, skin: "#7f746a", hairC: "#1a1918", shirt: "#8a8a8a", bg: "#d3d0cb" },
  { hair: "side", beard: true, glasses: true, skin: "#c7c0b8", hairC: "#5b5650", shirt: "#2c2c2c", bg: "#e1ded9" },
]

function Portrait({ index, size = 38, uid }: { index: number; size?: number; uid: string }) {
  const p = PORTRAITS[((index % PORTRAITS.length) + PORTRAITS.length) % PORTRAITS.length]
  const id = uid + "pt" + index
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg} />
          <stop offset="1" stopColor="#9d9a96" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={"url(#" + id + ")"} />
      {p.hair === "long" && <path d="M18 30c0-12 6-19 14-19s14 7 14 19v20H18z" fill={p.hairC} />}
      {p.hair === "curly" &&
        [[22, 20], [28, 15], [36, 15], [42, 20], [45, 28], [19, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill={p.hairC} />)}
      <path d="M8 64c2-12 12-18 24-18s22 6 24 18z" fill={p.shirt} />
      <rect x="27.5" y="36" width="9" height="11" rx="3" fill={p.skin} />
      <path d="M27.5 44c3 2.5 6 2.5 9 0v3h-9z" fill="#000" opacity=".12" />
      <ellipse cx="32" cy="28" rx="11" ry="13" fill={p.skin} />
      {p.hair === "short" && <path d="M21 25c0-9 5-13 11-13s11 4 11 13c-2-4-6-6-11-6s-9 2-11 6z" fill={p.hairC} />}
      {p.hair === "buzz" && <path d="M21.5 24c.5-8 5-11.5 10.5-11.5S42 16 42.5 24c-3-3-6.5-4-10.5-4s-7.5 1-10.5 4z" fill={p.hairC} opacity=".85" />}
      {p.hair === "bun" && (
        <>
          <circle cx="32" cy="11" r="6" fill={p.hairC} />
          <path d="M21 26c0-10 5-14 11-14s11 4 11 14c-2-5-6-7.5-11-7.5S23 21 21 26z" fill={p.hairC} />
        </>
      )}
      {p.hair === "long" && <path d="M21 27c0-10 5-15 11-15s11 5 11 15c-3-6-8-8-14-7-3 .5-6 3-8 7z" fill={p.hairC} />}
      {p.hair === "side" && <path d="M21 26c-1-9 5-14 12-14 6 0 11 4 10 12-4-5-10-6-17-3-2 1-4 3-5 5z" fill={p.hairC} />}
      {p.beard && <path d="M21.5 30c1 9 5 12 10.5 12s9.5-3 10.5-12c-2 4-5 5-10.5 5s-8.5-1-10.5-5z" fill={p.hairC} opacity=".9" />}
      <circle cx="27.5" cy="28" r="1.2" fill="#1a1a1a" />
      <circle cx="36.5" cy="28" r="1.2" fill="#1a1a1a" />
      {p.glasses && (
        <g fill="none" stroke="#1a1a1a" strokeWidth="1.1">
          <circle cx="27.5" cy="28" r="3.6" />
          <circle cx="36.5" cy="28" r="3.6" />
          <path d="M31.1 28h1.8" />
        </g>
      )}
      <path d="M29 34.5c1.8 1.2 4.2 1.2 6 0" fill="none" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" opacity=".7" />
    </svg>
  )
}

function ToolGlyph({ index }: { index: number }) {
  const k = index % 4
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {k === 0 && (
        <>
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <path d="M-6 -2h12M-6 2h12M-1.5 -6v12" />
        </>
      )}
      {k === 1 && <path d="M-6.5 4 -2 -5h4l4.5 9zm2.4 0h9.2M-2 -5l4.5 9" />}
      {k === 2 && (
        <>
          <path d="M-4.5 -6.5h6l3 3v10h-9z" />
          <path d="M-2 0h4.5M-2 3h4.5" />
        </>
      )}
      {k === 3 && (
        <>
          <circle cx="-1" cy="-1" r="4.5" />
          <path d="M2.4 2.4 6 6" />
        </>
      )}
    </g>
  )
}

const TEAM_POS = [
  { x: 58, y: 38 },
  { x: 104, y: 22 },
  { x: 150, y: 40 },
  { x: 46, y: 92 },
  { x: 146, y: 114 },
]

function FlowCard({ flow, uid, reduced, inView }: { flow: InkOrbitFeaturesProps["flow"]; uid: string; reduced: boolean; inView: boolean }) {
  const [count, setCount] = React.useState(128)
  const [side, setSide] = React.useState("" as "" | "left" | "right")
  React.useEffect(() => {
    if (reduced || !inView) return
    const t = setInterval(() => setCount((n) => n + 1), 2800)
    return () => clearInterval(t)
  }, [reduced, inView])
  const team = TEAM_POS.slice(0, flow.people.length).map((p, i) => ({ ...p, name: flow.people[i] }))
  const L1 = "M117,67 C196,67 210,100 262,100" // out of the team node …
  const L2 = "M117,73 C186,73 206,120 262,120" // … into the hub chip
  const R1 = "M378,100 C412,100 418,86 450,86" // hub → front sheet
  const R2 = "M378,120 C412,120 418,134 450,134"
  const chip = flow.hub.toUpperCase()
  const chipLong = chip.length * 6.7 > 58 // ~6.7px per char at 8.5px + 1.4 tracking
  const rays = uid + "rays"
  const glow = uid + "glow"
  return (
    <div className="ib-frame ib-frame-hover ib-wide">
      <Brackets />
      <div className="ib-card" style={{ padding: 0, overflow: "hidden" }}>
        <svg className="ib-diagram" viewBox="0 0 640 178" role="img" aria-label={flow.label}>
          <defs>
            <radialGradient id={glow} cx="320" cy="110" r="190" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--ib-raise)" stopOpacity="1" />
              <stop offset="1" stopColor="var(--ib-raise)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={rays} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ib-line-strong)" stopOpacity=".55" />
              <stop offset="1" stopColor="var(--ib-line-strong)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="640" height="178" fill={"url(#" + glow + ")"} />
          {/* rounded: raw Math.sin output can differ in the last digit between server and browser (hydration mismatch) */}
          {[-62, -38, -14, 14, 38, 62].map((a, i) => {
            const pt = (deg: number) =>
              (320 + Math.sin((deg * Math.PI) / 180) * 260).toFixed(2) + "," + (110 - Math.cos((deg * Math.PI) / 180) * 260).toFixed(2)
            return <path key={i} d={"M320,110 L" + pt(a) + " L" + pt(a + 7) + "Z"} fill={"url(#" + rays + ")"} opacity=".5" />
          })}

          {/* people */}
          <g onMouseEnter={() => setSide("left")} onMouseLeave={() => setSide("")}>
            <rect x="20" y="8" width="170" height="130" fill="transparent" />
            {team.map((m, i) => (
              <line key={"l" + i} x1={m.x} y1={m.y} x2="104" y2="70" stroke="var(--ib-line-strong)" strokeDasharray="2 3" />
            ))}
            <g transform="translate(91,57)">
              <rect width="26" height="26" rx="5" className="ib-node" />
              <g transform="translate(5,5)" style={{ color: "var(--ib-ink)" }}>
                <Mark size={16} />
              </g>
            </g>
            {team.map((m, i) => (
              <g key={i} className="ib-av" tabIndex={0} role="img" aria-label={m.name}>
                <svg x={m.x - 11} y={m.y - 11} width="22" height="22" viewBox="0 0 22 22" overflow="visible">
                  <clipPath id={uid + "avc" + i}>
                    <circle cx="11" cy="11" r="11" />
                  </clipPath>
                  <g clipPath={"url(#" + uid + "avc" + i + ")"}>
                    <Portrait index={i} size={22} uid={uid + "f"} />
                  </g>
                  <circle cx="11" cy="11" r="10.5" fill="none" stroke="var(--ib-paper)" strokeWidth="1.5" />
                </svg>
                <circle
                  cx={m.x + 8}
                  cy={m.y + 8}
                  r="2.6"
                  fill={i === 4 ? "var(--ib-faint)" : "var(--ib-accent)"}
                  stroke="var(--ib-paper)"
                  className={i === 4 ? undefined : "ib-presence"}
                />
                <g className="ib-av-tip" transform={"translate(" + m.x + "," + (m.y - 18) + ")"}>
                  <rect x={-m.name.length * 2.45 - 6} y="-9" width={m.name.length * 4.9 + 12} height="14" rx="2" fill="var(--ib-inv)" />
                  <text x="0" y="1" textAnchor="middle" fontSize="7.5" fill="var(--ib-inv-ink)" fontFamily="var(--ib-sans)">
                    {m.name}
                  </text>
                </g>
              </g>
            ))}
          </g>

          {/* connectors */}
          {[L1, L2].map((d, i) => (
            <path key={d} d={d} className={"ib-flow" + (side === "left" ? " ib-flow-on" : "") + (i ? " ib-dash" : "")} />
          ))}
          {[R1, R2].map((d, i) => (
            <path key={d} d={d} className={"ib-flow" + (side === "right" ? " ib-flow-on" : "") + (i ? " ib-dash" : "")} />
          ))}
          {!reduced &&
            [L1, L2, R1, R2].map((d, i) => (
              <circle key={"p" + i} r="2.2" className="ib-pkt">
                <animateMotion dur={2.2 + (i % 2) * 0.6 + "s"} begin={i * 0.35 + "s"} repeatCount="indefinite" path={d} />
              </circle>
            ))}

          {/* the hub chip */}
          <g transform="translate(262,88)">
            <rect x="-4" y="-4" width="124" height="52" rx="8" fill="none" stroke="var(--ib-line)" className={reduced ? undefined : "ib-glow"} />
            <rect width="116" height="44" rx="6" className="ib-node" style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,.08))" }} />
            <g transform="translate(13,14)" style={{ color: "var(--ib-ink)" }}>
              <Mark size={16} />
            </g>
            {/* 36→94 is all the room before the chevron; a long name is squeezed rather than run into it */}
            <text
              x="36"
              y="26"
              fontSize="8.5"
              letterSpacing="1.4"
              fontWeight="600"
              fill="var(--ib-soft)"
              fontFamily="var(--ib-sans)"
              textLength={chipLong ? 58 : undefined}
              lengthAdjust={chipLong ? "spacingAndGlyphs" : undefined}
            >
              {chip}
            </text>
            <path d="M100 18l4 4-4 4" fill="none" stroke="var(--ib-muted)" strokeWidth="1.3" />
          </g>

          {/* the output stack */}
          <g onMouseEnter={() => setSide("right")} onMouseLeave={() => setSide("")}>
            {[2, 1, 0].map((k) => (
              <g key={count - k} transform={"translate(" + (450 + k * 12) + "," + (40 - k * 10) + ")"} opacity={1 - k * 0.25}>
                <g className={"ib-sheet" + (k === 0 ? " ib-sheet-new" : "")}>
                  <rect width="138" height="102" rx="3" fill="var(--ib-raise)" stroke="var(--ib-line-strong)" />
                  {k === 0 && (
                    <>
                      <text x="10" y="16" fontSize="7" fill="var(--ib-muted)" fontFamily="var(--ib-mono)">
                        {flow.output.toUpperCase() + " #" + count}
                      </text>
                      <rect x="10" y="24" width="64" height="5" rx="1" fill="var(--ib-ink)" opacity=".75" />
                      <rect x="10" y="33" width="92" height="3" rx="1" fill="var(--ib-line-strong)" />
                      <rect x="10" y="39" width="80" height="3" rx="1" fill="var(--ib-line-strong)" />
                      {[18, 26, 14, 30, 22, 34].map((h, j) => (
                        <rect key={j} x={12 + j * 13} y={92 - h} width="8" height={h} fill={j === 5 ? "var(--ib-accent)" : "var(--ib-ink)"} opacity={j === 5 ? 0.9 : 0.25 + j * 0.12} />
                      ))}
                      <path d="M92 64h34M92 72h28M92 80h32" stroke="var(--ib-line-strong)" strokeWidth="2.5" />
                    </>
                  )}
                </g>
              </g>
            ))}
          </g>
        </svg>
        <div className="ib-wide-copy">
          <Copy copy={flow.left} />
          <Copy copy={flow.right} />
        </div>
      </div>
    </div>
  )
}

function PartsCard({ copy, reduced, live }: { copy: InkOrbitFeaturesProps["parts"]; reduced: boolean; live: boolean }) {
  const [hover, setHover] = React.useState(-1)
  const [auto, setAuto] = React.useState(0)
  React.useEffect(() => {
    if (!live || hover >= 0) return
    const t = setInterval(() => setAuto((a) => (a + 1) % 4), 1700)
    return () => clearInterval(t)
  }, [live, hover])
  const on = hover >= 0 ? hover : reduced ? -1 : auto
  const tiles = [
    { x: 66, y: 34 },
    { x: 66, y: 116 },
    { x: 234, y: 34 },
    { x: 234, y: 116 },
  ]
  const path = (i: number) => {
    const t = tiles[i]
    const dir = t.x < 150 ? -1 : 1
    return "M" + (150 + dir * 17) + ",75 H" + (150 + dir * 42) + " V" + t.y + " H" + (t.x - dir * 15)
  }
  return (
    <div className="ib-frame ib-frame-hover">
      <Brackets />
      <div className="ib-card">
        <svg className="ib-diagram" viewBox="0 0 300 150" role="group" aria-label={copy.label}>
          {tiles.map((_, i) => (
            <path key={i} d={path(i)} className={"ib-flow" + (on === i ? " ib-flow-on" : "")} />
          ))}
          {!reduced && on >= 0 && (
            <circle key={on} r="2.2" className="ib-pkt">
              <animateMotion dur="1.1s" repeatCount="indefinite" path={path(on)} />
            </circle>
          )}
          <g transform="translate(133,58)">
            <rect width="34" height="34" rx="7" className="ib-node" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.08))" }} />
            <g transform="translate(8,8)" style={{ color: "var(--ib-ink)" }}>
              <Mark size={18} />
            </g>
          </g>
          {tiles.map((t, i) => (
            <g
              key={i}
              className={"ib-tool" + (on === i ? " ib-tool-on" : "")}
              tabIndex={0}
              role="img"
              aria-label={copy.items[i] ?? ""}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(-1)}
            >
              <rect x={t.x - 15} y={t.y - 15} width="30" height="30" rx="6" className="ib-node" />
              <g transform={"translate(" + t.x + "," + t.y + ")"} style={{ color: on === i ? "var(--ib-accent)" : "var(--ib-ink)" }}>
                <ToolGlyph index={i} />
              </g>
              <text
                x={t.x}
                y={t.y + (t.y < 75 ? -21 : 28)}
                textAnchor="middle"
                fontSize="8"
                fill="var(--ib-muted)"
                fontFamily="var(--ib-sans)"
                opacity={on === i ? 1 : 0}
                style={{ transition: "opacity .25s" }}
              >
                {copy.items[i] ?? ""}
              </text>
            </g>
          ))}
          {/* below everything: at y=112 (the template's spot) it ran into the left and right connectors */}
          <text x="150" y="148" textAnchor="middle" fontSize="7" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
            {on >= 0 ? copy.verb + " · " + (copy.items[on] ?? "").toLowerCase() : copy.idle}
          </text>
        </svg>
        <div style={{ marginTop: "auto" }}>
          <Copy copy={copy} />
        </div>
      </div>
    </div>
  )
}

function ChartCard({ copy, uid, reduced }: { copy: InkOrbitFeaturesProps["chart"]; uid: string; reduced: boolean }) {
  const [ref, inView] = useInView(0.3)
  const [hover, setHover] = React.useState(-1)
  const W = 300
  const H = 130
  const vals = copy.values.length > 1 ? copy.values : [1, 2]
  const { line, area, points } = chartPaths(vals, W, H, 14)
  const split = clamp(copy.projectedFrom, 1, vals.length - 1)
  const fill = uid + "area"
  const last = points[points.length - 1]
  const i = hover >= 0 ? hover : points.length - 1
  const p = points[i]
  const tip = i >= split ? copy.projected : copy.point + " " + (i + 1)
  const onMove = (e: PointerSvgEv) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(nearestIndex(points.map((q) => q[0]), ((e.clientX - r.left) / r.width) * W))
  }
  return (
    <div className="ib-frame ib-frame-hover" ref={ref as never} data-in={inView}>
      <Brackets />
      <div className="ib-card">
        <svg
          className="ib-diagram ib-chart"
          viewBox={"0 0 " + W + " " + (H + 6)}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(-1)}
          role="img"
          aria-label={copy.label}
        >
          <defs>
            <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ib-accent)" stopOpacity=".16" />
              <stop offset="1" stopColor="var(--ib-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="14" x2={W - 14} y1={H * g} y2={H * g} stroke="var(--ib-line)" />
          ))}
          <path d={area} fill={"url(#" + fill + ")"} />
          <path d={line} fill="none" stroke="var(--ib-ink)" strokeWidth="1.4" pathLength={1} className="ib-line-draw" opacity=".85" />
          <line x1={points[split][0]} x2={points[split][0]} y1="10" y2={H - 14} stroke="var(--ib-line-strong)" strokeDasharray="2 3" />
          <text x={points[split][0] - 4} y={H - 18} textAnchor="end" fontSize="7" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
            {copy.projected.toUpperCase()}
          </text>
          {hover >= 0 && <line x1={p[0]} x2={p[0]} y1="8" y2={H - 14} stroke="var(--ib-ink)" strokeOpacity=".35" />}
          {!reduced && hover < 0 && <circle cx={last[0]} cy={last[1]} r="7" fill="var(--ib-accent)" opacity=".25" className="ib-glow" />}
          <circle cx={p[0]} cy={p[1]} r="3.2" fill="var(--ib-raise)" stroke="var(--ib-accent)" strokeWidth="1.5" />
          <g transform={"translate(" + clamp(p[0], 40, W - 40) + "," + (p[1] < 34 ? p[1] + 22 : p[1] - 12) + ")"}>
            <rect x="-30" y="-11" width="60" height="15" rx="2" fill="var(--ib-inv)" />
            <text x="0" y="-1" textAnchor="middle" fontSize="7.5" fill="var(--ib-inv-ink)" fontFamily="var(--ib-mono)">
              {tip}
            </text>
          </g>
        </svg>
        <div style={{ marginTop: "auto" }}>
          <Copy copy={copy} />
        </div>
      </div>
    </div>
  )
}

// Colours derive from the site tokens (--background, --foreground, --muted, --card, --border, --accent),
// which globals.css swaps under .dark, so light/dark follows the site toggle with no JS.
const IB_CSS = `
.ib-root{--ib-paper:var(--background);--ib-card:color-mix(in srgb,var(--foreground) 3%,var(--background));--ib-raise:var(--card);--ib-ink:var(--foreground);--ib-soft:color-mix(in srgb,var(--foreground) 78%,var(--background));--ib-muted:var(--muted);--ib-faint:color-mix(in srgb,var(--muted) 72%,var(--background));--ib-line:var(--border);--ib-line-strong:color-mix(in srgb,var(--foreground) 18%,var(--background));--ib-bracket:color-mix(in srgb,var(--foreground) 26%,var(--background));--ib-inv:var(--foreground);--ib-inv-ink:var(--background);--ib-accent:var(--accent);--ib-shadow:0 1px 2px rgba(0,0,0,.05),0 8px 24px -12px rgba(0,0,0,.12);--ib-sans:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif;--ib-mono:var(--font-geist-mono),ui-monospace,monospace;--ib-serif:var(--font-instrument-serif),Georgia,serif;position:relative;width:100%;box-sizing:border-box;color:var(--ib-ink);font-family:var(--ib-sans);font-size:15px;line-height:1.5}
.dark .ib-root{--ib-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -14px rgba(0,0,0,.7)}
.ib-root :where(*){box-sizing:border-box}
.ib-root :focus-visible{outline:2px solid var(--ib-accent);outline-offset:2px}
.ib-root :where(svg){display:block;max-width:none;flex:none}
.ib-root :where(h3,p){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.ib-shell{width:100%;container-type:inline-size}
.ib-reveal{opacity:0;transform:translateY(18px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.ib-reveal[data-in="true"]{opacity:1;transform:none}
.ib-frame{position:relative}
.ib-c{position:absolute;width:12px;height:12px;border-color:var(--ib-bracket);border-style:solid;border-width:0;pointer-events:none;transition:border-color .3s,transform .35s cubic-bezier(.2,.8,.2,1)}
.ib-c-tl{top:-6px;left:-6px;border-top-width:1.5px;border-left-width:1.5px}
.ib-c-tr{top:-6px;right:-6px;border-top-width:1.5px;border-right-width:1.5px}
.ib-c-bl{bottom:-6px;left:-6px;border-bottom-width:1.5px;border-left-width:1.5px}
.ib-c-br{bottom:-6px;right:-6px;border-bottom-width:1.5px;border-right-width:1.5px}
.ib-frame-hover:hover>.ib-c{border-color:var(--ib-accent)}
.ib-frame-hover:hover>.ib-c-tl{transform:translate(-3px,-3px)}
.ib-frame-hover:hover>.ib-c-tr{transform:translate(3px,-3px)}
.ib-frame-hover:hover>.ib-c-bl{transform:translate(-3px,3px)}
.ib-frame-hover:hover>.ib-c-br{transform:translate(3px,3px)}
.ib-bento{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(22px,3cqw,34px)}
@container (min-width:720px){.ib-bento{grid-template-columns:repeat(2,minmax(0,1fr))}.ib-wide{grid-column:1 / -1}}
.ib-card{background:linear-gradient(180deg,var(--ib-raise),var(--ib-card));border:1px solid var(--ib-line);padding:clamp(18px,2.4cqw,28px);display:flex;flex-direction:column;gap:18px;transition:border-color .3s,box-shadow .35s,background-color .45s}
.ib-card:hover{border-color:var(--ib-line-strong);box-shadow:var(--ib-shadow)}
.ib-copy{display:flex;flex-direction:column;gap:8px}
.ib-num{font-family:var(--ib-mono);font-size:12px;letter-spacing:.08em;color:var(--ib-accent)}
.ib-copy h3{font-family:var(--ib-serif);font-size:clamp(22px,2.6cqw,28px);line-height:1.15;letter-spacing:-.01em;text-wrap:balance}
.ib-copy p{font-size:15px;line-height:1.6;color:var(--ib-muted);max-width:46ch}
.ib-diagram{width:100%;height:auto;overflow:visible}
.ib-wide-copy{display:grid;grid-template-columns:1fr;gap:24px;padding:0 clamp(18px,2.4cqw,28px) clamp(18px,2.4cqw,28px)}
@container (min-width:560px){.ib-wide-copy{grid-template-columns:1fr 1fr;gap:40px}}
.ib-flow{stroke:var(--ib-line-strong);fill:none;stroke-width:1.2;transition:stroke .3s}
.ib-flow-on{stroke:var(--ib-accent)}
.ib-dash{stroke-dasharray:3 4;animation:ib-dash 1.2s linear infinite}
.ib-pkt{fill:var(--ib-accent)}
.ib-node{fill:var(--ib-raise);stroke:var(--ib-line-strong);transition:stroke .3s,transform .3s}
.ib-av{cursor:pointer;transition:transform .35s cubic-bezier(.2,.8,.2,1);transform-box:fill-box;transform-origin:center}
.ib-av:hover,.ib-av:focus-visible{transform:scale(1.18)}
.ib-av-tip{opacity:0;transition:opacity .2s;pointer-events:none}
.ib-av:hover .ib-av-tip,.ib-av:focus .ib-av-tip{opacity:1}
.ib-presence{animation:ib-pulse 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.ib-sheet{transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s}
.ib-sheet-new{animation:ib-sheet-in .7s cubic-bezier(.2,.8,.2,1) both}
.ib-tool{cursor:pointer;transition:transform .3s cubic-bezier(.2,.8,.2,1);transform-box:fill-box;transform-origin:center}
.ib-tool:hover,.ib-tool-on{transform:translateY(-2px)}
.ib-tool rect{transition:stroke .3s}
.ib-tool-on rect.ib-node{stroke:var(--ib-accent)}
.ib-chart{cursor:crosshair;touch-action:pan-y}
.ib-line-draw{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.8s cubic-bezier(.4,.1,.2,1)}
[data-in="true"] .ib-line-draw{stroke-dashoffset:0}
.ib-glow{animation:ib-pulse 2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ib-dash{to{stroke-dashoffset:-14}}
@keyframes ib-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.35)}}
@keyframes ib-sheet-in{from{opacity:0;transform:translate(14px,-10px) rotate(4deg)}to{opacity:1;transform:none}}
.ib-root[data-paused] *{animation-play-state:paused!important}
.ib-bento>.ib-frame{display:flex;flex-direction:column}
.ib-bento>.ib-frame>.ib-card{flex:1}
@media (prefers-reduced-motion:reduce){
.ib-reveal{opacity:1;transform:none;transition:none}
.ib-dash,.ib-presence,.ib-glow,.ib-sheet-new{animation:none}
.ib-line-draw{transition:none;stroke-dashoffset:0}
}
`

type PointerSvgEv = React.PointerEvent<SVGSVGElement>
