"use client";

import { useEffect, useRef, useState } from "react";
import { contact, site } from "@/data/portfolio";
import { MapPin } from "lucide-react";
import { ArrowRight, ArrowUpRight, Check, Copy } from "@/components/HoverIcons";

// 07 Contact (addendum §3 content; the footer below stays as it is, so no curtain reveal).
// Giant masked "Let's talk.", three audience rows, and a contact card with a magnetic
// "Email me", the email + Copy, socials and location.
export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);
  const emailRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);

  // Magnetic button: pointer devices only, no reduced motion. Up to 8px toward the cursor within 80px.
  useEffect(() => {
    const btn = btnRef.current;
    const sec = sectionRef.current;
    if (!btn || !sec) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const R = 80;
    const MAX = 8;
    const move = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // distance from the button's edge, so the radius means the same for a wide pill
      const ex = Math.max(0, Math.abs(dx) - r.width / 2);
      const ey = Math.max(0, Math.abs(dy) - r.height / 2);
      const near = Math.hypot(ex, ey) < R;
      btn.style.transform = near
        ? `translate(${Math.max(-MAX, Math.min(MAX, dx * 0.15))}px, ${Math.max(-MAX, Math.min(MAX, dy * 0.25))}px)`
        : "";
    };
    const reset = () => (btn.style.transform = "");
    sec.addEventListener("pointermove", move);
    sec.addEventListener("pointerleave", reset);
    return () => {
      sec.removeEventListener("pointermove", move);
      sec.removeEventListener("pointerleave", reset);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the address so the visitor can copy it
      const el = emailRef.current;
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  return (
    <section ref={sectionRef} id="contact" aria-labelledby="contact-title" className="border-t border-border pt-12 pb-14 sm:pt-16 sm:pb-16">
      <p className="mb-3 font-mono text-xs tracking-[0.2em] text-accent uppercase">{contact.label}</p>
      {/* Always visible: the scroll reveal could leave it hidden (founder saw an empty gap) */}
      <h2 id="contact-title" className="contact-title font-serif font-normal">
        {contact.title}
      </h2>

      {/* Phones (< 640px, founder 2026-11-05): tighter spacing, lines fill the width, and the card leads with a
          full-width "Email me", equal-size social buttons and the location in its header. Desktop is unchanged. */}
      <div className="mt-8 grid items-start gap-8 sm:mt-12 sm:gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Who it's for */}
        <ul className="border-b border-border lg:col-span-7">
          {contact.audiences.map((a) => (
            <li key={a.label} className="grid gap-2 border-t border-border py-4.5 sm:grid-cols-[14rem_1fr] sm:gap-8 sm:py-6">
              <span className="pt-1 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{a.label}</span>
              <span className="text-lg leading-relaxed sm:text-balance">{a.text}</span>
            </li>
          ))}
        </ul>

        {/* Contact card */}
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 sm:gap-8 sm:p-8 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Email</p>
              <p className="inline-flex items-center gap-1 font-mono text-xs text-muted sm:hidden">
                <MapPin size={13} aria-hidden="true" /> {contact.location}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 max-sm:justify-between">
              <span ref={emailRef} className="font-serif text-xl break-all min-[380px]:text-2xl sm:text-3xl">
                {contact.email}
              </span>
              <button
                type="button"
                onClick={copy}
                className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition hover:border-foreground"
                aria-live="polite"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? contact.copy.done : contact.copy.idle}
              </button>
            </div>
          </div>

          <a
            ref={btnRef}
            href={contact.primary.href}
            className="contact-magnet inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-full bg-foreground px-7 text-base font-medium text-background sm:self-start"
          >
            {contact.primary.label} <ArrowRight size={18} />
          </a>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-5 sm:pt-6">
            <ul className="flex items-center gap-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3 max-sm:gap-2 sm:-ml-2">
              {site.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium transition hover:text-muted max-sm:w-full max-sm:justify-center max-sm:rounded-full max-sm:border max-sm:border-border"
                  >
                    {s.label} <ArrowUpRight size={13} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs text-muted max-sm:hidden">{contact.location}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
