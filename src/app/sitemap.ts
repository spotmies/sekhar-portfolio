import type { MetadataRoute } from "next";
import { site } from "@/data/portfolio";

// One page only. Sections (#projects, #testimonials, …) are anchors, not URLs, so they don't belong here;
// the nav's scrollspy handles them (addendum-02 §4, founder's decision 2026-11-04).
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.url }];
}
