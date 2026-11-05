"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type TechTextType from "@/components/ui/TechText";
import { useIsDark } from "@/lib/useIsDark";

// Canvas can't read CSS variables, so the accent is passed as a real colour (matches --accent).
const ACCENT = { light: "#4f46e5", dark: "#818cf8" };

type TechTextProps = React.ComponentProps<typeof TechTextType>;

// Load timing only (step P): TechText's code loads and mounts when the footer comes within ~1 viewport.
// Until then the same-size box (h-36 / sm:h-52 / lg:h-64) is reserved, so nothing shifts. Look and
// behaviour once mounted are unchanged.
export default function FooterWordmark({ text }: { text: string }) {
  const dark = useIsDark();
  const box = useRef<HTMLDivElement>(null);
  const [Live, setLive] = useState<ComponentType<TechTextProps> | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        import("@/components/ui/TechText").then((mod) => {
          if (!cancelled) setLive(() => mod.default);
        });
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="h-36 text-foreground sm:h-52 lg:h-64">
      {Live ? (
        <Live
          text={text}
          fontWeight={600}
          fontSize={190}
          letterSpacing={-0.05}
          color="currentColor"
          accentColor={dark ? ACCENT.dark : ACCENT.light}
          reveal="letter"
          specks={15}
          intro="metrics"
          introDuration={2.2}
          guides
          clickKick
        />
      ) : (
        <span className="sr-only">{text}</span>
      )}
    </div>
  );
}
