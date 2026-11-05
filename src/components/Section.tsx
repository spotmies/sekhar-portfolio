export default function Section({
  id,
  index,
  eyebrow,
  title,
  children,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-border pt-12 pb-20 sm:pt-16 sm:pb-28">
      {/* Compact header (founder's choice): mono label + one-line title in the hero's serif, so content starts early. */}
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
        {index} — {eyebrow}
      </p>
      <h2 className="mb-10 max-w-5xl font-serif text-[30px] leading-tight font-normal tracking-[-0.01em] text-balance sm:text-[40px]">
        {title}
      </h2>
      {children}
    </section>
  );
}
