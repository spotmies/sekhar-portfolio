"use client";

import { useRef } from "react";
import Section from "@/components/Section";
import CountUp from "@/components/CountUp";
import CommunityOrbit, { type OrbitItem } from "@/components/ui/builders-community-hero";
import { BriefcaseBusinessIcon } from "@/components/ui/briefcase-business";
import { RocketIcon, type RocketIconHandle } from "@/components/ui/rocket";
import { UsersIcon } from "@/components/ui/users";
import { ShieldCheckIcon } from "@/components/ui/shield-check";
import { achievements } from "@/data/portfolio";

/**
 * 00 Achievements: right after the hero. An orbit (Spotmies: logos on arcs, its numbers, title and summary; wide on
 * lg+, compact below) and three cards under it.
 * Cards rise in on scroll (the site's .npc-reveal), numbers count up, hover lifts a card. All wording is in
 * portfolio.ts (`achievements`).
 */
type Item = (typeof achievements.items)[number];

function Numbers({ numbers }: { numbers: Item["numbers"] }) {
  return (
    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-4 sm:mt-8 sm:gap-x-10">
      {numbers.map((n) => (
        <div key={n.label} className="border-t border-border pt-3">
          <dd className="font-serif text-[34px] leading-none tracking-[-0.02em] sm:text-[48px]">
            <CountUp to={n.to} prefix={n.prefix} suffix={n.suffix} />
          </dd>
          <dt className="mt-1.5 text-[13px] leading-snug text-muted sm:mt-2 sm:text-sm">{n.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/* Orbit (lg and up): logos and labels float on two arcs above the Spotmies numbers. Every label is taken from `achievements`. */
const ORBIT: OrbitItem[] = [
  { kind: "logo", ring: "outer", angle: 138, src: "/brand/nvidia-logo.svg", darkSrc: "/brand/nvidia-logo-dark.svg", alt: "NVIDIA", width: 92 },
  { kind: "pill", ring: "outer", angle: 114, icon: <UsersIcon size={16} />, label: "50K+ users" },
  { kind: "logo", ring: "outer", angle: 90, src: "/brand/spotmies-logo.webp", alt: "Spotmies", width: 104, plate: true },
  { kind: "pill", ring: "outer", angle: 65, icon: <BriefcaseBusinessIcon size={16} />, label: "200+ hiring companies" },
  { kind: "logo", ring: "outer", angle: 41, src: "/brand/microsoft-logo.svg", alt: "Microsoft", width: 100 },
  { kind: "check", ring: "inner", angle: 137, icon: <ShieldCheckIcon size={22} /> },
  { kind: "pill", ring: "inner", angle: 114, icon: <RocketIcon size={16} />, label: "Reaidy" },
  { kind: "logo", ring: "inner", angle: 64, src: "/brand/reaidy-logo.webp", alt: "Reaidy", width: 92, plate: true },
  { kind: "check", ring: "inner", angle: 42, icon: <ShieldCheckIcon size={22} /> },
];

/* Compact orbit (below lg): the three programme/company logos on the outer arc, Reaidy in the middle. */
const ORBIT_COMPACT: OrbitItem[] = [
  { kind: "logo", ring: "outer", angle: 129, src: "/brand/nvidia-logo.svg", darkSrc: "/brand/nvidia-logo-dark.svg", alt: "NVIDIA", width: 74 },
  { kind: "logo", ring: "outer", angle: 90, src: "/brand/spotmies-logo.webp", alt: "Spotmies", width: 84, plate: true },
  { kind: "logo", ring: "outer", angle: 51, src: "/brand/microsoft-logo.svg", alt: "Microsoft", width: 80 },
  { kind: "check", ring: "inner", angle: 148, icon: <ShieldCheckIcon size={18} /> },
  { kind: "logo", ring: "inner", angle: 90, src: "/brand/reaidy-logo.webp", alt: "Reaidy", width: 76, plate: true },
  { kind: "check", ring: "inner", angle: 32, icon: <ShieldCheckIcon size={18} /> },
];

export default function AchievementsSection() {
  const [feature, ...rest] = achievements.items;
  const rocket = useRef<RocketIconHandle>(null);
  return (
    <Section id="achievements" index="00" eyebrow={achievements.eyebrow} title={achievements.title}>
      {/* Wide screens: the orbit shows Spotmies' numbers, title and summary */}
      <div className="hidden lg:block">
        <CommunityOrbit
          items={ORBIT}
          stats={feature!.numbers}
          headline={feature!.title}
          description={feature!.body}
        />
      </div>
      {/* Phones and tablets (2026-11-07): the same orbit, compact. Logos only on the arc; numbers in a 2×2 grid */}
      <div className="lg:hidden">
        <CommunityOrbit
          layout="compact"
          items={ORBIT_COMPACT}
          stats={feature!.numbers}
          headline={feature!.title}
          description={feature!.body}
        />
      </div>

      {/* Phones: the two programme cards side by side, Reaidy full width under them (2026-11-07: less scrolling).
          md: two short cards stacked on the left, Reaidy (with numbers) as a tall card on the right. lg+: one row of three. */}
      <ol className="mt-7 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:mt-6 lg:grid-cols-3">
        {rest.map((a, i) => {
          const tall = a.numbers.length > 0;
          const logo = "logo" in a ? a.logo : null;
          return (
            <li
              key={a.title}
              onMouseEnter={tall ? () => rocket.current?.startAnimation() : undefined}
              onMouseLeave={tall ? () => rocket.current?.stopAnimation() : undefined}
              style={{ "--npc-i": i + 1 } as React.CSSProperties}
              className={
                "npc-reveal group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:border-accent sm:rounded-3xl sm:p-7 lg:p-5 " +
                (tall
                  ? "col-span-2 md:col-span-1 md:col-start-2 md:row-span-2 md:row-start-1 lg:col-start-3 lg:row-span-1"
                  : "col-span-1 md:col-start-1 lg:row-start-1 " + (i === 0 ? "lg:col-start-1" : "lg:col-start-2"))
              }
            >
              <div className={"flex gap-3 " + (logo ? "flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 lg:flex-col lg:items-start lg:gap-2 xl:flex-row xl:items-center xl:gap-3" : "items-center")}>
                {logo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo.src} alt={logo.alt} className={"h-auto w-24 sm:w-32 " + (logo.darkSrc ? "dark:hidden" : "")} />
                    {logo.darkSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo.darkSrc} alt={logo.alt} className="hidden h-auto w-24 sm:w-32 dark:block" />
                    )}
                  </>
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-accent transition group-hover:border-accent group-hover:bg-accent group-hover:text-background">
                    <RocketIcon ref={rocket} size={18} aria-hidden />
                  </span>
                )}
                <p className={"font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-muted uppercase sm:text-xs " + (logo ? "sm:ml-auto lg:ml-0 xl:ml-auto" : "")}>
                  {String(i + 2).padStart(2, "0")} · {a.kicker}
                </p>
              </div>
              <h3 className={"mt-3 font-serif leading-tight text-balance sm:mt-4 sm:text-[28px] lg:mt-3 lg:text-[22px] " + (tall ? "text-[22px]" : "text-[18px]")}>{a.title}</h3>
              <p className={"mt-1.5 leading-relaxed text-pretty text-muted sm:mt-3 sm:text-base lg:mt-2 lg:text-[15px] " + (tall ? "text-[15px]" : "text-[13px]")}>{a.body}</p>
              {tall && (
                // lg+: hidden, the orbit's pills already show 50K+ users and 200+ hiring companies (one-screen fit, 2026-11-07)
                <div className="mt-auto lg:hidden">
                  <Numbers numbers={a.numbers} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
