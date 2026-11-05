"use client";

import { Moon, Sun } from "@/components/HoverIcons";

export default function ThemeToggle({
  className = "rounded-full border border-border p-2 text-muted transition hover:text-foreground",
}: {
  className?: string;
}) {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={className}
    >
      {/* Sun (shown in dark mode) / Moon (shown in light mode): animated icons from @lucide-animated */}
      <Sun size={16} className="hidden dark:inline-flex" />
      <Moon size={16} className="dark:hidden" />
    </button>
  );
}
