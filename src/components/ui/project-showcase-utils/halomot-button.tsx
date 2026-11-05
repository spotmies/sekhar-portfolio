"use client";

import * as React from "react";

/**
 * HalomotButton: a button with a 1px gradient border whose gradient fills the button on hover/focus.
 * NOTE: the original file was not included with ui/project-showcase, so this is a compatible re-implementation
 * of the props that component passes (2026-11-04). Replace it with the original if it turns up.
 */
export type HalomotButtonProps = {
  inscription: string;
  onClick?: () => void;
  /** renders a link (opens in a new tab) instead of a button */
  href?: string;
  fixedWidth?: string;
  fillWidth?: boolean;
  gradient?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
  innerBorderRadius?: string;
  outerBorderRadius?: string;
};

export function HalomotButton({
  inscription,
  onClick,
  href,
  fixedWidth,
  fillWidth = false,
  gradient = "linear-gradient(to right, #a123f4, #603dec)",
  backgroundColor = "#111014",
  textColor = "#fff",
  hoverTextColor,
  innerBorderRadius = "6px",
  outerBorderRadius = "6.34px",
}: HalomotButtonProps) {
  const [lit, setLit] = React.useState(false);
  const on = () => setLit(true);
  const off = () => setLit(false);

  const outer: React.CSSProperties = {
    display: "inline-flex",
    padding: 1,
    border: 0,
    borderRadius: outerBorderRadius,
    background: gradient,
    width: fillWidth ? "100%" : fixedWidth,
    flex: fillWidth ? "1 1 0%" : "0 0 auto",
    minWidth: 0,
    cursor: "pointer",
    textDecoration: "none",
  };
  const inner: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 44,
    padding: "0.75rem 1.25rem",
    borderRadius: innerBorderRadius,
    background: lit ? "transparent" : backgroundColor,
    color: lit ? (hoverTextColor ?? textColor) : textColor,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    transition: "background-color 0.3s ease, color 0.3s ease",
  };
  const events = { onMouseEnter: on, onMouseLeave: off, onFocus: on, onBlur: off };
  const focus = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={outer} className={focus} {...events}>
        <span style={inner}>
          {inscription}
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={outer} className={focus} {...events}>
      <span style={inner}>{inscription}</span>
    </button>
  );
}

export default HalomotButton;
