# Addendum 02: Timeline book, Projects, Testimonials

**Read with:** `docs/sekharjavvadi-redesign-brief.md` and `docs/hero-footer-addendum.md`. Where they conflict, this file wins.
**Scope:** content, structure and behaviour only. The founder will give the visual design (UI) for each part separately. Until then, reuse the site's existing styles.
**Rules carried over:** confirm before every change · never invent facts · unfilled values are `null` and hidden · no pushing · the badge, Story mat and footer wordmark stay protected.

---

## 0. New page order and navigation

| # | Section | Anchor | Status |
|---|---|---|---|
| — | Hero | `#top` | unchanged |
| 01 | Story | `#story` | unchanged |
| 02 | Now building: OpenPlan AI | `#openplan` | unchanged |
| 03 | Before OpenPlan (ventures + **timeline book**) | `#ventures` | **extended** |
| 04 | **Projects** | `#projects` | **new** |
| 05 | How I build | `#principles` | renumbered |
| 06 | **Testimonials** | `#testimonials` | **new**, hidden until it has ≥ 2 real entries |
| 07 | Contact | `#contact` | renumbered |
| — | Footer | — | unchanged |

**Nav (6 items):** Story · OpenPlan · Ventures · Projects · How I build · Contact. Testimonials is not in the nav.
Update the mono section numbers (01–07) to match the new order.

---

## 1. Section 03, "Before OpenPlan.": the timeline book

### 1.1 What it is
The existing open book (Spotmies left page, Reaidy right page) becomes the **first spread** of a book. As the visitor scrolls, pages turn one at a time, going back in time, from 2025 to 2019. After the last page, the page scrolls on normally to the next section.

### 1.2 Behaviour
- **Pinned scroll, native scrolling.** The section is a tall wrapper (about 100vh per page turn + 100vh). Inside it, the book is `position: sticky; top: 0`. Scroll progress across the wrapper decides how far each page has turned. No scroll hijacking, no Lenis, no wheel interception, and no snap that fights the user.
- **Page turn:** each leaf rotates around the spine (`rotateY` 0 → −180deg, `transform-origin: left center`, `perspective` on the book, `backface-visibility: hidden` with front and back faces). Add a soft moving shadow across the page being turned, opacity only. Animate `transform` and `opacity` only.
- **Smoothness:** map scroll progress through a light smoothing step (e.g. lerp in `requestAnimationFrame`, factor about 0.12). The page then follows the scroll softly without lagging behind. Use CSS scroll-driven animations (`animation-timeline: view()`) where supported, with the rAF fallback.
- **Progress indicator:** small mono text beside the book: the current year range (e.g. `2024 — 2023`) and `3 / 6`.
- **Escape hatch:** a small "Skip timeline ↓" link that jumps to `#projects`.
- **Reduced motion:** no pinning and no turning. Show every spread stacked as plain blocks, in order.
- **Mobile (< 768px):** no pinning or 3D turn. Use the existing swipeable slides, one page per slide, with the same order and content.
- **Keyboard / screen readers:** each spread is an `<article>` in a list, in DOM order. All text is in the DOM (not canvas). With focus inside the book, ←/→ (or PageUp/PageDown) move one page.
- **Performance:** at most the current leaf and the next one are 3D-transformed at a time; the others are `visibility: hidden`. No new libraries; `motion` is already installed, so use it only if CSS + rAF can't do the effect. Layout shift stays 0.

### 1.3 Phase 1 (build now): prototype with 3 blank turns
- First spread: the existing Spotmies | Reaidy pages, unchanged.
- Then **3 leaves** that turn on scroll, each showing only a year label and a title (from §1.4, the first three rows), with no body content yet.
- Once 3 pages have turned, the book releases and the page scrolls on to `#projects`.
- Send screen recordings at 1440px and 390px, plus one with reduced motion, before adding content.

### 1.4 Phase 2 (content later): pages, newest first
Each turned page = one period. The founder will supply what goes inside. For now, only these headings:

| Page | Years | Heading | Type | Notes |
|---|---|---|---|---|
| Spread 1 | — | Spotmies LLP · Reaidy.io | ventures | Existing pages. Keep as is. |
| 2 | 2025 — 2024 | Reaidy.io | product | Do not repeat the metrics already shown on spread 1. |
| 3 | 2024 — 2023 | CypherB | product / blockchain | Blockchain recruitment and verification platform. |
| 4 | 2023 — 2022 | **A real Spotmies client project** | client project | **Do not use a made-up name.** Use one real project from the founder document, e.g. *StreamCity* (yoga streaming) or *Nandikrushi* (organic grocery app). Until the founder picks, show "Client project · Spotmies". |
| 5 | 2022 — 2021 | EDU Hax & IoT | education / hardware | `[TODO: what EDU Hax was]` (null, hidden) |
| 6 | 2020 — 2019 | College project: PCB | hardware | Where it started: circuits, schematics and a PCB. |

**Fields per page** (data shape in `portfolio.ts`; any field can be `null` and hidden):
`years`, `title`, `type`, `oneLine`, `role`, `whatIDid` (2–3 bullets), `outcome`, `image`, `link`.

**Founder to confirm:** Is Reaidy's run 2024–2025? If yes, also fill the hidden Reaidy years on spread 1.

---

## 2. Section 04, Projects (new)

### 2.1 Purpose
Proof of execution beyond the two ventures. It answers the visitor's question "What has he actually shipped, and what was his part?" It replaces the "Selected work" list inside the Spotmies page; remove that list once Projects exists, so projects aren't shown twice.

### 2.2 Copy
- Label: `04 — PROJECTS`
- H2: `Things I've helped ship.`
- Intro (one line): `Selected work from Spotmies and before. Built with the team, with my role stated on each.`
- Footer line under the grid: `More on GitHub ↗` → https://github.com/sekharjavvadi

### 2.3 Which projects (only those with known context in the founder document)

| Project | One line (from the document) | Shown at launch? |
|---|---|---|
| CypherB | Blockchain recruitment and verification platform. | Yes |
| Indie Skull Syndicate | NFT and blockchain community project. | Yes |
| Nandikrushi | Organic grocery app. | Yes |
| StreamCity | Yoga streaming product. | Yes |
| Oscar Chatbot | Chatbot built for a client. | Yes |
| Jaffo | Dating application. | Optional |
| Hardware & IoT prototypes | NodeMCU / ESP8266 boards, PIR-sensor anti-theft devices, schematic and PCB design. | Yes |
| Workewhere, Project Hex, Vihaan Electrix, Chalo Ride, Mr Bikes, 10x Academy | Name only; no description yet | **No**, until the founder gives details |

Show 4–6 at launch. Order: newest first, if years are known; otherwise the order above.

### 2.4 Fields per project (any can be `null` and hidden)
`name`, `oneLine`, `year`, `type` (client · product · blockchain · hardware), `myRole`, `problem`, `whatWeBuilt`, `stack` (max 4 items), `outcome`, `image`, `link`, `builtWith` (default "Spotmies team").

**Rules:**
- Every project card shows "Built with the Spotmies team" unless it was solo.
- `myRole` must come from the founder. If it's null, the card hides the role line; never guess a role.
- No client logos and no client names beyond the project name, unless the founder confirms permission.
- Don't list more than 4 technologies per card. This section is not a skills list.

---

## 3. Section 06, Testimonials (new)

### 3.1 What a testimonial is
A short quote from a real person who worked with Sekhar: a client, a co-founder or teammate, a mentor, an incubator or programme contact, or a user. They say what it was like to work with him, in their own words. It is the only part of the site where *someone else* vouches for him, which is why investors and customers value it.

### 3.2 Rules (non-negotiable)
- **Real people only.** Each quote is written by that person, or written by Sekhar and approved by them word for word.
- **Permission** to publish their name, role and company (and photo, if used).
- **No editing that changes meaning.** Shortening with "…" is fine only if the person approves it.
- **Never invent, paraphrase or "polish" a testimonial.** The agent must not write any testimonial text. Until real entries exist, the section is hidden.
- Show at least 2, ideally 3–5. Hide the section if there are fewer than 2.

### 3.3 Best sources, in order of value to investors
1. Clients who paid Spotmies for a product (founder or product lead at the client).
2. Recruiters or college partners who used Reaidy.
3. Co-founders or senior teammates at Spotmies.
4. Mentors at AU Incubation Centre / A Hub, or programme contacts.
5. Early OpenPlan users or design partners (very strong, once any exist).

### 3.4 Copy
- Label: `06 — TESTIMONIALS`
- H2: `In their words.`

### 3.5 Fields per testimonial
`quote` (1–3 sentences, max ~280 characters), `name`, `role`, `company`, `relationship` (e.g. "Client, 2023", "Co-founder at Spotmies"), `photo` (optional), `link` (optional: their LinkedIn), `context` (optional: which project or venture it refers to).

### 3.6 Behaviour
- Show all testimonials at once, or as a simple row with Prev/Next. If it auto-advances, pause on hover/focus, never under reduced motion, and keep a visible pause control.
- Mark each one up as `<figure><blockquote>…</blockquote><figcaption>…</figcaption></figure>`.
- Optionally add `Review`/`Quotation` JSON-LD only if all fields are real. If unsure, skip structured data.

---

## 4. Things to clean up at the same time
- Remove "Selected work" from the Spotmies page (moved to Projects).
- Update the section numbers and nav (§0).
- Add `#projects` and (when shown) `#testimonials` to the sitemap and scrollspy.
- Re-run Lighthouse mobile after Phase 1 of the timeline. The pinned book must not push blocking time back above 300ms.
