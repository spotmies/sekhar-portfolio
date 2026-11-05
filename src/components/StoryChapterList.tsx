import type { StoryChapter, StoryMatText } from "@/data/portfolio";
import { ArrowRight } from "@/components/HoverIcons";

// Static version of the story chapters: shown before the mat loads and when JavaScript is off.
export default function StoryChapterList({ chapters, text }: { chapters: StoryChapter[]; text: StoryMatText }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-[28px] border border-border bg-border md:grid-cols-2">
      {chapters.map((c, i) => (
        <li key={c.id} className="bg-card p-6 sm:p-8">
          <p className="flex flex-wrap justify-between gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span>{c.act}</span>
            <span>
              {text.chapter} {String(i + 1).padStart(2, "0")}
            </span>
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">{c.kicker}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-balance">{c.title}</h3>
          <p className="mt-3 leading-relaxed text-muted">{c.body}</p>
          {typeof c.learned === "string" ? (
            <p className="mt-4 text-sm">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted">{text.learned}: </span>
              {c.learned}
            </p>
          ) : (
            <a href={c.learned.href} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
              {c.learned.label.replace(/^→\s*/, "")} <ArrowRight size={14} />
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
