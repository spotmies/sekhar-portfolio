import HeroBadge from "@/components/HeroBadge";
import HeroDrift from "@/components/HeroDrift";
import { DeferredSideRays } from "@/components/ui/SideRays";
import { hero, resolveHref } from "@/data/portfolio";

const HERO_ID = "hero";

/**
 * Hero: a two-column composition on desktop (≥ 1024px).
 *   Left (~55%): "between / Hardware / & Software." → H1 name → role → bio → CTAs → trail.
 *   Right: the hanging ID badge. Its strap starts at the top of the page; its size and drop follow the
 *   viewport height (--H in globals.css) and the left column is centred on the card, so the two balance.
 * 768–1023px everything stacks: the text first, then the badge.
 * Phones (≤ 767px, founder 2026-11-05): statement on top, then name + role beside a smaller card, then bio,
 * CTAs and trail, so the card is on the first screen (grid in globals.css, "Hero on phones").
 */
export default function Hero() {
  const { statement: s } = hero;

  return (
    <section id={HERO_ID} aria-labelledby="hero-title" className="hero relative isolate overflow-x-clip">
      {/* TRIAL: monochrome light rays behind everything (React Bits SideRays), dark theme only. Ignores the
          pointer for clicks, so the badge's drag/flip are unaffected; mounted after load + idle. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <DeferredSideRays
          darkOnly
          rayColor1="#ffffff"
          rayColor2="#d4d4d4"
          saturation={0}
          origin="top-right"
          speed={2.5}
          intensity={1.2}
          spread={2}
          density={5}
          sharpness={0.5}
          followMouse
          mouseInfluence={0.5}
          opacity={0.8}
        />
      </div>

      {/* Light theme: the same moving rays as warm sunlight. The shader's light mode draws tinted rays that
          read on a pale background (the white rays above would vanish there). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <DeferredSideRays
          lightOnly
          lightMode
          rayColor1="#f5b45a"
          rayColor2="#ffd9a0"
          blend={0.45}
          saturation={0.85}
          origin="top-right"
          speed={2.5}
          intensity={1.3}
          spread={2}
          density={5}
          sharpness={0.5}
          glow={0.8}
          followMouse
          mouseInfluence={0.5}
          opacity={0.7}
        />
      </div>

      {/* Faint outline year marker (decorative). Only on wide screens, where it is clear of the strap. */}
      <div aria-hidden className="hero-marker pointer-events-none absolute hidden items-start gap-1 xl:flex">
        <Asterisk />
        <span className="hero-outline font-sans text-[1em] leading-none font-medium tracking-tight">{hero.marker}</span>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hero-box relative">
          <div className="hero-copy relative z-20">
            {/* The statement: between / Hardware / & Software. Screen readers hear it once, as one phrase. */}
            <p className="sr-only">{s.spoken}</p>
            <div aria-hidden className="hero-statement font-serif">
              <span className="hero-lead block text-[28px] italic leading-none lg:text-[34px]">{s.lead}</span>
              <span className="hero-line hero-drift-l mt-2 block">
                <span className="hero-giant" style={{ animationDelay: "120ms" }}>
                  {s.first}
                </span>
              </span>
              <span className="hero-line hero-drift-r block">
                <span className="hero-giant" style={{ animationDelay: "240ms" }}>
                  <span className="hero-amp italic">{s.joiner}</span> {s.second}
                </span>
              </span>
            </div>

            <h1 id="hero-title" className="hero-name mt-10 font-serif text-[44px] leading-none font-normal tracking-[-0.01em] sm:text-[48px] lg:text-[60px]">
              {hero.name}
              <span className="text-accent">.</span>
            </h1>
            <p className="hero-role mt-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">{hero.role}</p>

            <div className="hero-identity">
              <p className="hero-bio mt-4 max-w-[60ch] text-[17px] leading-relaxed text-muted">{hero.bio}</p>
              <div className="hero-ctas mt-7 flex flex-wrap gap-3">
                <a
                  href={resolveHref(hero.ctas.primary.href)}
                  className="press inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
                >
                  {hero.ctas.primary.label}
                </a>
                <a
                  href={resolveHref(hero.ctas.secondary.href)}
                  className="press glass inline-flex h-11 items-center rounded-full px-6 text-sm font-medium"
                >
                  {hero.ctas.secondary.label}
                </a>
              </div>

              {/* Venture trail */}
              <nav aria-label="Ventures" className="hero-trail mt-6">
                <ol className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">
                  {hero.trail.map((t, i) => (
                    <li key={t.href} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden>→</span>}
                      <a href={resolveHref(t.href)} className="inline-flex min-h-11 items-center underline-offset-4 transition hover:text-foreground hover:underline">
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>

          {/* The ID badge: second grid column on desktop, below the text on smaller screens. */}
          <HeroBadge alt={hero.badgeAlt} hint={hero.badgeHint} className="relative z-10" />
        </div>
      </div>

      <HeroDrift heroId={HERO_ID} />
    </section>
  );
}

function Asterisk() {
  // "✳" drawn as an outline so it matches the outline year without relying on a symbol font.
  return (
    <svg viewBox="0 0 40 40" className="mt-[0.06em] h-[0.62em] w-[0.62em]" fill="none" stroke="var(--muted)" strokeWidth="1" aria-hidden>
      <path d="M17.5 2h5v13.2l9.3-9.3 3.5 3.5-9.3 9.3H39v5H26l9.3 9.3-3.5 3.5-9.3-9.3V38h-5V26.2l-9.3 9.3-3.5-3.5 9.3-9.3H1v-5h13l-9.3-9.3 3.5-3.5 9.3 9.3z" />
    </svg>
  );
}
