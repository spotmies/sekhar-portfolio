"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Section from "@/components/Section";
import { ArrowUpRight } from "@/components/HoverIcons";
import { GanttTimeline, type GanttTimelineTask } from "@/components/ui/gantt-timeline";
import { PinnedCards } from "@/components/ui/pinned-cards";
import { experience, type ExperienceRole, type ExperienceStint } from "@/data/portfolio";

/**
 * 05 Experience (founder, 2026-11-05), in two parts, both in the founder's chosen styles:
 * 1. A calendar-style timeline (ui/gantt-timeline, after the 21st.dev gantt look): organisations as lanes,
 *    one two-tone bar each, Year / Month zoom, hover tooltip with start, end and duration.
 * 2. A compact row of pinned notes (ui/pinned-cards, after the 21st.dev how-it-works look), oldest first,
 *    each with the role's dates and its own totals; the one-liner and tags show on hover / focus.
 * - Every fact comes from `experience` in portfolio.ts. Durations are computed from the dates (LinkedIn's
 *   inclusive count: Apr 2020 – Nov 2026 = 6 yrs 8 mos), so they never go stale.
 * - Totals only, no growth % (founder's choice; the master doc forbids growth rates without dated evidence).
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type YM = { y: number; m: number }; // m: 0–11
const parseYM = (s: string): YM => {
  const [y, m] = s.split("-").map(Number);
  return { y, m: m - 1 };
};
// "Now" is read in the browser only (Next can't prerender new Date()); the server draws up to `experience.asOf`.
const noSubscribe = () => () => {};
const clientMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const useNowYM = (): YM => parseYM(useSyncExternalStore(noSubscribe, clientMonth, () => experience.asOf));
const endOf = (s: ExperienceStint, now: YM) => (s.end ? parseYM(s.end) : now);
const monthIndex = (a: YM) => a.y * 12 + a.m;
const fmt = (a: YM) => `${MONTHS[a.m]} ${a.y}`;

function duration(start: YM, end: YM) {
  const total = monthIndex(end) - monthIndex(start) + 1; // inclusive, like LinkedIn
  const y = Math.floor(total / 12);
  const m = total % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" ");
}

const range = (s: ExperienceStint) => `${fmt(parseYM(s.start))} – ${s.end ? fmt(parseYM(s.end)) : "Present"}`;

/* A role's overall span: earliest start to latest end (or now). */
function roleSpan(r: ExperienceRole, now: YM) {
  const first = r.stints.map((s) => parseYM(s.start)).sort((a, b) => monthIndex(a) - monthIndex(b))[0];
  const ongoing = r.stints.some((s) => !s.end);
  const last = ongoing ? now : r.stints.map((s) => endOf(s, now)).sort((a, b) => monthIndex(b) - monthIndex(a))[0];
  return { first, last, ongoing };
}

/* Count-up for values like "50K+", "40+", "200+": animates the number, keeps prefix and suffix. */
function CountUp({ value, run }: { value: string; run: boolean }) {
  const match = value.match(/^(\D*)(\d+)(.*)$/);
  const [shown, setShown] = useState<string>(value);
  useEffect(() => {
    if (!run || !match) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = match;
    const target = Number(num);
    const t0 = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(`${pre}${Math.round(target * eased)}${post}`);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, value]);
  return (
    <span className="tabular-nums" aria-hidden="true">
      {shown}
    </span>
  );
}

/* A role's totals, compact: value over label, two per line; they count up when they come into view. */
function Metrics({ metrics }: { metrics: NonNullable<ExperienceRole["metrics"]> }) {
  const ref = useRef<HTMLDListElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setRun(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div>
      <dl ref={ref} className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {metrics.items.map((m) => (
          <div key={m.label}>
            <dt className="sr-only">{m.label}</dt>
            <dd>
              <span className="sr-only">{m.value}</span>
              <span className="block font-serif text-[22px] leading-none">
                <CountUp value={m.value} run={run} />
              </span>
              <span className="mt-1 block text-[11px] leading-tight text-muted" aria-hidden="true">
                {m.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {metrics.growth && (
        // Growth as two dated values, no computed % (founder, 2026-11-05)
        <div className="mt-3 rounded-lg border border-border bg-card px-3 py-2">
          <p className="font-mono text-[9px] tracking-widest text-muted uppercase">{metrics.growth.label} growth</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-[22px] leading-none">{metrics.growth.from.value}</span>
            <span className="text-[11px] text-muted">{metrics.growth.from.date}</span>
            <span aria-label="to" className="text-accent">→</span>
            <span className="font-serif text-[22px] leading-none">{metrics.growth.to.value}</span>
            <span className="text-[11px] text-muted">{metrics.growth.to.date}</span>
          </p>
        </div>
      )}
      <p className="mt-2.5 font-mono text-[9px] tracking-widest text-muted uppercase">{metrics.scope}</p>
      {metrics.extra && (
        // A second group with its own source (e.g. one dated post), kept apart from the team-reported totals
        <div className="mt-3 border-t border-dashed border-border pt-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {metrics.extra.items.map((m) => (
              <div key={m.label}>
                <dt className="sr-only">{m.label}</dt>
                <dd>
                  <span className="sr-only">{m.value}</span>
                  <span className="block font-serif text-[22px] leading-none">
                    <CountUp value={m.value} run={run} />
                  </span>
                  <span className="mt-1 block text-[11px] leading-tight text-muted" aria-hidden="true">
                    {m.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 font-mono text-[9px] tracking-widest text-muted uppercase">{metrics.extra.scope}</p>
        </div>
      )}
    </div>
  );
}

/* Founder-confirmed milestones (programmes, grants, events), in his wording. */
function Highlights({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((h) => (
        <li key={h} className="flex gap-2 text-[13px] leading-snug text-foreground">
          <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{h}</span>
        </li>
      ))}
    </ul>
  );
}

function About({ r }: { r: ExperienceRole }) {
  return (
    <div>
      {r.oneLine && <p className="text-[13px] leading-snug tracking-tight text-pretty text-muted">{r.oneLine}</p>}
      {r.tags.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1">
          {r.tags.map((t) => (
            <li key={t} className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[9px] tracking-[0.08em] text-muted uppercase">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Spotmies and Reaidy.io cards stay lean (founder, 2026-11-05: too crowded): no figures, team growth or
   highlights here; the figures are in the Ventures book. The data stays in portfolio.ts. */
const LEAN_CARDS = new Set(["spotmies", "reaidy"]);

/* Compact note: who, where, how long; the one-liner and tags; then the highlights and numbers. Everything is
   always shown (founder, 2026-11-05: the hover swap left an empty gap when the shorter face was showing). */
function RoleCard({ r, now }: { r: ExperienceRole; now: YM }) {
  const { first, last } = roleSpan(r, now);
  const lead = r.stints[0];
  const earlier = r.stints.slice(1);
  return (
    <>
      <h3 className="text-[15px] leading-snug font-semibold tracking-tight text-foreground">{lead.title}</h3>
      <p className="text-sm">
        {r.href ? (
          <a href={r.href} target="_blank" rel="noopener noreferrer" className="relative z-10 -my-1 inline-flex items-baseline gap-1 py-1 underline-offset-4 hover:underline">
            {r.org} <ArrowUpRight size={12} />
          </a>
        ) : (
          r.org
        )}
      </p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-muted uppercase">
        {r.employment} · {r.location}
        {r.stints.length === 1 && lead.workplace && ` · ${lead.workplace}`} · {duration(first, last)}
      </p>
      {earlier.map((s) => (
        <p key={s.title} className="mt-1 text-[11px] leading-snug text-muted">
          <span className="text-foreground">{s.title}</span> · {range(s)}
        </p>
      ))}
      <div className="mt-3 space-y-3 border-t border-border pt-3">
        <About r={r} />
        {!LEAN_CARDS.has(r.id) && r.highlights.length > 0 && <Highlights items={r.highlights} />}
        {!LEAN_CARDS.has(r.id) && r.metrics && <Metrics metrics={r.metrics} />}
      </div>
    </>
  );
}

export default function ExperienceSection() {
  const now = useNowYM();
  // Newest first (founder, 2026-11-05; was oldest first): by each role's earliest start.
  const roles = [...(experience.roles as ExperienceRole[])].sort(
    (a, b) => monthIndex(roleSpan(b, now).first) - monthIndex(roleSpan(a, now).first),
  );
  // One bar per organisation, grouped by employment type. Spotmies' two titles share one bar, solid to now (founder,
  // 2026-11-05: it was two-tone, dim after the CTO years ended); the tooltip still lists the CTO end date.
  const tasks: GanttTimelineTask[] = roles.map((r) => {
    const { first, last, ongoing } = roleSpan(r, now);
    const ended = r.stints.filter((s) => s.end);
    const split = r.stints.length > 1 && ended.length ? ended[0] : null;
    return {
      id: r.id,
      lane: r.employment, // lanes from the data: Full-time / Part-time
      label: r.org,
      start: monthIndex(first),
      end: monthIndex(last),
      ongoing,
      // Founder (2026-11-05): Spotmies runs bright all the way to now (it is ongoing); the CTO end date stays in the tooltip.
      brightUntil: undefined,
      tooltip: [
        { label: "Role", value: r.stints[0].title },
        { label: "Start", value: fmt(first) },
        ...(split ? [{ label: split.title, value: `until ${fmt(parseYM(split.end as string))}` }] : []),
        { label: "End", value: ongoing ? "Present" : fmt(last) },
        { label: "Duration", value: duration(first, last) },
      ],
    };
  });

  // Projects with known years (founder, 2026-11-05), in their own lane. Years only, so the bars are hatched
  // and span whole years; the tooltip says so.
  const projectTasks: GanttTimelineTask[] = experience.projects.map((p) => ({
    id: `project-${p.id}`,
    lane: "Projects",
    label: p.name,
    start: p.fromYear * 12,
    end: p.toYear * 12 + 11,
    approx: true,
    tooltip: [
      { label: "Type", value: p.type },
      { label: "Years", value: `${p.fromYear} – ${p.toYear}` },
      { label: "Dates", value: "years only" },
    ],
  }));

  return (
    <Section id="experience" index="05" eyebrow={experience.eyebrow} title={experience.title}>
      <GanttTimeline
        tasks={[...tasks, ...projectTasks]}
        label={`Roles and projects from ${experience.axisStart} to now`}
        title="Timeline"
        hint="Hover a bar or use the arrow keys"
        touchHint="Tap a bar"
        axisStart={experience.axisStart * 12}
        axisEnd={(now.y + 1) * 12}
        now={monthIndex(now)}
      />

      <PinnedCards
        className="mt-8"
        cards={roles.map((r) => {
          const { first, last, ongoing } = roleSpan(r, now);
          return {
            id: r.id,
            emphasis: ongoing,
            label: `${r.stints[0].title}, ${r.org}`,
            number: ongoing ? `${first.y} — now` : first.y === last.y ? `${first.y}` : `${first.y} — ${last.y}`,
            children: <RoleCard r={r} now={now} />,
          };
        })}
      />
    </Section>
  );
}
