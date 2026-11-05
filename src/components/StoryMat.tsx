"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { FounderMatProps } from "@/components/FounderMat";

/**
 * Loads the interactive cutting mat only when #story is within about one viewport. Until then (and without
 * JavaScript) it shows `children`: a server-rendered list of the same chapters, so the copy is always in the HTML.
 */
export default function StoryMat({ children, ...props }: FounderMatProps & { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [Mat, setMat] = useState<ComponentType<FounderMatProps> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import("@/components/FounderMat").then((mod) => {
          if (!cancelled) setMat(() => mod.default);
        });
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  return <div ref={ref}>{Mat ? <Mat {...props} /> : children}</div>;
}
