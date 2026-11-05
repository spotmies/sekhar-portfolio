"use client";

// Static icons: the animated (hover) ones morphed ☰ into ✕ under the finger right after closing the menu.
import { Menu as MenuStatic, X as XStatic } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import PillNav from "@/components/ui/PillNav";
import ThemeToggle from "@/components/ThemeToggle";
import { contact, nav, resolveHref, site } from "@/data/portfolio";
import { useIsDark } from "@/lib/useIsDark";
import { cn } from "@/lib/utils";

// Indigo is used in exactly two places on the site: the full stop after the name, and this active dot.
// Real colours (not CSS variables) because PillNav does contrast maths on them. Matches --accent.
const DOT = { light: "#4f46e5", dark: "#818cf8" };

// Greys only for everything else in the pill: solid surface, solid hover fill, solid logo tile.
const PILL_LOOK = {
  light: {
    bar: "#ffffff",
    "--pn-pill": "#e7e5e4",
    "--pn-pill-ink": "#1c1917",
    "--pn-pill-shadow": "none",
    "--pn-tile": "#f5f5f4",
    "--pn-strong": "#1c1917",
    "--pn-text": "#57534e",
  },
  dark: {
    bar: "#1c1917",
    "--pn-pill": "#292524",
    "--pn-pill-ink": "#f5f5f4",
    "--pn-pill-shadow": "none",
    "--pn-tile": "#292524",
    "--pn-strong": "#f5f5f4",
    "--pn-text": "#a8a29e",
  },
};

const items = nav.map((item) => ({ ...item, href: resolveHref(item.href) }));
const hrefs = items.map((item) => item.href);
const initials = site.name
  .split(" ")
  .map((w) => w[0])
  .join("");

// Which section is crossing the middle of the viewport; "" while on the hero.
function useActiveSection(targets: string[]) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const sections = targets
      .map((href) => document.getElementById(href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const current = sections.find((s) => visible.has(s.id));
        setActive(current ? `#${current.id}` : "");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [targets]);
  return active;
}

const roundButton =
  "grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_6px_16px_-10px_rgba(0,0,0,0.25)] transition hover:bg-background";

export default function Navbar() {
  const dark = useIsDark();
  const active = useActiveSection(hrefs);
  const look = PILL_LOOK[dark ? "dark" : "light"];
  const { bar, ...pillVars } = look;
  const pillStyle: Record<string, string> = { ...pillVars, "--pn-dot": dark ? DOT.dark : DOT.light };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 pt-4">
      {/* Desktop (≥ 1024px): centred pill, theme toggle on the right. Was ≥ 768px; with 8 items the pill no longer fits tablets. */}
      <div className="mx-auto hidden max-w-6xl grid-cols-[44px_1fr_44px] items-center gap-2 px-6 lg:grid">
        <span />
        <div className="pointer-events-auto flex min-w-0 justify-center">
          <PillNav
            logo={<span className="text-[13px] font-bold tracking-tight">{initials}</span>}
            logoAlt={`${initials}, ${site.name}: back to top`}
            logoHref="#top"
            items={items}
            activeHref={active}
            theme={dark ? "dark" : "light"}
            barColor={bar}
            itemStyle="plain"
            hoverEffect="fill"
            indicator="dot"
            surface="solid"
            collapse="never"
            size="md"
            style={pillStyle as CSSProperties}
          />
        </div>
        <ThemeToggle className={cn("pointer-events-auto", roundButton)} />
      </div>

      {/* Mobile and tablet (< 1024px): SJ mark + theme toggle + menu button that opens a floating panel. */}
      <MobileNav active={active} />
    </header>
  );
}

function MobileNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButton.current?.focus());
  }, []);

  // While open: lock page scroll, trap focus inside the sheet, close on Esc.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const focusables = () =>
      Array.from(sheet.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]):not([tabindex="-1"])') ?? []);
    (sheet.current?.querySelector<HTMLElement>("nav a") ?? focusables()[0])?.focus(); // start on the first section

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
    };
  }, [open, close]);

  // Close if the viewport grows past the mobile breakpoint while open.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close first (which unlocks scrolling), then jump to the section.
  const go = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    close(false);
    requestAnimationFrame(() => {
      const target = document.getElementById(href.slice(1));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      history.pushState(null, "", href);

    });
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 lg:hidden">
        <a href="#top" aria-label={`${initials}, ${site.name}: back to top`} className={cn("pointer-events-auto text-[13px] font-bold tracking-tight", roundButton)}>
          {initials}
        </a>
        <div className="pointer-events-auto flex items-center gap-2">
          <ThemeToggle className={roundButton} />
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className={roundButton}
          >
            <MenuStatic size={20} />
          </button>
        </div>
      </div>

      {/* Phone/tablet menu (founder, 2026-11-05): a floating glass panel under the bar, the page dimmed behind.
          Replaces the full-screen list of big words. Tapping the dimmed page closes it. */}
      {open && (
        <div
          ref={sheet}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="menu-in pointer-events-auto fixed inset-0 z-[60] lg:hidden"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => close(false)}
            className="menu-dim absolute inset-0 h-full w-full cursor-default bg-black/35 backdrop-blur-[2px]"
          />
          {/* The bar again, above the dim, so the close button sits exactly where the menu button was. */}
          <div className="relative flex items-center justify-between px-4 pt-4">
            <span className={cn("text-[13px] font-bold tracking-tight", roundButton)} aria-hidden>
              {initials}
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle className={roundButton} />
              <button type="button" aria-label="Close menu" onClick={(e) => close(e.detail === 0) /* focus back to ☰ only for keyboard */} className={roundButton}>
                {/* Static icon: the animated one restarted under the opening tap and could stay invisible */}
                <XStatic size={20} />
              </button>
            </div>
          </div>
          <div
            style={{ background: "color-mix(in oklab, var(--card) 90%, transparent)" }} /* more solid than .glass: the list must read over busy sections */
            className="menu-panel glass relative mx-4 mt-3 max-h-[calc(100svh-6rem)] overflow-y-auto rounded-3xl p-2 sm:mx-auto sm:max-w-md">
            <nav aria-label="Main">
              <ul>
                {items.map((item, i) => {
                  const isActive = item.href === active;
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={go(item.href)}
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-4 rounded-2xl px-4 text-[17px] transition-colors",
                          isActive ? "bg-foreground/[0.06] text-foreground" : "text-foreground/85 hover:bg-foreground/[0.04]",
                        )}
                      >
                        <span className={cn("w-5 font-mono text-[11px] tracking-wider", isActive ? "text-accent" : "text-muted")} aria-hidden>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mx-2 mt-2 flex items-center justify-between gap-3 border-t border-border px-2 pt-3 pb-2">
              <a
                href={contact.primary.href}
                className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-medium text-background"
              >
                {contact.primary.label} <span aria-hidden>→</span>
              </a>
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">{site.location}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
