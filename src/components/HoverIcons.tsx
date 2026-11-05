"use client";

import { useEffect, useRef, type ForwardRefExoticComponent, type HTMLAttributes, type RefAttributes } from "react";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { ArrowUpRightIcon } from "@/components/ui/arrow-up-right";
import { ArrowUpIcon } from "@/components/ui/arrow-up";
import { CopyIcon } from "@/components/ui/copy";
import { CheckIcon } from "@/components/ui/check";
import { LayersIcon } from "@/components/ui/layers";
import { GitPullRequestIcon } from "@/components/ui/git-pull-request";
import { WorkflowIcon } from "@/components/ui/workflow";
import { LinkIcon } from "@/components/ui/link";
import { SunIcon } from "@/components/ui/sun";
import { MoonIcon } from "@/components/ui/moon";
import { MenuIcon } from "@/components/ui/menu";
import { XIcon } from "@/components/ui/x";

// Animated icons from @lucide-animated. Each one animates when its whole host (the nearest link, button or
// [data-icon-host] element) is hovered or focused, not just the small icon itself. Static under reduced
// motion. Always decorative (aria-hidden): the host's text carries the meaning.

type Handle = { startAnimation: () => void; stopAnimation: () => void };
type IconComp = ForwardRefExoticComponent<HTMLAttributes<HTMLSpanElement> & { size?: number } & RefAttributes<Handle>>;
type Props = { size?: number; className?: string };

function HoverIcon({ icon: Icon, size = 16, className }: Props & { icon: IconComp }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const icon = useRef<Handle>(null);
  useEffect(() => {
    const el = wrap.current;
    const host = el?.closest<HTMLElement>("a,button,[data-icon-host]") ?? el;
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const on = () => icon.current?.startAnimation();
    const off = () => icon.current?.stopAnimation();
    host.addEventListener("pointerenter", on);
    host.addEventListener("pointerleave", off);
    host.addEventListener("focusin", on);
    host.addEventListener("focusout", off);
    return () => {
      host.removeEventListener("pointerenter", on);
      host.removeEventListener("pointerleave", off);
      host.removeEventListener("focusin", on);
      host.removeEventListener("focusout", off);
    };
  }, []);
  return (
    <span ref={wrap} aria-hidden="true" className={cn("pointer-events-none inline-flex shrink-0 align-[-0.15em]", className)}>
      <Icon ref={icon} size={size} className="flex" />
    </span>
  );
}

const make = (icon: IconComp) => {
  const C = (p: Props) => <HoverIcon icon={icon} {...p} />;
  return C;
};

export const ArrowRight = make(ArrowRightIcon as IconComp);
export const ArrowUpRight = make(ArrowUpRightIcon as IconComp);
export const ArrowUp = make(ArrowUpIcon as IconComp);
export const Copy = make(CopyIcon as IconComp);
export const Check = make(CheckIcon as IconComp);
export const Sun = make(SunIcon as IconComp);
export const Moon = make(MoonIcon as IconComp);
export const Menu = make(MenuIcon as IconComp);
export const X = make(XIcon as IconComp);

// "What it does" (OpenPlan): BOM · change orders · lifecycle workflows · connected project work
export const CapabilityIcons = [
  make(LayersIcon as IconComp),
  make(GitPullRequestIcon as IconComp),
  make(WorkflowIcon as IconComp),
  make(LinkIcon as IconComp),
];
export function CapabilityIcon({ index, size = 28 }: { index: number; size?: number }) {
  const C = CapabilityIcons[index] ?? CapabilityIcons[0];
  return <C size={size} />;
}
