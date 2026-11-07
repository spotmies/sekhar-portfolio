import Navbar from "@/components/Navbar";
import Section from "@/components/Section";
import CurrentYear from "@/components/CurrentYear";
import Hero from "@/components/Hero";
import OpenPlanLogo from "@/components/OpenPlanLogo";
import AssemblySteps from "@/components/bench/AssemblySteps";
import VenturesBook from "@/components/VenturesBook";
import { ArrowRight, ArrowUp, ArrowUpRight } from "@/components/HoverIcons";
import FooterWordmark from "@/components/FooterWordmark";
import StoryMat from "@/components/StoryMat";
import StoryChapterList from "@/components/StoryChapterList";
import {
  openplan,
  principles,
  profile,
  site,
  story,
  trackRecord,
} from "@/data/portfolio";
import InkOrbitFeatures from "@/components/ui/ink-orbit-features";
import ContactSection from "@/components/ContactSection";
// import ProjectsSection from "@/components/ProjectsSection"; // hidden for now (founder, 2026-11-05)
import ExperienceSection from "@/components/ExperienceSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import EducationSection from "@/components/EducationSection";
import AchievementsSection from "@/components/AchievementsSection";

const primaryBtn =
  "rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"; // step 8: black pill (light) / white pill (dark)
const secondaryBtn =
  "rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:border-foreground";

export default function Home() {

  return (
    <>
      <Navbar />
      <main id="top" className="w-full flex-1">
        <Hero />

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* 00 Achievements (founder, 2026-11-06): straight after the hero */}
        <AchievementsSection />

        {/* 01 Story */}
        <Section id="story" index="01" eyebrow="Story" title={story.title}>
          <StoryMat chapters={story.chapters} text={story.mat}>
            <StoryChapterList chapters={story.chapters} text={story.mat} />
          </StoryMat>
          <p className="mt-16 max-w-4xl font-serif text-3xl leading-tight text-balance sm:mt-20 sm:text-5xl">
            {story.closing}
          </p>
        </Section>
        </div>

        {/* 02 Education journey (founder, 2026-11-04): full-bleed pinned timeline, so it sits outside the column */}
        <EducationSection />

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">

        {/* 03 Now building: OpenPlan AI (brief §2.3). Own section so the nav's OpenPlan and Ventures targets don't overlap. */}
        <Section
          id="openplan"
          index="03"
          eyebrow="Now building"
          title={
            <span className="inline-flex items-center gap-3">
              <OpenPlanLogo className="h-8 w-8 sm:h-10 sm:w-10" />
              {openplan.title}
            </span>
          }
        >
          {/* Lead + meta row under the heading (step 2), then the Change Bench figure */}
          {openplan.lead && (
            <p className="-mt-4 max-w-[60ch] text-lg leading-relaxed text-pretty text-muted">{openplan.lead}</p>
          )}
          <p className="mt-3 mb-10 flex flex-wrap items-center gap-x-3 font-mono text-xs tracking-[0.12em] text-muted uppercase">
            {openplan.meta.map((m) => (
              <span key={m} className="after:ml-3 after:content-['·']">
                {m}
              </span>
            ))}
            <a
              href={openplan.siteLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 underline-offset-4 transition hover:text-foreground hover:underline"
            >
              {openplan.siteLink.label} <ArrowUpRight size={13} />
            </a>
          </p>
          {/* The problem + what it does, as seven scroll steps that build the product (Fig 03) */}
          <AssemblySteps
            steps={[
              ...openplan.problems.map((p) => ({ group: openplan.problemsLabel, title: p.title, body: p.body })),
              ...openplan.capabilities.map((c) => ({ group: openplan.capabilitiesLabel, title: c.title, body: c.body })),
            ]}
          />

          {/* Why me + CTAs */}
          <div className="mt-20 grid items-end gap-10 lg:grid-cols-12">
            <blockquote className="font-serif text-3xl leading-tight text-balance lg:col-span-7 sm:text-[40px]">
              &ldquo;{openplan.whyMe}&rdquo;
            </blockquote>
            <div className="flex flex-wrap items-center gap-4 lg:col-span-5 lg:justify-end">
              <a href={openplan.ctas.primary.href} target="_blank" rel="noopener noreferrer" className={primaryBtn + " inline-flex items-center gap-1.5"}>
                {openplan.ctas.primary.label} <ArrowUpRight size={16} />
              </a>
              <a href={openplan.ctas.secondary.href} className={secondaryBtn + " inline-flex items-center gap-1.5"}>
                {openplan.ctas.secondary.label} <ArrowRight size={16} />
              </a>
              <a href={openplan.ctas.tertiary.href} className="-my-1 w-full py-1 text-sm text-muted underline-offset-4 transition hover:text-foreground hover:underline lg:text-right">
                {openplan.ctas.tertiary.label} <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </Section>

        {/* 04 Ventures (brief §2.4 content): a book that opens on scroll, Spotmies left, Reaidy right */}
        <Section id="ventures" index="04" eyebrow="Ventures" title={trackRecord.title}>
          <VenturesBook coverKicker="04 — Ventures" />
        </Section>

        {/* 05 Experience (founder, 2026-11-05): career span chart + roles, each with its own totals */}
        <ExperienceSection />

        {/* Projects (addendum-02 §2): HIDDEN for now (founder, 2026-11-05, "comment down"). Component and data are kept;
            to restore, uncomment this, re-add the nav item in portfolio.ts and renumber the sections after it.
        <ProjectsSection />
        */}

        {/* 06 How I build (brief §2.5; renumbered): the 4 principles in a bento of live diagrams (restored at the founder's request), then the vision line */}
        <Section id="principles" index="06" eyebrow="How I build" title={principles.title}>
          <InkOrbitFeatures
            flow={{
              ...principles.diagrams.flow,
              left: { number: "01", title: principles.items[0].claim, description: principles.items[0].evidence },
              right: { number: "02", title: principles.items[1].claim, description: principles.items[1].evidence },
            }}
            parts={{
              ...principles.diagrams.parts,
              number: "03",
              title: principles.items[2].claim,
              description: principles.items[2].evidence,
            }}
            chart={{
              ...principles.diagrams.chart,
              number: "04",
              title: principles.items[3].claim,
              description: principles.items[3].evidence,
            }}
          />
          <p className="mt-16 max-w-4xl font-serif text-3xl leading-tight text-balance text-muted sm:mt-20 sm:text-[40px]">
            {principles.vision}
          </p>
        </Section>

        {/* 07 Testimonials (addendum-02 §3): placeholder slots until there are 2+ real, approved quotes. Not in the nav. */}
        <TestimonialsSection />

        {/* 08 Contact (addendum §3 content; footer below unchanged by founder's choice) */}
        <ContactSection />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 pt-2 sm:px-6">
          <FooterWordmark text={profile.name} />
        </div>
        <div className="mx-auto mt-2 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <p>
            © <CurrentYear /> {profile.name} · {profile.location}
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {site.footerSocials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="-my-1 inline-flex items-center gap-1 py-1 transition hover:text-foreground">
                  {s.label} <ArrowUpRight size={13} />
                </a>
              </li>
            ))}
            <li>
              <a href="#top" className="-my-1 inline-flex items-center gap-1 py-1 transition hover:text-foreground">
                Back to top <ArrowUp size={13} />
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
