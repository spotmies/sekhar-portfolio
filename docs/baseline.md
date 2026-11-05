# Baseline (before redesign)

Captured 2026-11-03 on commit `bdfbde5` (current `main`), production build (`next build` + `next start`),
Lighthouse 12.8.2, mobile form factor (default simulated throttling), headless Chrome, localhost.

| Run | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS | FCP | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 52 | 100 | 96 | 100 | 4.7 s | 3,580 ms | 0 | 1.1 s | 3.1 s |
| 2 | 56 | 100 | 96 | 100 | 4.3 s | 2,880 ms | 0 | 1.1 s | 2.6 s |
| 3 | 56 | 100 | 96 | 100 | 4.3 s | 2,930 ms | 0 | 1.1 s | 2.7 s |

**Median: Performance 56 · Accessibility 100 · Best practices 96 · SEO 100.**

Notes:
- LCP element: the hero tagline `<p>` (text, as required), but it is late because the main thread is
  blocked: ~4.9 s of script bootup in one chunk (three.js + Lanyard, loaded eagerly with the page).
- Total transfer: 861 KiB.
- Best-practices deductions: a console error from the Founder Story mat's hex (Web3) sticker
  (`<polyline points>` contains an `M`, which is invalid) and missing source maps.

## After round 1 (nav + hero), branch `redesign/hero`

Same setup (production build, Lighthouse 12.8.2 mobile, localhost).

| Run | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS | FCP | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 67 | 100 | 96 | 100 | 3.0 s | 1,740 ms | 0 | 1.2 s | 2.3 s |
| 2 | 69 | 100 | 96 | 100 | 3.1 s | 1,310 ms | 0 | 1.2 s | 2.0 s |
| 3 | 67 | 100 | 96 | 100 | 3.1 s | 1,710 ms | 0 | 1.2 s | 2.3 s |

**Median: Performance 67 (+11) · Accessibility 100 · Best practices 96 · SEO 100.**

Notes:
- three.js + the lanyard now load after `load` + idle instead of with the page. The remaining TBT is
  almost entirely the deferred badge mounting (WebGL setup + shader compile): with 4× CPU throttling,
  long-task blocking is ~1,375 ms with the live badge vs ~218 ms when the static still is kept
  (reduced-motion run).
- LCP element is now the badge's static still (`badge-still.webp`, 15 KB), not text: it is the largest
  element in the mobile viewport.
- Best-practices deductions unchanged (legacy Story mat `<polyline>` console error; missing source maps).
