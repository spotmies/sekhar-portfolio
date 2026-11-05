"use client";
/*
 * ProjectShowcase (from the founder's 21st.dev pick), used here for testimonials.
 * Site adaptations (2026-11-04), behaviour otherwise as the original:
 * - `motion/react` instead of `framer-motion` (same API; the `motion` package is already installed).
 * - Plain <img> instead of next/image: the original used the removed `layout`/`objectFit` props, and remote
 *   photos would need next.config changes.
 * - Card tilts are deterministic per index (Math.random() in render differs between server and client, which
 *   breaks hydration).
 * - The third button (the item's link) renders only when the item has a link.
 * - The hover outline uses a CSS variable instead of styled-jsx; the `py-${n}` runtime class names (which
 *   Tailwind can't generate) became inline padding.
 * - Respects prefers-reduced-motion (MotionConfig reducedMotion="user").
 * - `isolate` on the root: the stack gives the front card z-index 999, which otherwise painted it over the site's
 *   fixed nav when the section scrolled under it.
 * - The LTR and RTL branches rendered the same pieces in the same order, so they share them below.
 */
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import { HalomotButton } from "@/components/ui/project-showcase-utils/halomot-button";

export type ShowcaseItem = {
  quote: string;
  name: string;
  designation: string;
  src: string;
  /** alt text for the image ("" if decorative) */
  alt?: string;
  link?: string;
};

type Spacing = {
  top?: string;
  bottom?: string;
  lineHeight?: string;
  nameTop?: string;
  nameBottom?: string;
  positionTop?: string;
  positionBottom?: string;
  testimonyTop?: string;
  testimonyBottom?: string;
};

type ProjectShowcaseProps = {
  testimonials: ShowcaseItem[];
  autoplay?: boolean;
  colors?: { name?: string; position?: string; testimony?: string };
  fontSizes?: { name?: string; position?: string; testimony?: string };
  spacing?: Spacing;
  desktopVersionBottomThreshold?: number;
  mobile?: { fontSizes?: { name?: string; position?: string; testimony?: string }; spacing?: Spacing };
  imageAspectRatio?: number;
  isRTL?: boolean;
  onItemClick?: (link: string) => void;
  outerRounding?: string;
  innerRounding?: string;
  outlineColor?: string;
  hoverOutlineColor?: string;
  buttonInscriptions?: { previousButton: string; nextButton: string; openWebAppButton: string };
  halomotButtonGradient?: string;
  halomotButtonBackground?: string;
  halomotButtonTextColor?: string;
  halomotButtonOuterBorderRadius?: string;
  halomotButtonInnerBorderRadius?: string;
  halomotButtonHoverTextColor?: string;
  /** extra classes on the name heading (e.g. a font family) */
  nameClassName?: string;
};

// Was Math.floor(Math.random() * 21) - 10 per render; a fixed value per card keeps server and client in step.
const tilt = (index: number, salt = 0) => (((index * 37 + 11 + salt * 13) % 21) - 10);

export const ProjectShowcase = ({
  testimonials,
  autoplay = false,
  colors = { name: "#fff", position: "gray-500", testimony: "gray-500" },
  fontSizes = { name: "2xl", position: "sm", testimony: "lg" },
  spacing = {
    top: "20",
    bottom: "20",
    lineHeight: "1.5",
    nameTop: "0",
    nameBottom: "0.5em",
    positionTop: "0",
    positionBottom: "0.25em",
    testimonyTop: "1em",
    testimonyBottom: "1em",
  },
  desktopVersionBottomThreshold = 1024,
  mobile = {},
  imageAspectRatio = 1.37,
  isRTL = false,
  onItemClick,
  outerRounding = "18.2px",
  innerRounding = "18px",
  outlineColor = "#33313d",
  hoverOutlineColor = "#403d4d",
  buttonInscriptions = {
    previousButton: "Previous",
    nextButton: "Next",
    openWebAppButton: "Open Web App",
  },
  halomotButtonGradient = "linear-gradient(to right, #a123f4, #603dec)",
  halomotButtonBackground = "#111014",
  halomotButtonTextColor = "#fff",
  halomotButtonOuterBorderRadius = "6.34px",
  halomotButtonInnerBorderRadius = "6px",
  halomotButtonHoverTextColor,
  nameClassName = "font-bold",
}: ProjectShowcaseProps) => {
  const [active, setActive] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const [componentWidth, setComponentWidth] = useState(0);
  const componentRef = useRef<HTMLDivElement>(null);
  const count = testimonials.length;

  const currentFontSizes = isMobileView && mobile.fontSizes ? mobile.fontSizes : fontSizes;
  const currentSpacing = { ...spacing, ...(isMobileView && mobile.spacing ? mobile.spacing : {}) };

  const handleNext = useCallback(() => setActive((prev) => (prev + 1) % count), [count]);
  const handlePrev = () => setActive((prev) => (prev - 1 + count) % count);
  const isActive = (index: number) => index === active;

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(handleNext, 5000);
    return () => clearInterval(interval);
  }, [autoplay, handleNext]);

  const handleResize = useCallback(() => {
    if (componentRef.current) {
      setComponentWidth(componentRef.current.offsetWidth);
      setIsMobileView(componentRef.current.offsetWidth < desktopVersionBottomThreshold);
    }
  }, [desktopVersionBottomThreshold]);

  useEffect(() => {
    const node = componentRef.current;
    const resizeObserver = new ResizeObserver(handleResize);
    if (node) resizeObserver.observe(node);
    handleResize();
    return () => resizeObserver.disconnect();
  }, [handleResize]);

  const calculateGap = (width: number) => {
    const minWidth = 1024;
    const maxWidth = 1456;
    const minGap = 60;
    const maxGap = 86;
    if (width <= minWidth) return minGap;
    if (width >= maxWidth) return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
    return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
  };

  if (count === 0) return null;
  const current = testimonials[active]!;
  const align: CSSProperties["textAlign"] = isRTL ? "right" : undefined;
  const pad = (n?: string) => (n && /^\d+(\.\d+)?$/.test(n) ? `calc(var(--spacing) * ${n})` : n);

  const images = (
    // Single-column layout: the stack spans the full width, so the tilted cards behind it poked ~52px past the
    // viewport (sideways scroll at ~1024px). At 88% width the tilt (±10°, ~5.6% overhang a side) stays inside.
    // Phones (2026-11-05): a smaller stack so the photo, the quote and the buttons fit on one screen.
    <div className={isMobileView ? "mx-auto w-[62%] max-w-[340px]" : "mx-auto w-full max-w-[460px]"}>
      <div className="relative" style={{ paddingTop: `${(1 / imageAspectRatio) * 100}%` }}>
        <AnimatePresence>
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={`${index}-${testimonial.src}`}
              initial={{ opacity: 0, scale: 0.9, z: -100, rotate: tilt(index) }}
              animate={{
                opacity: isActive(index) ? 1 : 0.7,
                scale: isActive(index) ? 1 : 0.95,
                z: isActive(index) ? 0 : -100,
                rotate: isActive(index) ? 0 : tilt(index, 1),
                zIndex: isActive(index) ? 999 : count + 2 - index,
                y: isActive(index) ? [0, -80, 0] : 0,
              }}
              exit={{ opacity: 0, scale: 0.9, z: 100, rotate: tilt(index, 2) }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 origin-bottom"
            >
              <ImageContainer
                src={testimonial.src}
                alt={testimonial.alt ?? ""}
                outerRounding={outerRounding}
                innerRounding={innerRounding}
                outlineColor={outlineColor}
                hoverOutlineColor={hoverOutlineColor}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const text = (
    <div className={"flex w-full flex-col justify-between " + (isMobileView ? "py-0" : "py-4")}>
      <motion.div
        key={active}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        aria-live="polite"
      >
        <h3
          className={nameClassName}
          style={{
            fontSize: currentFontSizes.name,
            color: colors.name,
            marginTop: currentSpacing.nameTop,
            marginBottom: currentSpacing.nameBottom,
            textAlign: align,
          }}
        >
          {current.name}
        </h3>
        <p
          style={{
            fontSize: currentFontSizes.position,
            color: colors.position,
            marginTop: currentSpacing.positionTop,
            marginBottom: currentSpacing.positionBottom,
            textAlign: align,
          }}
        >
          {current.designation}
        </p>
        <motion.p
          style={{
            fontSize: currentFontSizes.testimony,
            color: colors.testimony,
            marginTop: currentSpacing.testimonyTop,
            marginBottom: currentSpacing.testimonyBottom,
            textAlign: align,
          }}
        >
          {current.quote.split(" ").map((word, index) => (
            <motion.span
              key={index}
              initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut", delay: 0.02 * index }}
              className="inline-block"
            >
              {word}&nbsp;
            </motion.span>
          ))}
        </motion.p>
      </motion.div>
      <div className={`flex w-full flex-wrap gap-4 ${isMobileView ? "pt-1" : "md:pt-0"}`} style={{ justifyContent: "flex-start" }}>
        {count > 1 && (
          <>
            <HalomotButton
              inscription={buttonInscriptions.previousButton}
              onClick={handlePrev}
              fixedWidth="min(172px, calc(50% - 0.5rem))" /* side by side even at 360–390px (2026-11-05) */
              gradient={halomotButtonGradient}
              backgroundColor={halomotButtonBackground}
              textColor={halomotButtonTextColor}
              innerBorderRadius={halomotButtonInnerBorderRadius}
              outerBorderRadius={halomotButtonOuterBorderRadius}
              {...(halomotButtonHoverTextColor ? { hoverTextColor: halomotButtonHoverTextColor } : {})}
            />
            <HalomotButton
              inscription={buttonInscriptions.nextButton}
              onClick={handleNext}
              fixedWidth="min(172px, calc(50% - 0.5rem))" /* side by side even at 360–390px (2026-11-05) */
              gradient={halomotButtonGradient}
              backgroundColor={halomotButtonBackground}
              textColor={halomotButtonTextColor}
              innerBorderRadius={halomotButtonInnerBorderRadius}
              outerBorderRadius={halomotButtonOuterBorderRadius}
              {...(halomotButtonHoverTextColor ? { hoverTextColor: halomotButtonHoverTextColor } : {})}
            />
          </>
        )}
        {current.link && (
          <HalomotButton
            inscription={buttonInscriptions.openWebAppButton}
            onClick={() => onItemClick && onItemClick(current.link || "")}
            fillWidth
            gradient={halomotButtonGradient}
            backgroundColor={halomotButtonBackground}
            textColor={halomotButtonTextColor}
            innerBorderRadius={halomotButtonInnerBorderRadius}
            outerBorderRadius={halomotButtonOuterBorderRadius}
            {...(halomotButtonHoverTextColor ? { hoverTextColor: halomotButtonHoverTextColor } : {})}
            href={current.link}
          />
        )}
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={componentRef}
        className="isolate mx-auto w-full font-sans antialiased"
        style={{
          paddingTop: pad(currentSpacing.top),
          paddingBottom: pad(currentSpacing.bottom),
          lineHeight: currentSpacing.lineHeight,
          backgroundColor: "transparent",
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        <div
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
            gap: isMobileView ? "28px" : `${calculateGap(componentWidth)}px`, // the 60px desktop gap wasted a phone screen
          }}
        >
          {images}
          {text}
        </div>
      </div>
    </MotionConfig>
  );
};

type ImageContainerProps = {
  src: string;
  alt: string;
  outerRounding: string;
  innerRounding: string;
  outlineColor: string;
  hoverOutlineColor: string;
};

const ImageContainer = ({ src, alt, outerRounding, innerRounding, outlineColor, hoverOutlineColor }: ImageContainerProps) => (
  <div
    className="relative h-full w-full bg-(--ps-outline) transition-colors duration-300 ease-in-out hover:bg-(--ps-outline-hover)"
    style={
      {
        borderRadius: outerRounding,
        padding: "1px",
        "--ps-outline": outlineColor,
        "--ps-outline-hover": hoverOutlineColor,
      } as CSSProperties
    }
  >
    <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: innerRounding }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- see the adaptation note at the top */}
      <img src={src} alt={alt} draggable={false} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
    </div>
  </div>
);

export default ProjectShowcase;
