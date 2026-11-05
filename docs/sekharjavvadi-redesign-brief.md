# sekharjavvadi.com — Redesign Implementation Brief

**For:** the coding agent working in the existing sekharjavvadi.com repo
**Goal:** Turn the current homepage into a founder-first story for **investors and accelerators** (primary audience) and hardware teams (secondary). This is a restructure of an existing site, not a rebuild.

---

## 0. Rules for the agent (read first)

1. **Inspect before changing.** Read the repo and report the framework, styling system, animation libraries, where content lives, and how the ID badge and "Founder Story" mat are built. Then propose a short plan. Do not rewrite the project.
2. **Do not touch the lanyard ID badge.** Keep its look, physics, drag/flip behaviour and assets exactly as they are. The only allowed change is *when* it loads (see §6), and only if it currently blocks first paint. Ask before doing even that.
3. **Reuse the existing design tokens** (colours, fonts, spacing, radius, dark mode). The values in §4 are fallbacks for anything missing.
4. **Work one section at a time,** in the order in §2. After each one: build, check 360 / 768 / 1024 / 1440 px widths in light and dark mode, then move on.
5. **Never invent facts.** Anything marked `[TODO: …]` stays as a visible placeholder in a single content file until the founder fills it in. Do not guess dates, titles or numbers.
6. **Put all copy and numbers in one content file** (e.g. `content/site.ts` or the repo's equivalent). Components read from it, and no copy is duplicated.
7. **Avoid adding dependencies.** No new animation, UI or icon libraries if CSS or what is already installed can do it.

---

## 1. What changes, at a glance

| Current site | New site |
|---|---|
| Hero + 4-number stats row | Hero with a one-line **venture trail** (no numbers) |
| 01 Founder Story (5-badge mat + interests sidebar) | **01 Story**: same mat, 4 chapters in 3 acts, sidebar removed |
| 02 Ventures (3 equal cards) | **02 Now building: OpenPlan AI** (featured) + **03 Track record** (Spotmies, Reaidy) |
| 03 Journey | **Removed** (it repeats the Story) |
| 04 Selected Work + Capabilities grid | **Removed.** 3 projects move inside Spotmies; tools become one line + a GitHub link |
| 05 How I Build (6 principles + 5 lessons) | **04 How I build**: 4 principles, each backed by a real event |
| 06 Contact | **05 Contact**: one ask per audience, visible email with copy button |

**Navigation (5 items):** `Story · OpenPlan · Ventures · How I build · Contact`, plus the "SJ" mark and the theme toggle. Keep the floating pill and the active-section dot.

**Anchors:** `#story`, `#openplan`, `#ventures`, `#principles`, `#contact`

---

## 2. Section-by-section spec and final copy

Overall feel: an editorial page about a person, not a product landing page. Use large type, generous space and few boxes. The ID badge is the only "object" on the page; venture blocks and principles are plain typography, not cards.

### 2.1 Hero (`#top`)

**Layout (desktop):** 12-column grid. Text in columns 1–7, ID badge in columns 8–12 (current position). Cut the large empty gap under the CTAs that exists today. The hero is at least 100svh tall but stops at the venture trail.
**Layout (mobile):** Text first, then the badge (same component; see §6 for mobile behaviour).

**Copy:**

- Status chip: `● Building OpenPlan AI` (keep the existing chip with the OpenPlan mark)
- H1: `Sekhar Javvadi.` (keep the indigo full stop)
- Role line (mono, accent, tracked): `FOUNDER & PRODUCT BUILDER`
- Tagline (large): `Turning complex workflows into software products.`
- Bio (max 2–3 lines, ~60ch):
  > I'm a founder from Visakhapatnam. I started out building circuits and PCBs, spent the years since 2019 shipping software products, and I'm now building OpenPlan AI, software for teams that build physical products.
- Venture trail (mono, small, muted; each item links to its section):
  `Co-founded Spotmies · 2019  →  Built Reaidy.io  →  Now building OpenPlan AI`
- Primary CTA: `Explore OpenPlan AI` → `#openplan`
- Secondary CTA: `Get in touch` → `#contact`
- Keep the `Drag it · click to flip` hint under the badge.

**Remove:** the 4-stat row and its footnote.

### 2.2 01 — Story (`#story`)

**Purpose:** explain the person and why OpenPlan is his to build. The story is a loop: hardware → software → back to hardware.

**Header:**
- Label (mono): `01 — STORY`
- H2: `I build technology by understanding how people actually work.`
- Intro (≤ 3 sentences):
  > My work has followed one instinct: when I see a workflow that technology can fix, I want to understand it deeply and build something useful around it. It started with hardware, took me through seven years of building software, and has brought me back to hardware.

**Interactive mat:** keep the existing green cutting-mat component and its badge visuals. Changes:
- **4 chapters, not 5.** Remove the separate Web3 badge; blockchain becomes part of the Spotmies chapter. (If removing it breaks the mat layout, keep the badge but give it Spotmies' chapter text.)
- Group chapters into 3 acts. Show the act name as the small mono label on the reading card (where "WHERE IT STARTED" sits today).
- Remove the sidebar list of interests and disciplines.
- **Accessibility:** every chapter must be reachable without dragging. Badges are `<button>`s; Prev/Next work; ← / → keys change chapter; the reading card is an `aria-live="polite"` region.
- **Mobile (< 768px):** do not render the draggable mat. Render the badges as a horizontal snap-scroll row (tap to select) with the reading card below, or as a stacked list of chapters.

**Chapter copy:**

| # | Badge | Act label | Kicker | Title | Body | What it taught me |
|---|---|---|---|---|---|---|
| 01 | Tinkerer | ACT I · HARDWARE FIRST | THE TINKERER | I started by making things work. | Before any company, there were circuits: NodeMCU boards, PIR-sensor anti-theft devices, schematics and PCBs. Getting code to behave in the physical world meant debugging patiently and respecting real constraints. | How software meets physical systems, and how to debug what doesn't work yet. |
| 02 | Spotmies LLP · 2019 | ACT II · BUILDING SOFTWARE | CO-FOUNDER | Seven years of turning ideas into products. | In 2019 I co-founded Spotmies with Satish, Hemanth and Naveen `[TODO: confirm names/permission]`. We built web, mobile, AI and blockchain products for startups and businesses. The blockchain work included smart contracts, NFTs and decentralised apps. | How to understand a customer, scope under constraints, deliver with a team, and run a business. |
| 03 | Reaidy.io | ACT II · BUILDING SOFTWARE | PRODUCT BUILDER | Taking an AI product to real users. | Reaidy was a two-sided AI hiring platform: mock interviews and scorecards for candidates, and resume screening for recruiters. Getting it to real usage meant solving for quotas, quality and cost, not just the model. | A prototype is the start. Reliability, cost and adoption are the product. |
| 04 | OpenPlan AI · 2026 | ACT III · BACK TO HARDWARE | NOW BUILDING | Full circle. | Now I'm bringing those years of software back to where I started. OpenPlan AI gives teams that build physical products one connected place for parts, BOMs, revisions and engineering changes. | → See what I'm building (link to `#openplan`) |

**Closing line under the mat (large, centred or left):**
`Every chapter has the same thread: make complex work easier to execute.`

### 2.3 02 — Now building: OpenPlan AI (`#openplan`)

**Purpose:** the featured section. Give the current venture the spotlight and be honest about its stage. Write for an investor.

**Layout (desktop):** two rows.
1. Header row: label + H2 + lead on the left (cols 1–6); status/meta list on the right (cols 8–12).
2. Product visual, full content width, in a plain frame (1px hairline border, 12–16px radius, soft shadow, no device mockup). Below it, a 3-column problem row and a 4-item capability list.

**Copy:**

- Label (mono): `02 — NOW BUILDING`
- H2: `OpenPlan AI`
- Lead:
  > `[TODO: founder to pick ONE positioning, and match openplanai.com]`
  > Option A (workspace): *OpenPlan AI helps hardware teams manage product structures, engineering changes and development work in one connected workspace.*
  > Option B (layer): *OpenPlan AI is an AI planning layer for hardware teams that works alongside the PLM tools they already use.*
- Meta list (mono, small, label/value rows):
  - `Status` — `Built and working` `[TODO: add "in pilots with N teams" only if true]`
  - `For` — `Hardware startups and product teams` `[TODO: confirm industries]`
  - `Started` — `2026`
  - `Site` — `openplanai.com`
- **The problem** (3 columns, mono numbers 01/02/03, short):
  1. **Product data is scattered.** Parts, BOMs and revisions live across spreadsheets and disconnected tools.
  2. **Changes are hard to control.** Engineering changes move through email and chat, with no clear history.
  3. **Visibility comes late.** As a product evolves, teams struggle to see what a change touches.
- **What it does** (4 items, plain list with hairline dividers):
  - **BOM management:** parts, assemblies, components and sub-components in one structure.
  - **Engineering change orders:** track and control every product change.
  - **Lifecycle workflows:** organise product information and development activity.
  - **Connected project work:** tasks linked to the parts and changes they affect.
- **Why me** (one quoted line, larger type):
  > "I started in hardware and spent seven years building software. OpenPlan is where the two meet."
- CTAs:
  - Primary: `See the product` → `https://openplanai.com` (new tab, `rel="noopener"`)
  - Secondary: `Request a conversation` → `#contact`
  - Tertiary text link: `Hardware team? Request a demo →` → `mailto:[TODO email]?subject=OpenPlan%20demo`

**Product visual:**
- Preferred: `[TODO: product screenshot(s) or a 10–15s muted looping MP4/WebM]`. Video: `autoplay muted loop playsinline`, a poster image, and paused when `prefers-reduced-motion`.
- **Fallback until screenshots exist:** an inline SVG diagram of connected product data:
  `Part → Assembly → Revision → Change order → Task`. Draw nodes as rounded rectangles with mono labels, connected by hairline arrows, using the accent colour for the "Change order" node. Static: no animation needed. Include a text description for screen readers.

**Do not:** show traction numbers, logos or testimonials for OpenPlan. Do not use the phrase "GitHub for hardware".

### 2.4 03 — Track record (`#ventures`)

**Purpose:** proof. Show that he has built, shipped and run things. **This is the only section with numbers.**

**Header:**
- Label: `03 — TRACK RECORD`
- H2: `Before OpenPlan.`

**Layout:** two equal blocks stacked (desktop: two columns side by side if they fit comfortably; otherwise stacked). Each block is plain typography with a hairline top border, not a card. A small version of the venture's badge visual from the Story mat may sit at the top-left of each block for continuity.

**Block A: Spotmies LLP**
- Name: `Spotmies LLP`
- Meta (mono): `Co-founder & Technical Lead [TODO: confirm title, e.g. CTO] · 2019 – [TODO: present?] · Visakhapatnam`
- One line: `A software product and services company that turns business requirements into working web, mobile, AI and blockchain products.`
- What I owned: `Technical direction, architecture and product decisions, and delivering projects with the team.`
- Metrics (2×2 grid; large number + small label; mono scope line under the grid):
  - `40+` projects delivered
  - `30+` clients
  - `6+` blockchain projects
  - `50-seat` office in Visakhapatnam
  - Scope line: `Company figures · as of [TODO: month year]`
- Support: `Associated with AU Incubation Centre and A Hub, Andhra University.` `[TODO: confirm entity/dates]`
- **Selected Spotmies work** (3 rows: name, one line, role):
  - `CypherB`: Blockchain recruitment and verification platform. `My role: [TODO]`
  - `Indie Skull Syndicate`: NFT and blockchain community project. `My role: [TODO]`
  - `Nandikrushi`: Organic grocery app. `My role: [TODO]`
  - Footer line: `Built by the Spotmies team.`
- Team credit: `Co-founded with Satish, Hemanth and Naveen.` `[TODO: confirm]`

**Block B: Reaidy.io**
- Name: `Reaidy.io`
- Status pill: `No longer operating` (neutral grey; not red)
- Meta (mono): `[TODO: title] · [TODO: start year – end year]`
- One line: `A two-sided AI hiring platform: AI mock interviews and scorecards for candidates, bulk resume screening and a recruiter portal for companies.`
- Metrics (2×2):
  - `50K+` users
  - `60K+` AI interviews
  - `200+` hiring companies
  - `40+` college partners
  - Scope line: `Historical figures, reported by the team · as of [TODO: month year]`
- Support: `Part of Microsoft for Startups Founders Hub.`
- Why it stopped: `[TODO: one honest sentence]`
- Key lesson (italic or quoted): `AI quality came from the whole workflow (interview state, question history, evaluation), not just the model.`

**Below both blocks, one line for range (instead of the old capabilities grid):**
`Hands-on across web, mobile, AI and speech, blockchain, cloud and embedded systems.` → link `GitHub →`

### 2.5 04 — How I build (`#principles`)

**Layout:** a numbered typographic list. Number in mono (accent), then a short claim (H3 size), then 1–2 sentences of evidence. Two columns on desktop, one on mobile. No icons, no cards.

- Label: `04 — HOW I BUILD`
- H2: `How I build.`

| # | Principle | Evidence |
|---|---|---|
| 01 | Start with the workflow, not the technology. | Every product I've worked on began with a specific friction: screening candidates faster, keeping control of hardware changes. |
| 02 | A prototype is only the beginning. | At Reaidy, the AI interviews worked. Then speech-service quotas capped how many could run at once. Making it hold up under real usage was the real work. |
| 03 | AI quality is product logic. | Our mock interviews kept repeating questions. The fix wasn't a better model; it was tracking interview state and question history. |
| 04 | Architecture follows usage and cost. | For resume search, we weighed MongoDB against a dedicated vector database on storage cost, speed and complexity, not convenience. |

Closing vision line (larger, muted):
`I want to build practical platforms that help important industries move faster from ideas to real products.`

### 2.6 05 — Contact (`#contact`)

**Layout:** a large closing headline across the full width, then three short audience rows, then the email and social links. Optional: a small static image of the back of the ID badge as a "contact card", if a back-face asset already exists.

- Label: `05 — CONTACT`
- H2 (display size): `Let's talk.`
- Audience rows (label in mono, text in body size):
  - `INVESTORS & ACCELERATORS` — I'd like to tell you about OpenPlan AI and where it's going.
  - `HARDWARE TEAMS` — See how OpenPlan fits the way your team builds.
  - `BUILDERS` — Always happy to compare notes.
- Email: `[TODO: email]` shown as text, with a **Copy** button (shows "Copied" for 2s; uses `navigator.clipboard`; falls back to selecting the text).
- Primary CTA: `Email me` → `mailto:[TODO]`
- Links: LinkedIn, X, GitHub (reuse current URLs `[TODO: confirm current]`)
- Location: `Visakhapatnam, India`

### 2.7 Footer

`© 2026 Sekhar Javvadi · Visakhapatnam, India` · LinkedIn · X · GitHub · `Back to top ↑`

---

## 3. Content file shape (example)

Keep all copy here. Adapt to the repo's language and conventions.

```ts
export const metrics = {
  spotmies: {
    asOf: "[TODO]", scope: "Company figures",
    items: [
      { value: "40+", label: "projects delivered" },
      { value: "30+", label: "clients" },
      { value: "6+", label: "blockchain projects" },
      { value: "50-seat", label: "office in Visakhapatnam" },
    ],
  },
  reaidy: {
    asOf: "[TODO]", scope: "Historical figures, reported by the team",
    items: [
      { value: "50K+", label: "users" },
      { value: "60K+", label: "AI interviews" },
      { value: "200+", label: "hiring companies" },
      { value: "40+", label: "college partners" },
    ],
  },
};
// + hero, story chapters, openplan, ventures, principles, contact, links
```

---

## 4. Design tokens (fallbacks only; prefer what the repo already has)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F7F7F5` | `#0E0E0F` |
| `--surface` | `#FFFFFF` | `#161618` |
| `--text` | `#141414` | `#EDEDEC` |
| `--text-muted` | `#5E5E5B` (must pass 4.5:1 on `--bg`) | `#A3A3A0` |
| `--line` | `#E4E4E0` | `#2A2A2D` |
| `--accent` | current indigo (≈ `#4F46E5`) | lighter indigo (≈ `#818CF8`) |
| `--mat` | current cutting-mat green | same |

- **Type:** keep the current grotesk (headings + body) and mono (labels). Use at most 3 weights.
  - Display H1: `clamp(48px, 7vw, 88px)`, tracking −0.03em
  - H2: `clamp(32px, 4.5vw, 56px)`, tracking −0.02em
  - Body: 17–18px, line-height 1.6, max-width 62ch
  - Mono labels: 12–13px, uppercase, tracking 0.12em
- **Layout:** 12-column grid, max width 1200px, side gutter 16px on mobile and 24–32px on desktop.
- **Section spacing:** `clamp(96px, 14vw, 176px)` between sections, with a hairline rule and mono section number at the top of each.
- **Radius:** 12–16px for frames; pills fully rounded.
- **Motion:** one shared reveal: opacity 0→1 and translateY 12px→0, 300ms ease-out, triggered once by IntersectionObserver. Animate only `transform` and `opacity`. No parallax, scroll-jacking or text-scramble effects.

---

## 5. Navigation behaviour

- Desktop: the existing floating pill, centred, with 5 links and an active-section dot (scrollspy via IntersectionObserver). The "SJ" mark (left) scrolls to the top; the theme toggle sits on the right.
- Mobile (< 768px): show the "SJ" mark and a menu button. The button opens a full-screen sheet with the 5 links in large type. Close it with ✕, Esc, or a tap on a link. Trap focus while open.
- Smooth scroll with `scroll-margin-top` on sections, so headings aren't hidden under the nav. Disable smooth scroll under reduced motion.

---

## 6. Performance requirements (must pass)

- **Core Web Vitals on mobile:** LCP < 2.5s, INP < 200ms, CLS < 0.1. The LCP element must be the H1/tagline text, **not** the badge canvas.
- **ID badge loading** (behaviour unchanged): if its 3D/physics code is in the main bundle, load it dynamically after first paint. Reserve its exact box first (fixed width/height), so nothing shifts. Show a static badge image of the same size until it loads. With `prefers-reduced-motion`, or if WebGL is unavailable, keep the static image.
- **Story mat:** load its code only when `#story` is within ~1 viewport (IntersectionObserver / dynamic import).
- **Images:** AVIF/WebP, responsive `srcset`, explicit width/height, `loading="lazy"` below the hero. Portrait under ~80KB.
- **Fonts:** self-hosted WOFF2, Latin subset, `font-display: swap`, preload only the H1 weight.
- **JS budget:** under ~150KB gzipped before first interaction, excluding the deferred badge and mat code. Delete any components and libraries left unused after removing Journey, Work and the stats.

---

## 7. Accessibility requirements (must pass)

- Meets WCAG 2.2 AA. One `<h1>`; headings in order; landmarks (`header`, `nav`, `main`, `footer`); a skip-to-content link.
- Every drag interaction has a keyboard and tap alternative. Focus rings are visible on all controls.
- Alt text for the portrait, screenshots and diagram. Decorative SVGs get `aria-hidden`.
- Text contrast is at least 4.5:1, including the small grey mono labels and the text on the green mat.
- Do not disable pinch-zoom. Tap targets are at least 44×44px.
- Metric lists are real `<dl>` or `<ul>` elements. Dates use `<time>`.

---

## 8. SEO and sharing

- `<title>`: `Sekhar Javvadi — Founder, building OpenPlan AI`
- Meta description: `Founder and product builder from Visakhapatnam. Co-founded Spotmies (2019), built Reaidy.io, and now building OpenPlan AI, software for hardware teams.`
- Canonical URL `https://www.sekharjavvadi.com/`. Add Open Graph and X card tags, with a 1200×630 share image of the ID badge, name and tagline (static PNG).
- JSON-LD `Person` (name, jobTitle "Founder", address locality Visakhapatnam, `sameAs` LinkedIn/X/GitHub, `worksFor` OpenPlan AI) plus `Organization` entries for OpenPlan AI and Spotmies.
- Add `sitemap.xml` and `robots.txt`.

---

## 9. Acceptance checklist

- [ ] The nav has 5 items, and every anchor scrolls to the right section.
- [ ] The hero has no metrics, and the ID badge looks and behaves exactly as before.
- [ ] The Journey section, Selected Work section, capabilities grid and Story sidebar are gone, and their unused code is deleted.
- [ ] Every number appears exactly once (in Track record), with a scope line and an as-of placeholder.
- [ ] Reaidy shows "No longer operating".
- [ ] OpenPlan shows no traction numbers. It shows the screenshot or the fallback diagram.
- [ ] Story chapters work by mouse, keyboard and touch. Mobile shows the non-drag layout.
- [ ] Reduced motion: the badge is static, reveals are instant, and video is paused.
- [ ] No horizontal scroll at 360px. Light and dark mode are both checked.
- [ ] Lighthouse mobile: performance ≥ 90, accessibility ≥ 95, SEO = 100 (report actual scores).
- [ ] All `[TODO]`s are collected in the content file, and a list of them is printed in the final summary.

---

## 10. Open items the founder must fill in (TODO list)

1. OpenPlan positioning: Option A (workspace) or Option B (planning layer). It must match openplanai.com.
2. OpenPlan status wording; target industries; screenshots or a demo video.
3. Reaidy: title, active years, the reason it stopped, and the as-of date for the metrics.
4. Spotmies: exact title, whether it is still active, the as-of date for the metrics, and the incubation entity and dates.
5. Co-founder names and permission to show them.
6. Role on CypherB, Indie Skull Syndicate and Nandikrushi.
7. Public email address; confirm the LinkedIn, X and GitHub URLs.
