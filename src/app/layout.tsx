import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { seo, site } from "@/data/portfolio";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

// next/font self-hosts these as WOFF2 (Latin subset) and sets font-display: swap.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Display serif for the hero statement only ("between Hardware & Software.").
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Link previews (founder, 2026-11-05). The image itself is src/app/opengraph-image.tsx, which Next adds as
// og:image automatically; metadataBase makes its URL absolute. X falls back to og:image.
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: seo.title,
  description: seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: seo.title,
    description: seo.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    creator: "@sekharjv",
  },
};

// Structured data (brief §8): Person + the two organisations. Locality is Bengaluru (founder's base).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${site.url}#person`,
      name: site.name,
      jobTitle: "Founder",
      url: site.url,
      address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressCountry: "IN" },
      sameAs: site.footerSocials.map((s) => s.href),
      worksFor: { "@id": `${site.openplanUrl}#org` },
    },
    { "@type": "Organization", "@id": `${site.openplanUrl}#org`, name: "OpenPlan AI", url: site.openplanUrl },
    { "@type": "Organization", "@id": `${site.spotmiesUrl}#org`, name: "Spotmies", url: site.spotmiesUrl },
  ],
};

// Applies the saved (or system) theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
