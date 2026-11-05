import Section from "@/components/Section";
import { ArrowUpRight } from "@/components/HoverIcons";
import { NotchedProjectCard } from "@/components/ui/notched-project-card";
import { projects, type Project } from "@/data/portfolio";

/**
 * 05 Projects (addendum-02 §2) as notched cards (founder's UI choice, ui/notched-project-card).
 * Only real fields are passed on: a null field never reaches the card, and no role is guessed.
 * Covers sit in black and white and take their colour back on hover, like the component's demo.
 * A card links out only when the project has a link; until then it isn't clickable (the arrow still animates).
 */

function builtWithLine(p: Project) {
  if (p.builtWith === "solo") return "Solo project";
  if (p.builtWith) return `Built with the ${p.builtWith}`;
  return undefined;
}

export default function ProjectsSection() {
  return (
    <Section id="projects" index="05" eyebrow={projects.eyebrow} title={projects.title}>
      <p className="-mt-4 mb-12 max-w-[60ch] text-lg leading-relaxed text-pretty text-muted">{projects.intro}</p>
      <div className="grid gap-x-6 gap-y-14 min-[700px]:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
        {projects.items.map((p, i) => (
          <NotchedProjectCard
            key={p.name}
            revealIndex={i}
            href={p.link ?? undefined}
            title={p.name}
            description={[p.oneLine, p.myRole && `My role: ${p.myRole}.`, p.outcome].filter(Boolean).join(" ") || undefined}
            image={p.image?.src ?? ""}
            imageAlt={p.image?.alt ?? ""}
            badge={p.year ?? undefined}
            tags={[p.type, ...(p.stack?.slice(0, 4) ?? [])].filter((t): t is string => Boolean(t))}
            meta={builtWithLine(p)}
            monochrome
            accent="var(--color-accent)"
            accentForeground="#ffffff"
          />
        ))}
      </div>
      <p className="mt-12">
        <a
          href={projects.more.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted underline-offset-4 transition hover:text-foreground hover:underline"
        >
          {projects.more.label} <ArrowUpRight size={14} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </Section>
  );
}
