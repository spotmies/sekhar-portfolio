import Section from "@/components/Section";
import { ProjectShowcase, type ShowcaseItem } from "@/components/ui/project-showcase";
import { testimonials, type Testimonial } from "@/data/portfolio";

/**
 * 07 Testimonials (addendum-02 §3) in the founder's chosen UI (ui/project-showcase): a stack of photos on one side,
 * the person, their role and their words on the other, with Previous / Next. Quotes come from portfolio.ts exactly
 * as approved and are never edited here. No autoplay. No Review/Quotation JSON-LD (spec: only if every field is real).
 *
 * With fewer than `minToShow` real entries the same UI shows the [bracketed] placeholder slots (founder's request).
 */

// The showcase needs a picture per entry. Until a person's photo is supplied (with permission), a neutral photo
// stands in. Seeds checked: no people (a stranger's face next to a quote would read as that person).
const STAND_INS = [
  "https://picsum.photos/seed/indie-skull/1200/876",
  "https://picsum.photos/seed/oscar-chat/1200/876",
  "https://picsum.photos/seed/campus-books/1200/876",
];

function toItem(t: Testimonial, i: number): ShowcaseItem {
  const who = [t.role, t.company].filter(Boolean).join(", ");
  return {
    quote: t.quote,
    name: t.name,
    designation: [who, t.relationship, t.context].filter(Boolean).join(" · "),
    src: t.photo?.src ?? STAND_INS[i % STAND_INS.length]!,
    alt: t.photo?.alt ?? "",
    link: t.link ?? undefined,
  };
}

export default function TestimonialsSection() {
  const real = testimonials.items.length >= testimonials.minToShow;
  const items = (real ? testimonials.items : testimonials.placeholders).map(toItem);
  return (
    <Section id="testimonials" index="07" eyebrow={testimonials.eyebrow} title={testimonials.title}>
      <ProjectShowcase
        imageAspectRatio={1} // square: the client photos are headshots (2026-11-05)
        testimonials={items}
        colors={{ name: "var(--color-foreground)", position: "var(--color-muted)", testimony: "var(--color-foreground)" }}
        fontSizes={{ name: "2rem", position: "0.875rem", testimony: "1.25rem" }}
        mobile={{
          fontSizes: { name: "1.5rem", position: "0.8125rem", testimony: "0.975rem" },
          spacing: { testimonyTop: "0.75em", testimonyBottom: "1.25em", nameBottom: "0.2em" },
        }}
        spacing={{
          top: "0",
          bottom: "0",
          lineHeight: "1.5",
          nameTop: "0",
          nameBottom: "0.35em",
          positionTop: "0",
          positionBottom: "0.25em",
          testimonyTop: "1.25em",
          testimonyBottom: "1.5em",
        }}
        nameClassName="font-serif font-normal leading-tight"
        outlineColor="var(--color-border)"
        hoverOutlineColor="var(--color-accent)"
        buttonInscriptions={{ previousButton: "Previous", nextButton: "Next", openWebAppButton: "View on LinkedIn" }}
        halomotButtonGradient="linear-gradient(to right, var(--color-accent), #8b5cf6)"
        halomotButtonBackground="var(--color-background)"
        halomotButtonTextColor="var(--color-foreground)"
        halomotButtonHoverTextColor="#ffffff"
        halomotButtonOuterBorderRadius="9999px"
        halomotButtonInnerBorderRadius="9999px"
      />
    </Section>
  );
}
