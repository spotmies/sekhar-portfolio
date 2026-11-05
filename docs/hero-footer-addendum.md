# Addendum 01: Hero + Footer redesign (overrides §2.1 and §2.7 of the main brief)

**Read with:** `sekharjavvadi-redesign-brief.md`. Where they conflict, this file wins.
**Palette rule:** black and white, as on today's site. Neutral greys only. The existing indigo survives in exactly two places: the full stop after the name, and the active nav dot. No gradients, glows, aurora, glassmorphism or coloured shadows anywhere.

---

## 1. Verdict on the inspirations

| Inspiration | Verdict | What we take | What we drop |
|---|---|---|---|
| **Eraf portfolio** (Dribbble, BL/S) | **Use as the hero's main direction** | Huge two-word statement split around a central visual, joined by an ampersand · small lead-in word above · faint outline year marker · vertical "scroll down" indicator · hairline frame lines | Dark photographic mood, the circular photo portal (our ID badge takes that role), the romantic tone |
| **Parallax Scrolling** (21st.dev, @osmosupply) | **Take the idea, not the component** | A gentle depth effect: the two big words drift apart slightly as you scroll out of the hero | The component itself: it needs layered artwork we don't have, and it adds GSAP + Lenis. Lenis takes over native scrolling and may fight the badge's drag. |
| **Motion Footer** (21st.dev, @jahed) | **Use, modified** | The "curtain reveal" (footer uncovered from beneath the page), a giant typographic sign-off, a magnetic primary button | Aurora glow, grid pattern, glass pills, diagonal marquee, oklch colour tokens |
| **Crowd Canvas** (21st.dev) | **Do not use** | — | Cartoon illustrations change the tone to playful agency, which is wrong for an investor audience. It is also a heavy canvas animation. |

**Optional, from 21st.dev, monochrome-safe:**
- Hero word reveal: *Vertical Cut Reveal* (https://21st.dev/@danielpetho/components/vertical-cut-reveal). A clean masked slide-up reveal for the two big words. Uses the motion library. Use it only if the repo already has framer-motion/motion; otherwise do the same effect in CSS.
- Story intro: *Text Gradient Scroll* (https://21st.dev/@bundui/components/text-gradient-scroll). Words fill from light grey to black as you scroll. Use it for the Story intro paragraph only.

---

## 2. Hero (`#top`): new composition

**Idea:** Eraf's "between Reality & Dream", rewritten as the founder's loop: **between Hardware & Software.** It says the whole story in four words. The ID badge hangs where Eraf's circle sits.

### Layout (desktop ≥ 1024px)
- The full-viewport hero (`min-height: 100svh`) has a thin hairline frame inset ~24px from the edges, like Eraf's frame lines. The frame is 1px, `--line` colour.
- **The ID badge stays exactly as it is** (same component, physics, assets). Only its wrapper may move toward the centre-right of the grid. If moving it changes its physics anchor or behaviour, leave it where it is today.
- **Statement (the visual headline, not the H1):**
  - Line 1, small lead-in (~28–36px, italic serif): `between`
  - Line 2, giant (`clamp(72px, 11vw, 168px)`): `Hardware`, left-aligned, upper half. Its right end tucks behind the badge (badge `z-index` above text).
  - Line 3, an ampersand (`&`) in serif italic, ~60% of the giant size, near the badge's lower-left.
  - Line 4, giant: `Software.`, right-aligned, lower half, starting just under the badge.
- **Faint outline marker** (top-right, like Eraf's "*2021"): `✳2019` in outline text (`-webkit-text-stroke: 1px var(--text-muted); color: transparent`) at ~64px. It is decorative: `aria-hidden="true"`.
- **Identity block** (bottom-left, below/beside "Hardware"; this is the real content):
  - Status chip: `● Building OpenPlan AI`
  - **H1:** `Sekhar Javvadi.` (~40–48px grotesk, indigo full stop)
  - Role (mono): `FOUNDER & PRODUCT BUILDER`
  - Bio (max 2 lines, ~44ch): `I started out building circuits and PCBs, spent the years since 2019 shipping software, and now I'm building OpenPlan AI for teams that make physical products.`
  - CTAs: `Explore OpenPlan AI` (solid black pill) → `#openplan`; `Get in touch` (outline pill) → `#contact`
- **Venture trail** (bottom-centre, mono, small, muted): `Spotmies · 2019 → Reaidy.io → OpenPlan AI · now`
- **Scroll indicator** (bottom-left edge, like Eraf): a 64px circle outline with vertical mono text `SCROLL` and a 1px line descending from it. It links to `#story`. The line has a slow 2s down-drift loop, which is disabled under reduced motion.
- Keep the `Drag it · click to flip` hint under the badge.

### Layout (mobile < 768px)
Stack in this order: status chip → `between` → `Hardware` → badge (static image or the existing component, per main brief §6) → `& Software.` → H1 + role + bio → CTAs → venture trail. Giant words at `clamp(56px, 17vw, 88px)`. No outline marker, no scroll indicator, no frame.

### Typography change (the one visual upgrade)
- Add **one display serif** for the statement words only (`between`, `Hardware`, `&`, `Software.`): **Instrument Serif** (Google Fonts, regular + italic; self-host WOFF2, Latin subset, `font-display: swap`). This gives the Eraf editorial feel while staying black and white.
- Everything else keeps the current grotesk and mono.
- If the founder rejects the serif, use the current grotesk at weight 500 with tracking −0.04em instead. The layout is unchanged.

### Motion
1. **On load** (once): `between` fades in, then `Hardware` and `Software.` reveal with a masked vertical slide-up (each line inside `overflow: hidden`, text animates `translateY(100%) → 0`), 700ms, `cubic-bezier(.2,.7,.1,1)`, 120ms stagger. The `&` fades in last. The identity block fades up 200ms after.
2. **On scroll out of the hero:** `Hardware` drifts left up to −6vw and `Software.` drifts right up to +6vw, linked to scroll progress across the hero's height. Implement with CSS scroll-driven animations (`animation-timeline: view()`), with a small IntersectionObserver + `requestAnimationFrame` fallback that writes only `transform`. **No Lenis, no scroll hijacking.**
3. `prefers-reduced-motion: reduce` → no reveal, no drift; everything renders in its final position.
4. The H1 and bio must be visible in the first paint (no `opacity: 0` gating on the H1). LCP must be the text.

### Accessibility
- The statement words are one visual element. Wrap them in `<p class="hero-statement" aria-label="Between hardware and software">` and set `aria-hidden` on the individual spans, so screen readers hear one phrase.
- The H1 remains `Sekhar Javvadi.`; there is only one `<h1>` on the page.

---

## 3. Footer + Contact (`#contact`): curtain reveal (replaces §2.6 layout and §2.7)

Contact and footer merge into one closing panel that is uncovered as the page scrolls away.

### Mechanism (no new dependency)
- `main` gets `position: relative; z-index: 1; background: var(--bg)` and a `margin-bottom` equal to the footer height.
- The footer panel is `position: fixed; bottom: 0; left: 0; right: 0; z-index: 0; height: min(100svh, 760px)`. As `main` scrolls up, the footer is revealed underneath, like a curtain.
- Measure the footer height with a ResizeObserver and set the margin via a CSS variable.
- **Fallback:** on screens shorter than 640px, under reduced motion, or if the footer content is taller than the viewport, use a normal static footer (no fixed positioning).
- Use GSAP ScrollTrigger only if GSAP is already in the repo **and** the CSS version can't achieve the effect. Do not add GSAP for this alone.

### Content (inverted colours: black background, white text in light mode; the reverse in dark mode)
- Label (mono): `05 — CONTACT`
- Giant masked sign-off, full width, serif: `Let's talk.` (`clamp(72px, 14vw, 220px)`). It reveals with the same masked slide-up as the hero when the footer is ≥ 40% visible.
- Three audience rows (mono label + one line each), as in main brief §2.6: Investors & accelerators / Hardware teams / Builders.
- **Magnetic primary button:** `Email me →` (white pill on black). On pointer devices only, it moves toward the cursor up to 8px within a 80px radius and springs back on leave. Implement with `pointermove` + `transform` (≤ 30 lines, no library). Disable it for touch and reduced motion.
- Email text with a Copy button; LinkedIn · X · GitHub; `Visakhapatnam, India`.
- Bottom row (hairline above): `© 2026 Sekhar Javvadi` · `Back to top ↑`.
- **Optional horizontal marquee** strip above the bottom row: `INVESTORS · HARDWARE TEAMS · BUILDERS · OPENPLAN AI ·` repeated, mono, muted, 40s linear loop with CSS keyframes. It pauses on hover and is off under reduced motion. Never diagonal.

---

## 4. Story intro (small addition to main brief §2.2)
Optionally apply a scroll-linked fill to the Story intro paragraph: each word goes from `--text-muted` at 35% opacity to `--text` as the paragraph crosses the viewport. Use CSS `animation-timeline: view()` with a static fallback. This is the only place the effect is used.

---

## 5. Acceptance additions
- [ ] The hero reads "between Hardware & Software", and the H1 "Sekhar Javvadi." is visible on first paint.
- [ ] The badge's behaviour is unchanged (drag, flip, physics), checked on desktop and mobile.
- [ ] No Lenis; native scrolling everywhere. Scroll drift uses only `transform`.
- [ ] The footer curtain reveal works on desktop; the static fallback works on short screens and with reduced motion.
- [ ] No colour other than greys plus the two indigo accents.
- [ ] No new dependencies, except the Instrument Serif font files.
- [ ] Lighthouse mobile scores are no worse than before this addendum.
