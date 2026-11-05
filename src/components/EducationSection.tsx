import Timeline from "@/components/ui/timeline";
import { education } from "@/data/portfolio";

/**
 * 02 Education journey (ui/timeline). Full-bleed: the pinned track slides across the whole viewport, so this
 * renders outside the page's max-w-6xl column. The section label sits in the column like every other section's.
 * Colours come from the site's tokens; the accent replaces the demo's orange.
 */
export default function EducationSection() {
  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="border-t border-border pt-12 sm:pt-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{education.label}</p>
        </div>
      </div>
      <Timeline
        id="education"
        items={education.steps}
        title={education.title}
        periodLabel={education.periodLabel}
        imageUrl={education.image.src}
        imageAlt={education.image.alt}
        imagePosition={education.image.position}
        imageAspect={education.image.aspect}
        textColor="var(--color-foreground)"
        mutedTextColor="var(--color-muted)"
        activeColor="var(--color-accent)"
        backgroundColor="var(--color-background)"
        duration={1.4}
      />
    </div>
  );
}
