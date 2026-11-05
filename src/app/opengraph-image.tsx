import { ImageResponse } from "next/og";
import { hero, site } from "@/data/portfolio";

// Link-preview image (founder, 2026-11-05). Generated once at build time from the site's own copy, so it
// never says anything the page doesn't. Light palette from globals.css (:root); font is next/og's bundled
// Geist, the site's sans.
export const alt = `${site.name}, ${hero.role}. ${hero.status.prefix} ${hero.status.product}.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = { bg: "#fafaf9", fg: "#1c1917", muted: "#57534e", border: "#e7e5e4", accent: "#4f46e5" };
const domain = new URL(site.url).hostname.replace(/^www\./, "");

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: C.bg,
          color: C.fg,
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: C.muted }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: C.accent }} />
          {`${hero.status.prefix} ${hero.status.product}`}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 112, letterSpacing: -4, lineHeight: 1 }}>
            {site.name}
            <span style={{ color: C.accent }}>.</span>
          </div>
          <div style={{ marginTop: 24, fontSize: 40, color: C.muted }}>{hero.role}</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: `2px solid ${C.border}`,
            fontSize: 26,
            color: C.muted,
          }}
        >
          <span>{domain}</span>
          <span>{site.location}</span>
        </div>
      </div>
    ),
    size,
  );
}
