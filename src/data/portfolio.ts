// All site copy and numbers live in this file. Components read from it; no copy is duplicated elsewhere.
// Sources: docs/sekharjavvadi-redesign-brief.md and docs/hero-footer-addendum.md (the addendum wins on
// the hero and footer).
//
// UNFILLED VALUES ARE `null`. Components hide a null field (or its whole line). No placeholder text may ever
// render. Never replace a null with a guess; the founder fills them in. See `hiddenUntilFilled` below.

/** Joins the non-null parts with " · "; null when nothing is left (so the line is hidden). */
const meta = (...parts: (string | null)[]): string | null => parts.filter(Boolean).join(" · ") || null;

// Founder values still to come (null = hidden on the site).
const spotmiesCofounders: string | null = null; // e.g. "Satish, Hemanth and Naveen" (needs their OK)
const spotmiesEndYear: string | null = null; // "present" or the year it ended
const reaidyTitle: string | null = "Co-Founder & CTO"; // founder, 2026-11-06 (LinkedIn says "Co-Founder"); book only, Experience card unchanged
const reaidyYears: string | null = "2024 – 2026"; // founder, 2026-11-07 (was "Sep 2023 – Apr 2026" from LinkedIn). Book only; Experience still starts 2023-09

/** Every field currently hidden because it's null (for the founder's fill-in list). */
export const hiddenUntilFilled = [
  "Spotmies co-founder names (Story chapter + Ventures)",
  "Spotmies end year (Ventures meta shows just 2020)",
  "Spotmies 'as of' date for the numbers",
  "Spotmies AU Incubation / A Hub line",
  "Projects: my role, year, problem, what we built, stack, outcome and link on each card; real images (placeholders for now)",
  "Projects: type for Nandikrushi and StreamCity (client work or own product?); 'Built with' line for Hardware & IoT",
  "Reaidy 'as of' date for the numbers",
  "Reaidy 'why it stopped' line",
  "OpenPlan product screenshot / video (not rendered)",
  "Testimonials: 2+ real, approved quotes with permission (placeholder slots shown now)",
];

/* ============================================================================================
   Site-wide
   ============================================================================================ */

export type Social = { label: string; href: string };

const linkedin: Social = { label: "LinkedIn", href: "https://www.linkedin.com/in/sekhar-javvadi" };
const x: Social = { label: "X", href: "https://x.com/sekharjv" };
const github: Social = { label: "GitHub", href: "https://github.com/sekharjavvadi" };
const instagram: Social = { label: "Instagram", href: "https://www.instagram.com/sekharjavvadi/" };

export const site = {
  name: "Sekhar Javvadi",
  location: "Bengaluru, India",
  url: "https://www.sekharjavvadi.com/",
  email: "sekhar@openplanai.com",
  socials: [linkedin, x, github], // Contact
  footerSocials: [linkedin, x, github, instagram], // footer only: Instagram is not in Contact
  github,
  openplanUrl: "https://www.openplanai.com/",
  spotmiesUrl: "https://www.spotmies.com/",
  reaidyUrl: "https://www.reaidy.io/", // checked 2026-11-04: loads properly
};

export const seo = {
  title: "Sekhar Javvadi — Founder, building OpenPlan AI",
  // Founder's instruction: the hero tagline moves out of the hero and into the meta description.
  description:
    "Turning complex workflows into software products. Founder and product builder from Bengaluru. Co-founded Spotmies (2020), built Reaidy.io, and now building OpenPlan AI, software for hardware teams.",
};

/* ============================================================================================
   Navigation
   ============================================================================================ */

export const nav = [
  { label: "Achievements", href: "#achievements" }, // founder, 2026-11-06
  { label: "Story", href: "#story" },
  { label: "Education", href: "#education" }, // founder, 2026-11-04
  { label: "OpenPlan", href: "#openplan" },
  { label: "Ventures", href: "#ventures" },
  // { label: "Projects", href: "#projects" }, // hidden for now (founder, 2026-11-05); section kept in page.tsx as a comment
  { label: "Experience", href: "#experience" }, // founder, 2026-11-05
  { label: "How I build", href: "#principles" },
  { label: "Testimonials", href: "#testimonials" }, // founder, 2026-11-04 (addendum-02 had it out of the nav)
  { label: "Contact", href: "#contact" },
];

// TEMPORARY: sections that haven't been rebuilt yet still use their old ids. Delete each entry when its
// section is rebuilt with the final id, and delete this map once it is empty.
const anchorAliases: Record<string, string> = {};
export const resolveHref = (href: string) => anchorAliases[href] ?? href;

/* ============================================================================================
   Hero (addendum §2)
   ============================================================================================ */

export const hero = {
  status: { prefix: "Building", product: "OpenPlan AI" }, // renders "● Building [mark] OpenPlan AI"
  statement: {
    spoken: "Between hardware and software", // what screen readers hear
    lead: "between",
    first: "Hardware",
    joiner: "&",
    second: "Software.",
  },
  marker: "2019", // drawn as "✳2019" in outline text; decorative
  name: "Sekhar Javvadi", // the H1; the indigo full stop is added by the component
  role: "Founder & Product Builder",
  bio: "Founder based in Bengaluru. Hardware first, software since 2019, now building OpenPlan AI for teams that make physical products.",
  ctas: {
    primary: { label: "Explore OpenPlan AI", href: "#openplan" },
    secondary: { label: "Get in touch", href: "#contact" },
  },
  trail: [
    { label: "Co-founded Spotmies · 2020", href: "#spotmies" }, // founding year Apr 2020 per LinkedIn (founder, 2026-11-05)
    { label: "Built Reaidy.io", href: "#reaidy" },
    { label: "Now building OpenPlan AI", href: "#openplan" },
  ],
  badgeHint: "Drag it · click to flip",
  badgeAlt: "Sekhar Javvadi's ID badge: Founder, OpenPlan AI",
  scroll: { label: "Scroll", href: "#story" },
};

/* ============================================================================================
   01 — Story (brief §2.2)
   ============================================================================================ */

export type StoryChapter = {
  id: string;
  badge: string; // sticker text; "Name · Year" is split into name and year on the sticker
  act: string;
  kicker: string;
  title: string;
  body: string;
  learned: string | { label: string; href: string };
};

export const story = {
  label: "01 — Story",
  title: "I build technology by understanding how people actually work.",
  // Not rendered: the founder chose a one-line section header (label + title only, no intro paragraph).
  intro:
    "My work has followed one instinct: when I see a workflow that technology can fix, I want to understand it deeply and build something useful around it. It started with hardware, took me through seven years of building software, and has brought me back to hardware.",
  chapters: [
    {
      id: "tinkerer",
      badge: "Tinkerer",
      act: "Act I · Hardware first",
      kicker: "The tinkerer",
      title: "I started by making things work.",
      body: "Before any company, there were circuits: NodeMCU boards, PIR-sensor anti-theft devices, schematics and PCBs. Getting code to behave in the physical world meant debugging patiently and respecting real constraints.",
      learned: "How software meets physical systems, and how to debug what doesn't work yet.",
    },
    {
      id: "spotmies",
      badge: "Spotmies LLP · 2020",
      act: "Act II · Building software",
      kicker: "Co-founder",
      title: "Seven years of turning ideas into products.",
      body: `In 2020 I co-founded Spotmies${spotmiesCofounders ? " with " + spotmiesCofounders : ""}. We built web, mobile, AI and blockchain products for startups and businesses. The blockchain work included smart contracts, NFTs and decentralised apps.`,
      learned: "How to understand a customer, scope under constraints, deliver with a team, and run a business.",
    },
    {
      id: "reaidy",
      badge: "Reaidy.io",
      act: "Act II · Building software",
      kicker: "Product builder",
      title: "Taking an AI product to real users.",
      body: "Reaidy was a two-sided AI hiring platform: mock interviews and scorecards for candidates, and resume screening for recruiters. Getting it to real usage meant solving for quotas, quality and cost, not just the model.",
      learned: "A prototype is the start. Reliability, cost and adoption are the product.",
    },
    {
      id: "openplan",
      badge: "OpenPlan AI · 2026",
      act: "Act III · Back to hardware",
      kicker: "Now building",
      title: "Full circle.",
      body: "Now I'm bringing those years of software back to where I started. OpenPlan AI gives teams that build physical products one connected place for parts, BOMs, revisions and engineering changes.",
      learned: { label: "→ See what I'm building", href: "#openplan" }, // the protected mat shows this as-is; the static list swaps the → for an animated icon
    },
  ] satisfies StoryChapter[],
  closing: "Every chapter has the same thread: make complex work easier to execute.",
  // Interface text on the cutting mat and reading card.
  mat: {
    tape: "Founder story · 4 chapters",
    groupLabel: "Founder story chapters",
    hintPointer: "Drag the badges · click one to read",
    hintTouch: "Swipe · tap a badge to read",
    hintKeys: "← → to change chapter",
    print: "Workbench · Bengaluru", // decorative mat printing (founder-approved wording)
    chapter: "Chapter",
    learned: "What it taught me",
    prev: "← Prev",
    next: "Next →",
  },
};
export type StoryMatText = typeof story.mat;

/* ============================================================================================
   02 — Education journey (founder's request, 2026-11-04; ui/timeline).
   Facts as supplied by Sekhar on 2026-11-04 (not from the founder document, which had none). Oldest first.
   `note` keeps his full wording and exact dates; it isn't rendered (the timeline shows year + one line).
   ============================================================================================ */

export type EducationStep = { id: string; year: string; month?: string; content: string; note?: string };

export const education = {
  label: "02 — Education",
  title: "Education journey.",
  periodLabel: "2020 — 2014", // newest first, matching the step order (founder, 2026-11-05)
  // founder's portrait (2026-11-05). Shown whole, not cropped or zoomed, in a card shaped like the photo (his request:
  // no extra space on the sides). `aspect` = width / height of the file (900 × 1600).
  image: { src: "/education/sekhar-portrait-tall.webp", alt: "Portrait of Sekhar Javvadi", position: "50% 50%", aspect: 900 / 1600 },
  steps: [
    // Newest first (founder, 2026-11-05): B.Tech, then Diploma, then SSC.
    {
      id: "btech",
      year: "2017 — 2020",
      content: "B.Tech, Electronics and Communications Engineering. Jawaharlal Nehru Technological University, Kakinada. 61%.",
      note: "Bachelor of Technology - BTech, Electronics and Communications Engineering. July 2017 – September 2020. Grade: 61%. Completed graduation in Electronics and Communications Engineering.",
    },
    {
      id: "diploma",
      year: "2014 — 2017",
      content: "Diploma, Electronics and Communications Engineering. Government Polytechnic College, Anakapalle. 74%.",
      note: "Diploma of Education, Electronics and Communications Engineering. June 2014 – May 2017. Grade: 74%. Learned many technical concepts, had a great experience with the college, and built strong friendships.",
    },
    {
      id: "ssc",
      year: "April 2014",
      content: "SSC, GVMC High School, Madhavadhara. 8.5 GPA.",
      note: "Qualification: SSC (Secondary School Certificate). Completion: April 2014. Grade: 8.5 GPA.",
    },
  ] satisfies EducationStep[],
};

/* ============================================================================================
   03 — Now building: OpenPlan AI (brief §2.3)
   ============================================================================================ */

export const openplan = {
  label: "03 — Now building",
  title: "OpenPlan AI",
  // Founder-approved; matches openplanai.com. Rendered under the heading from step 2.
  lead: "OpenPlan AI is an AI planning layer for hardware teams that works alongside the PLM tools they already use." as
    | string
    | null,
  // Meta row under the lead (founder-approved). Stage: add "· in pilots with N teams" only if true.
  meta: ["Built and working", "For hardware teams", "Since 2026"],
  siteLink: { label: "openplanai.com", href: site.openplanUrl },
  problems: [
    { title: "Product data is scattered.", body: "Parts, BOMs and revisions live across spreadsheets and disconnected tools." },
    { title: "Changes are hard to control.", body: "Engineering changes move through email and chat, with no clear history." },
    { title: "Visibility comes late.", body: "As a product evolves, teams struggle to see what a change touches." },
  ],
  capabilities: [
    { title: "BOM management", body: "parts, assemblies, components and sub-components in one structure." },
    { title: "Engineering change orders", body: "track and control every product change." },
    { title: "Lifecycle workflows", body: "organise product information and development activity." },
    { title: "Connected project work", body: "tasks linked to the parts and changes they affect." },
  ],
  whyMe: "I started in hardware and spent seven years building software. OpenPlan is where the two meet.",
  ctas: {
    primary: { label: "See the product", href: site.openplanUrl },
    secondary: { label: "Request a conversation", href: "#contact" },
    tertiary: { label: "Hardware team? Request a demo", href: `mailto:${site.email}?subject=OpenPlan%20demo` },
  },
  problemsLabel: "The problem",
  capabilitiesLabel: "What it does",
  // The boarding-pass card (field mapping approved by the user).
  ticket: {
    tier: "Now building",
    date: "Since 2026",
    passenger: "Hardware teams",
    from: "Spreadsheets",
    to: "One workspace",
    modules: "BOM · ECO · Tasks",
    status: "Built and working",
    since: "2026",
    site: "openplanai.com",
    headline: "Part → Change → Task",
    stamp: "Request a demo",
    sideLabels: ["The product", "Boarding pass"] as [string, string],
    labels: {
      pass: "Boarding pass",
      passenger: "Passenger",
      from: "From",
      to: "To",
      modules: "Modules",
      since: "Since",
      status: "Status",
      site: "Site",
      route: "Route",
      tear: "Tear here",
      tearAction: "Tear off the stub",
      reattach: "Reattach the stub",
      sides: "Ticket side",
    },
  },
  visual: {
    screenshot: null as string | null, // product screenshot(s) or a 10–15s muted looping MP4/WebM
    // Fallback diagram until screenshots exist. "Change order" is the accented node.
    diagram: ["Part", "Assembly", "Revision", "Change order", "Task"],
    diagramDescription:
      "Diagram of connected product data: a part belongs to an assembly, the assembly has revisions, a revision is changed through a change order, and the change order creates tasks.",
  },
};

/* ============================================================================================
   04 — Track record (brief §2.4). The ONLY place on the site with numbers.
   ============================================================================================ */

export const metrics = {
  spotmies: {
    asOf: "Nov 2026" as string | null, // spotmies.com/about, read 2026-11-05 (founder chose the live figures)
    scope: "Company figures, spotmies.com",
    items: [
      { value: "50+", label: "projects completed" },
      { value: "5+", label: "blockchain projects" },
      { value: "4+", label: "AI projects" },
      { value: "50-seat", label: "office in Visakhapatnam" },
    ],
    // Team growth (founder, 2026-11-05): "From a team of 4, we've now grown to 25+ strong" (Satish's post,
    // Jun 2025). The 2020 start follows his "Spotmies turns 5" post; founder to confirm. Values only, no %.
    growth: { label: "Team", from: { value: "4", date: "2020" }, to: { value: "25+", date: "Jun 2025" } } as { label: string; from: { value: string; date: string }; to: { value: string; date: string } } | null,
  },
  reaidy: {
    asOf: null as string | null, // "month year"
    scope: "Historical figures, reported by the team",
    items: [
      { value: "50K+", label: "users" },
      { value: "60K+", label: "AI interviews" },
      { value: "200+", label: "hiring companies" },
      { value: "40+", label: "college partners" },
    ],
    growth: null as { label: string; from: { value: string; date: string }; to: { value: string; date: string } } | null,
  },
};

// Achievements section (founder, 2026-11-06): wording pasted by the founder. NOTE: the "$1 million ARR" and "team of 25"
// figures differ from the older master document (approx. USD 200K) and the 25+ post; founder supplied these as current.
export const achievements = {
  eyebrow: "Achievements",
  title: "What the work has added up to.", // TODO founder: confirm heading
  items: [
    {
      kicker: "Company",
      title: "Built Spotmies from scratch",
      body: "Co-founded and helped grow a technology company to a team of 25 people, with approximately $1 million in annual recurring revenue, serving more than 30 clients and delivering over 50 software projects.",
      numbers: [
        { to: 25, prefix: "", suffix: "", label: "people on the team" },
        { to: 1, prefix: "~$", suffix: "M", label: "annual recurring revenue" },
        { to: 30, prefix: "", suffix: "+", label: "clients served" },
        { to: 50, prefix: "", suffix: "+", label: "software projects delivered" },
      ],
    },
    {
      kicker: "Programme",
      title: "NVIDIA Inception Program",
      body: "Accepted into NVIDIA's startup program.",
      logo: { src: "/brand/nvidia-logo.svg", darkSrc: "/brand/nvidia-logo-dark.svg", alt: "NVIDIA" } as { src: string; darkSrc?: string; alt: string } | null, // official logo supplied by the founder; the dark file has a white wordmark
      numbers: [],
    },
    {
      kicker: "Programme",
      title: "Microsoft for Startups Founders Hub",
      body: "Accepted into Microsoft's startup support program.",
      logo: { src: "/brand/microsoft-logo.svg", alt: "Microsoft" } as { src: string; darkSrc?: string; alt: string } | null, // from Wikimedia Commons; grey wordmark works on both themes
      numbers: [],
    },
    {
      kicker: "Product",
      title: "AI Product Development & User Growth",
      body: "Helped build Reaidy, an AI powered hiring platform that reached over 50,000 users and more than 200 hiring companies.",
      numbers: [
        { to: 50, prefix: "", suffix: "K+", label: "users" },
        { to: 200, prefix: "", suffix: "+", label: "hiring companies" },
      ],
    },
  ],
};

export const trackRecord = {
  label: "04 — Track record",
  title: "Before OpenPlan.",
  spotmies: {
    id: "spotmies",
    name: "Spotmies LLP",
    meta: meta("Co-founder & Technical Lead", spotmiesEndYear ? `2020 – ${spotmiesEndYear}` : "2020", "Visakhapatnam"),
    href: site.spotmiesUrl,
    // Logo from spotmies.com (white lettering, so it sits on a dark plate on the paper).
    logo: { src: "/brand/spotmies-logo.webp", width: 518, height: 112, alt: "Spotmies logo" },
    // Founder's photo for Spotmies (2026-11-05; replaced the office group shot, kept at /ventures/spotmies-office-team.webp).
    // Group photo from IMG_1666 (founder, 2026-11-06; replaced the team-on-steps photo). New file name: browsers cache by name.
    photo: { src: "/ventures/spotmies-team-2026.webp", alt: "The Spotmies team" } as { src: string; alt: string; wide?: boolean } | null,
    // Founder's photos (2026-11-07) for the two Spotmies pages that open the book. New file names (browser cache).
    wallPhoto: { src: "/ventures/spotmies-wall-team.webp", alt: "The team at the Spotmies office" },
    officePhoto: { src: "/ventures/spotmies-office-selfie.webp", alt: "How it started" }, // caption: founder, 2026-11-07
    // Wording taken from the Spotmies chapter and summary (no new claims).
    chipsLabel: "What we built",
    chips: ["Web", "Mobile", "AI", "Blockchain", "Smart contracts", "NFTs", "dApps"],
    summary:
      "A software product and services company that turns business requirements into working web, mobile, AI and blockchain products.",
    owned: "Technical direction, architecture and product decisions, and delivering projects with the team.",
    metrics: metrics.spotmies,
    support: null as string | null, // was "Associated with AU Incubation Centre and A Hub, Andhra University." (entity unconfirmed)
    // "Selected work" moved to the Projects section (addendum-02 §2.1), so projects aren't shown twice.
    team: spotmiesCofounders,
  },
  reaidy: {
    id: "reaidy",
    name: "Reaidy.io",
    status: "Past venture", // reaidy.io is still live, so "No longer operating" read as false
    meta: meta(reaidyTitle, reaidyYears),
    href: site.reaidyUrl,
    // Logo from reaidy.io (logo_white), on a dark plate like the Spotmies one.
    logo: { src: "/brand/reaidy-logo.webp", width: 428, height: 64, alt: "Reaidy.io logo" },
    photo: { src: "/ventures/reaidy-team.webp", alt: "The Reaidy.io team" } as { src: string; alt: string; wide?: boolean } | null, // founder's photo (2026-11-05)
    // Wording taken from the Reaidy summary (no new claims).
    chipsLabel: "The product",
    chips: ["AI mock interviews", "Scorecards", "Resume screening", "Recruiter portal"],
    summary:
      "A two-sided AI hiring platform: AI mock interviews and scorecards for candidates, bulk resume screening and a recruiter portal for companies.",
    metrics: metrics.reaidy,
    support: "Part of Microsoft for Startups Founders Hub.",
    whyStopped: null as string | null, // one honest sentence; shown under the metrics when filled
    lesson:
      "AI quality came from the whole workflow (interview state, question history, evaluation), not just the model.",
  },
};

/* --------------------------------------------------------------------------------------------
   03 (continued) — Timeline book (addendum-02 §1). The pages that turn after the Spotmies | Reaidy
   spread, newest first. PHASE 2 (founder, 2026-11-05): years and titles follow the research file
   (sekhar-javvadi-research.json, every fact sourced from his LinkedIn / spotmies.com / Wayback).
   Sentences are the research agent's DRAFTS built from quoted sources (`draft: true`); the founder
   reviews them on the page. Images are PLACEHOLDERS (picsum) until he sends the real files.
   -------------------------------------------------------------------------------------------- */

export type TimelinePage = {
  years: string | null;
  title: string;
  type: string | null;
  oneLine: string | null;
  role: string | null;
  whatIDid: string[] | null; // 2–3 bullets
  outcome: string | null;
  image: { src: string; alt: string; placeholder?: boolean } | null;
  besideImage?: { src: string; alt: string }; // a second photo next to `image` on the left page of a one-entry spread
  gallery?: { src: string; alt: string }[]; // extra photos, shown on the right page of a one-entry spread
  chips?: { title: string; items: string[] }; // small tags under the work on a one-entry spread
  link: string | null;
  draft?: boolean; // wording not yet approved by the founder
};

// One turn of the book (founder, 2026-11-05): a year range with one entry (spread over both pages) or two
// entries (one per page). Since 2026-11-05 every spread has one entry.
export type TimelineSpread = { years: string; title: string; entries: [TimelinePage] | [TimelinePage, TimelinePage] };

// Stand-in photo until the founder's file arrives (stable per seed; replaced one by one).
const placeholderPhoto = (seed: string, alt: string) => ({ src: `https://picsum.photos/seed/${seed}/900/640`, alt, placeholder: true });

export const timeline = {
  skipLabel: "Skip timeline ↓",
  spreads: [
    {
      years: "2026 — 2024", // founder, 2026-11-07 (was 2026 — 2023)
      title: "Reaidy.io",
      entries: [
        {
          years: "2026 — 2024", // founder, 2026-11-07: Reaidy.io is 2024–2026 (LinkedIn said Sep 2023 – Apr 2026)
          title: "Reaidy.io",
          type: "product",
          // Wording approved by the founder (2026-11-05); every fact from his LinkedIn posts / Reaidy's company page (research file).
          oneLine: "An AI hiring platform that runs every step from resume screening to technical and HR interviews, and gives candidates instant scorecards.",
          role: "Co-Founder & CTO", // founder, 2026-11-06
          whatIDid: [
            "Pitched Reaidy.io at the Founder's Battleground event by PW School Of Startups in Bengaluru.",
            "Ran a campus recruitment drive at Vignan Institute of Engineering for Women where every interview was done by Reaidy's AI interviewer.",
            "Took Reaidy to the IIT Bombay E-Summit, where it reached the final round of Seed Stars.",
            "Secured a $50K technical grant from Microsoft under the Founders Hub program.",
          ],
          chips: {
            title: "Milestones",
            items: [
              "Dec 2023 · Microsoft grant",
              "Feb 2024 · Seed Stars finalist",
              "Apr 2024 · App launch",
              "Jul 2024 · MOU with Vignan's Institute",
              "Nov 2025 · Launch at K.B.N. College, Vijayawada",
            ],
          },
          outcome: "Reaidy.io app launched in 2024 and was used for campus drives such as one where more than 300 students were interviewed by AI in just 4 hours.",
          // Founder's photos (2026-11-05): the Reaidy.io stall and the team at E-Summit'25 (badges say E-Summit'25).
          image: { src: "/ventures/reaidy-stall.webp", alt: "The Reaidy.io stall" },
          // On the left page beside the stall photo: the right page is full with the milestones row.
          besideImage: { src: "/ventures/reaidy-esummit.webp", alt: "The team at E-Summit'25" },
          link: site.reaidyUrl,
        },
      ],
    },
    {
      years: "2023",
      title: "CypherB", // Indie Skull Syndicate page removed; CypherB runs over both pages (founder, 2026-11-05)
      entries: [
        {
          years: "2023", // T-Hub Idea Open House (Feb 2023), Global Investors Summit (Mar 2023)
          title: "CypherB",
          type: "product / blockchain",
          // Wording approved by the founder (2026-11-05), from his Global Investors Summit LinkedIn post.
          oneLine: "A blockchain recruitment and verification platform: job seekers verify their identity and showcase their skills, and employers hire from a pool of qualified candidates.",
          role: null, // no source states his role
          whatIDid: [
            "Explained to delegates at our Global Investors Summit 2023 stall how CypherB uses blockchain to change recruitment for job seekers and organisations.",
            "Built around an instant hiring process that saves employers time and money.",
            "Showcased CypherB at the Idea Open House event at T-Hub.",
          ],
          outcome: "A positive response from delegates at the Global Investors Summit; also shown at the T-Hub Idea Open House (2023).",
          image: { src: "/ventures/cypherb-summit.webp", alt: "CypherB stall at the Global Investors Summit" }, // founder's photo (2026-11-05)
          gallery: [
            { src: "/ventures/cypherb-stall-team.webp", alt: "The team at the CypherB stall" }, // founder's selfie, flipped (it was mirrored)
            { src: "/ventures/cypherb-gis-team.webp", alt: "Global Investors Summit 2023" },
          ],
          chips: { title: "Focus", items: ["Blockchain", "Identity verification", "Recruitment", "Instant hiring"] },
          link: null,
        },
      ],
    },
    {
      years: "2020",
      title: "Spotmies founded", // Karkinos page removed; Spotmies runs over both pages (founder, 2026-11-05)
      entries: [
        {
          years: "2020", // Spotmies from Apr 2020 (LinkedIn)
          title: "Spotmies founded",
          type: "company founding",
          // Wording approved by the founder (2026-11-05); the app details come from his screenshots.
          oneLine: "Co-founded Spotmies with college friends: a professional services platform that connects people with verified technicians and professionals near them.",
          role: "Co-Founder & CTO",
          whatIDid: [
            "Landed Spotmies' first project, a website for a camera rental business found through an OLX ad.",
            "Launched the Spotmies app: customers pick a service, add a photo of the job, schedule a visit and track the request until it's completed.",
            "Launched the Spotmies Partner app on the Play Store: technicians register with a mobile number, verify their documents, add their services and get work recommendations based on location.",
            "Grew the service list from tradesman and personal care to interior design, CCTV, automation, app development and digital marketing.",
          ],
          outcome: "Spotmies' first client project delivered.",
          // Founder's app screenshots (2026-11-05), laid out side by side on paper-coloured boards.
          image: { src: "/ventures/spotmies-app.webp", alt: "The Spotmies app: home, find a partner, a service request" },
          gallery: [
            { src: "/ventures/spotmies-partner.webp", alt: "Partner app · first app design" },
            { src: "/ventures/spotmies-team.webp", alt: "The Spotmies team at work" }, // replaced the services board (the chips list the services)
          ],
          chips: {
            title: "Services",
            items: ["Interior Design", "Home Decors", "Graphic Design", "Photo & Video", "Event Management", "Automation", "CCTV", "App Development", "PC & Laptop", "Digital Marketing"],
          },
          link: null,
        },
      ],
    },
    {
      years: "2019 — 2020",
      title: "Hexagon",
      // Founder, 2026-11-05: replaces the "Smart-device PCB" page; a project he led, over both pages. Wording approved in chat.
      // Technical bullets are read off his board photos (ESP-12F, MOC3021 ×4, Hi-Link HLK-PM03); the MCU's marking isn't legible, so it isn't named.
      entries: [
        {
          years: "2019 — 2020",
          title: "Hexagon",
          type: "hardware / IoT",
          oneLine: "Hexagon: IoT security devices and smart home-appliance controllers, designed from schematic to finished boards.",
          role: "Co-Founder & Tech Lead", // founder, 2026-11-06 (was "Project Lead")
          whatIDid: [
            "Built IoT security devices and IoT home-appliance controllers.",
            "Designed the PCBs in EasyEDA, from layout to assembled boards.",
            "Wi-Fi control board: ESP-12F Wi-Fi module with a microcontroller, switching four mains loads through MOC3021 opto-isolated triac drivers.",
            "Runs straight off mains through a Hi-Link HLK-PM03 power module (100–240 V AC in, 3.3 V out).",
          ],
          outcome: null,
          image: { src: "/ventures/hexagon-layout.webp", alt: "Hexagon PCB layout in EasyEDA" },
          besideImage: { src: "/ventures/hexagon-etched.webp", alt: "Etched boards, same layout" },
          gallery: [
            { src: "/ventures/hexagon-power.webp", alt: "Board with the Hi-Link power module" },
            { src: "/ventures/hexagon-wifi.webp", alt: "Wi-Fi board: ESP-12F + 4× MOC3021" },
          ],
          chips: { title: "Key parts", items: ["ESP-12F", "MOC3021", "Hi-Link HLK-PM03", "EasyEDA", "Wi-Fi control"] }, // founder OK, 2026-11-05
          link: null,
        },
      ],
    },
  ] satisfies TimelineSpread[],
};

/* ============================================================================================
   05 — Experience (founder, 2026-11-05). Roles, titles, dates, places and tags are from the founder's
   LinkedIn text, pasted in chat. One-liners: OpenPlan and Karkinos are LinkedIn's words (Karkinos stays here; only its Ventures page was removed); Spotmies and
   Reaidy reuse the Ventures summaries (founder's OK). Metrics are the existing totals only, no growth %
   (master doc: no growth rates without dated evidence). Ventures keeps "Technical Lead" by the
   founder's choice; founding year is Apr 2020 site-wide (2026-11-05). Dates are "YYYY-MM"; `end: null` means present. Durations are computed, never typed.
   ============================================================================================ */

export type ExperienceStint = { title: string; start: string; end: string | null; workplace: string | null };
export type ExperienceRole = {
  id: string;
  org: string;
  href: string | null;
  employment: string;
  location: string;
  stints: ExperienceStint[]; // newest first; Spotmies has two titles
  oneLine: string | null;
  tags: string[];
  metrics: {
    scope: string;
    items: { value: string; label: string }[];
    growth?: { label: string; from: { value: string; date: string }; to: { value: string; date: string } } | null;
    extra?: { scope: string; items: { value: string; label: string }[] } | null; // a second group with its own source note
  } | null;
  highlights: string[]; // founder-confirmed (2026-11-05), in his LinkedIn wording; [] hides
};

export const experience = {
  label: "05 — Experience",
  eyebrow: "Experience",
  title: "Where I've worked.",
  axisStart: 2019, // first year on the timeline (College project: PCB, 2019)
  asOf: "2026-11", // server-rendered "now" for Present roles; the browser swaps in the real month
  roles: [
    {
      id: "openplan",
      org: "OpenPlan AI",
      href: null,
      employment: "Full-time",
      location: "Bengaluru",
      stints: [{ title: "Co-Founder & CEO", start: "2026-06", end: null, workplace: "Hybrid" }],
      oneLine:
        "Building software to help hardware teams manage complex product development and bring products to market faster, without relying on disconnected tools, spreadsheets, and manual processes.",
      tags: ["Start-up Leadership"],
      metrics: null, // master doc: no verified OpenPlan metrics yet
      highlights: [
        "Selected for the NVIDIA Inception Program",
        "Selected for the AltaLab Acceleration Program (by AltaIR Capital)",
        "Showcased at Electronica India 2026, engaging with nearly 300 industry professionals",
      ],
    },
    {
      id: "spotmies",
      org: "Spotmies LLP",
      href: site.spotmiesUrl,
      employment: "Full-time",
      location: "Visakhapatnam",
      stints: [
        { title: "Co-Founder", start: "2020-04", end: null, workplace: "Hybrid" }, // exactly as LinkedIn: both titles start Apr 2020
        { title: "Co-Founder & CTO", start: "2020-04", end: "2026-05", workplace: "On-site" },
      ],
      oneLine: trackRecord.spotmies.summary,
      tags: ["Project Planning", "Architectural Design"],
      metrics: { scope: metrics.spotmies.scope, items: metrics.spotmies.items.slice(0, 3), growth: metrics.spotmies.growth }, // the office size isn't a growth figure
      highlights: [],
    },
    {
      id: "reaidy",
      org: "Reaidy.io",
      href: site.reaidyUrl,
      employment: "Part-time",
      location: "Visakhapatnam",
      stints: [{ title: "Co-Founder & CTO", start: "2023-09", end: "2026-04", workplace: "On-site" }], // founder, 2026-11-06: CTO added
      oneLine: trackRecord.reaidy.summary,
      tags: ["Product Development", "Business Strategy"],
      metrics: {
        scope: metrics.reaidy.scope,
        items: metrics.reaidy.items,
        // One campus drive, Nov 2025 (his post): "More than 300 students participated ... In just 4 hours".
        // Own source note (founder, 2026-11-05), so it doesn't sit under "reported by the team".
        extra: {
          scope: "One campus drive · LinkedIn post, Nov 2025",
          items: [
            { value: "300+", label: "students AI-interviewed in one campus drive" },
            { value: "4 hrs", label: "to complete all those interviews" },
          ],
        },
      },
      highlights: [
        "Secured a $50,000 technical grant from Microsoft under the Founders Hub program",
        "Reached the final round of Seed Stars at the IIT Bombay E-Summit", // Feb 2024 post
      ],
    },
    {
      id: "karkinos",
      org: "Karkinos Healthcare",
      href: null,
      employment: "Full-time",
      location: "Visakhapatnam",
      stints: [{ title: "Flutter Developer", start: "2021-03", end: "2021-08", workplace: "Remote" }],
      oneLine:
        "Contributed to designing and developing several features for the oncology platform while working alongside globally acclaimed medical professionals and technologists.",
      tags: ["Flutter", "React.js"],
      metrics: null,
      highlights: [],
    },
  ] satisfies ExperienceRole[],
  // Projects on the timeline (founder, 2026-11-05): years from the research file (sources in the timeline book
  // pages above). Years only, so the bars are drawn as approximate. Nandikrushi, StreamCity and Oscar Chatbot
  // join once the founder sends their years. Never guess a year.
  projects: [
    { id: "hexagon", name: "Hexagon", type: "hardware / IoT", fromYear: 2019, toYear: 2020 }, // was "Smart-device PCB" 2020 (founder, 2026-11-05)
    { id: "cypherb", name: "CypherB", type: "product / blockchain", fromYear: 2023, toYear: 2023 },
  ],
};

/* ============================================================================================
   05 — Projects (addendum-02 §2). Only projects with known context in the founder document
   (§5 "Products, projects, and portfolio"); one-liners from addendum-02 §2.3. Any null field is hidden.
   - myRole comes from the founder only. Never guess it.
   - type only where the document says it: Oscar Chatbot is "for a client"; the document doesn't say
     whether Nandikrushi or StreamCity were client work, so their type stays null.
   - builtWith: "Spotmies team" (default) or "solo"; null hides the line. Hardware & IoT predates
     Spotmies ("Early technical exploration"), and solo vs team isn't stated, so it's null.
   - stack: max 4, only where the document lists it (Hardware & IoT).
   - image: RANDOM PLACEHOLDERS (founder's request, 2026-11-04) until real screenshots arrive.
   ============================================================================================ */

export type ProjectType = "client" | "product" | "blockchain" | "hardware";

export type Project = {
  name: string;
  oneLine: string | null;
  year: string | null;
  type: ProjectType | null;
  myRole: string | null;
  problem: string | null;
  whatWeBuilt: string | null;
  stack: string[] | null; // max 4
  outcome: string | null;
  image: { src: string; alt: string; placeholder?: boolean } | null;
  link: string | null;
  builtWith: "Spotmies team" | "solo" | null;
};

// Placeholder photo (seeded, so the same picture each load). Seeds checked to avoid photos of people, which
// could be mistaken for a client or team member. Replace with real screenshots.
const placeholderImage = (seed: string) => ({ src: `https://picsum.photos/seed/${seed}/800/600`, alt: "", placeholder: true });

const project = (p: Pick<Project, "name" | "oneLine"> & Partial<Project>): Project => ({
  year: null,
  type: null,
  myRole: null,
  problem: null,
  whatWeBuilt: null,
  stack: null,
  outcome: null,
  image: null,
  link: null,
  builtWith: "Spotmies team",
  ...p,
});

export const projects = {
  label: "05 — Projects",
  eyebrow: "Projects",
  title: "Things I've helped ship.",
  intro: "Selected work from Spotmies and before. Built with the team, with my role stated on each.",
  more: { label: "More on GitHub", href: "https://github.com/sekharjavvadi" },
  // Order: newest first if years are known; they aren't yet, so addendum-02 §2.3 order.
  items: [
    project({ name: "CypherB", oneLine: "Blockchain recruitment and verification platform.", type: "blockchain", image: placeholderImage("cypherb") }),
    project({ name: "Indie Skull Syndicate", oneLine: "NFT and blockchain community project.", type: "blockchain", image: placeholderImage("skullnft") }),
    project({ name: "Nandikrushi", oneLine: "Organic grocery app.", image: placeholderImage("nandikrushi") }),
    project({ name: "StreamCity", oneLine: "Yoga streaming product.", image: placeholderImage("streamcity") }),
    project({ name: "Oscar Chatbot", oneLine: "Chatbot built for a client.", type: "client", image: placeholderImage("oscarbot") }),
    project({
      name: "Hardware & IoT prototypes",
      oneLine: "NodeMCU / ESP8266 boards, PIR-sensor anti-theft devices, schematic and PCB design.",
      type: "hardware",
      stack: ["NodeMCU", "ESP8266", "PIR sensors", "PCB design"],
      builtWith: null,
      image: placeholderImage("hardwareiot"),
    }),
  ] satisfies Project[],
};

/* ============================================================================================
   06 — How I build (brief §2.5; renumbered by addendum-02 §0 and the Education section)
   ============================================================================================ */

export const principles = {
  label: "06 — How I build",
  title: "How I build.",
  items: [
    {
      claim: "Start with the workflow, not the technology.",
      evidence:
        "Every product I've worked on began with a specific friction: screening candidates faster, keeping control of hardware changes.",
    },
    {
      claim: "A prototype is only the beginning.",
      evidence:
        "At Reaidy, the AI interviews worked. Then speech-service quotas capped how many could run at once. Making it hold up under real usage was the real work.",
    },
    {
      claim: "AI quality is product logic.",
      evidence:
        "Our mock interviews kept repeating questions. The fix wasn't a better model; it was tracking interview state and question history.",
    },
    {
      claim: "Architecture follows usage and cost.",
      evidence:
        "For resume search, we weighed MongoDB against a dedicated vector database on storage cost, speed and complexity, not convenience.",
    },
  ],
  vision: "I want to build practical platforms that help important industries move faster from ideas to real products.",
  // Labels inside the three diagrams (ink-orbit-features). Added for the UI, not from the brief.
  diagrams: {
    flow: {
      label: "People's everyday work flows through the product into sessions that keep running",
      hub: "Product",
      people: [
        "Recruiter · screening candidates",
        "Candidate · in an interview",
        "Engineer · revising a part",
        "Planner · raising a change order",
        "Reviewer · away",
      ],
      output: "Session",
    },
    // 03: the parts around the model (from the old "lessons": context, memory, evaluation, guardrails)
    parts: {
      label: "The model in the middle, with context, memory, evaluation and guardrails around it",
      items: ["Context", "Memory", "Evaluation", "Guardrails"],
      verb: "adding",
      idle: "around the model",
    },
    // 04: an illustrative usage curve; the tooltip shows no numbers
    chart: {
      label: "Usage growing over time, with a projected tail",
      values: [22, 26, 24, 31, 29, 36, 34, 41, 39, 47, 52, 58],
      projectedFrom: 8,
      point: "wk",
      projected: "projected",
    },
  },
};

/* ============================================================================================
   07 — Testimonials (addendum-02 §3). NON-NEGOTIABLE:
   - Real people only. Each quote is written by that person, or written by Sekhar and approved by them
     word for word, with permission to publish their name, role and company (and photo, if used).
   - No editing that changes meaning; shortening with "…" only if the person approves it.
   - NEVER invent, paraphrase or "polish" a testimonial. Code and agents must not write any quote text.
   - Fewer than `minToShow` real entries: the section shows its layout with [bracketed] PLACEHOLDER slots
     (founder's request, 2026-11-04). Slots are layout only, never quotes; they disappear once 2+ real entries exist.
   Best sources, in order: paying Spotmies clients; Reaidy recruiters / college partners; Spotmies
   co-founders or senior teammates; AU Incubation Centre / A Hub mentors; early OpenPlan users.
   ============================================================================================ */

export type Testimonial = {
  quote: string; // 1–3 sentences, about 280 characters at most, exactly as approved
  name: string;
  role: string | null;
  company: string | null;
  relationship: string | null; // e.g. "Client, 2023" or "Co-founder at Spotmies"
  photo: { src: string; alt: string } | null;
  link: string | null; // their LinkedIn
  context: string | null; // which project or venture it refers to
};

export const testimonials = {
  label: "07 — Testimonials",
  eyebrow: "Testimonials",
  title: "In their words.",
  minToShow: 2,
  // Source: ../Sekhar_Javvadi_Portfolio_Testimonials.pdf (founder, 2026-11-05), copied word for word in the PDF's order.
  // Only one Swaroop (founder, 2026-11-05): the Dwight Labs quote (#11 in the PDF) stays; #1 removed. Company corrected
  // to "Advait Labs" by the founder (2026-11-06).
  // photo: from the founder's "client images" folder (2026-11-05), square crops in /public/testimonials. Every entry
  // has its own photo now; null would fall back to a neutral stand-in.
  items: [
    // Order (founder, 2026-11-06): Marco Turk, Larry Blackburn, Nolan Clark, Ravi Eswarapu, Lakshmipathi Raju,
    // Vamsi Gummadi, Ravi Unukuru, Pragnatej, Swaroop; the rest in any order.
    { quote: "I was particularly impressed by Sekhar's technical expertise and adaptability while developing our AI solution. He quickly understood our requirements, translated ideas into practical technical solutions, and ensured the development process went smoothly. I highly recommend working with him for innovative technology projects.", name: "Marco Turk", role: "Founder", company: "Zin In Thuiswerken", relationship: null, photo: { src: "/testimonials/marco-turk.webp", alt: "Marco Turk" }, link: null, context: null },
    { quote: "Sekhar is building something genuinely interesting in the hardware technology space. His vision of creating a lightweight PLM platform for modern hardware teams through OpenPlan AI addresses an interesting and underserved market. I am impressed by his understanding of the industry, his ability to identify market opportunities, and his ambition to build a product for this niche.", name: "Larry Blackburn", role: "Former Director of Marketing", company: "Intel", relationship: null, photo: { src: "/testimonials/larry.webp", alt: "Larry Blackburn" }, link: null, context: null },
    { quote: "I connected with Sekhar through Reddit, and what immediately stood out was his genuine interest in solving meaningful problems. He has a great ability to understand challenges, work with people, and think strategically about business and marketing. His passion for building and his problem solving mindset make him someone I genuinely admire.", name: "Nolan Clark", role: "Director of Business Operations", company: "Motorola", relationship: null, photo: { src: "/testimonials/nolan.webp", alt: "Nolan Clark" }, link: null, context: null },
    { quote: "I have known Sekhar for over four years and have witnessed his entrepreneurial journey closely. Watching him grow Spotmies from a small team of around four people to a team of 25 within our incubation ecosystem has been remarkable. His hunger to achieve more, passion for entrepreneurship, and ability to scale a business at such a pace are truly inspiring.", name: "Ravi Eswarapu", role: "Serial Entrepreneur, Investor & CEO", company: "RTH", relationship: null, photo: { src: "/testimonials/ravi-eswarapu.webp", alt: "Ravi Eswarapu" }, link: null, context: null },
    { quote: "Sekhar started his entrepreneurial journey during his college days, building things from the ground up alongside his friends. His journey and dedication towards entrepreneurship have genuinely inspired me to start my own company. He is one of the most positive and energetic people I have met, and his enthusiasm for building something meaningful is contagious.", name: "Lakshmipathi Raju", role: "Co Founder & CEO", company: "Digi Automation", relationship: null, photo: { src: "/testimonials/lakshmipathi-raju.webp", alt: "Lakshmipathi Raju" }, link: null, context: null },
    { quote: "Sekhar demonstrated excellent ownership and dedication throughout our project. His ability to understand requirements, coordinate technical execution, and deliver quality work within the expected timelines was outstanding. His commitment to customer satisfaction and project delivery really impressed me.", name: "Vamsi Gummadi", role: "Founder & CEO", company: "Sweken", relationship: null, photo: { src: "/testimonials/vamsi-gummadi.webp", alt: "Vamsi Gummadi" }, link: null, context: null },
    { quote: "Sekhar has a remarkable understanding of technology and product development. I was particularly impressed by his ability to connect product ideas with practical business requirements. His suggestions around UI design, frontend development, and blockchain technology helped bring a broader perspective to the project. He is exceptionally knowledgeable in his field.", name: "Ravi Unukuru", role: "Web3 Entrepreneur & YouTuber", company: null, relationship: null, photo: { src: "/testimonials/ravi-unukuru-v2.webp", alt: "Ravi Unukuru" }, link: null, context: null },
    { quote: "Sekhar has an exceptional understanding of technology and knows how to connect it with business and marketing strategies. What impresses me most is his ability to understand users, identify what truly matters to a product, and distinguish essential features from unnecessary complexity. His product thinking and ability to grasp things quickly are remarkable.", name: "Pragnatej", role: "Co Founder & Chief Product Officer", company: "Mutiny", relationship: null, photo: { src: "/testimonials/pragnatej-v2.webp", alt: "Pragnatej" }, link: null, context: null },
    { quote: "Sekhar demonstrated exceptional ownership while working on our pharmaceutical technology application. He took responsibility for the technical development and played an important role in bringing the application to production. The product was successfully launched in California for clinical trial operations in the United States. His contribution, technical commitment, and ability to handle complex enterprise requirements were invaluable. We have continued working towards the next version of the product.", name: "Swaroop", role: "Founder & CEO", company: "Advait Labs", relationship: null, photo: { src: "/testimonials/swaroop.webp", alt: "Swaroop" }, link: null, context: null },
    { quote: "Sekhar is one of the most inspiring people I have met. His passion for building startups and creating something of his own is remarkable. What stands out about him is his entrepreneurial mindset, strategic thinking, and ability to turn ambitious ideas into meaningful initiatives.", name: "Shiva Dokula", role: "Co Founder", company: "No Drafts", relationship: null, photo: { src: "/testimonials/shiva.webp", alt: "Shiva Dokula" }, link: null, context: null },
    { quote: "Sekhar has an incredible ability to build products from scratch. He developed our application through Spotmies, and I was particularly impressed by how quickly he understood the complexities of the DNA and healthcare domain. His learning speed, technical grasp, and ability to translate complex requirements into working solutions are outstanding.", name: "Navin Sai", role: "Founder & CEO", company: "MyBodyCode", relationship: null, photo: { src: "/testimonials/navin-sai.webp", alt: "Navin Sai" }, link: null, context: null },
    { quote: "Sekhar has an exceptional level of dedication towards building technology that creates real value for businesses. I was particularly impressed by his work on developing our IoT device. He and his team took the project from development to a production grade implementation. His technical commitment and execution capabilities were truly impressive.", name: "Praveen", role: "Co Founder & CEO", company: "VitalCare Pro and Safeguard Air", relationship: null, photo: { src: "/testimonials/praveen.webp", alt: "Praveen" }, link: null, context: null },
  ] satisfies Testimonial[],
  // Layout-only slots shown while there are fewer than minToShow real entries. Not quotes: every field is [bracketed].
  // The relationship hints follow the source order in addendum-02 §3.3.
  placeholders: [
    { quote: "[Their words, 1–3 sentences, approved word for word: to be added]", name: "[Name]", role: "[Role]", company: "[Company]", relationship: "[Spotmies client]", photo: null, link: null, context: null },
    { quote: "[Their words, 1–3 sentences, approved word for word: to be added]", name: "[Name]", role: "[Role]", company: "[Company]", relationship: "[Reaidy recruiter or college partner]", photo: null, link: null, context: null },
    { quote: "[Their words, 1–3 sentences, approved word for word: to be added]", name: "[Name]", role: "[Role]", company: "[Company]", relationship: "[Co-founder or teammate]", photo: null, link: null, context: null },
  ] satisfies Testimonial[],
};

/* ============================================================================================
   08 — Contact + footer (addendum §3, replaces brief §2.6 and §2.7; renumbered by addendum-02 §0 and the Education section)
   ============================================================================================ */

export const contact = {
  label: "08 — Contact",
  title: "Let's talk.",
  audiences: [
    { label: "Investors & accelerators", text: "I'd like to tell you about OpenPlan AI and where it's going." },
    { label: "Hardware teams", text: "See how OpenPlan fits the way your team builds." },
    { label: "Builders", text: "Always happy to compare notes." },
  ],
  email: site.email,
  primary: { label: "Email me", href: `mailto:${site.email}` },
  copy: { idle: "Copy", done: "Copied" },
  location: site.location,
  marquee: "INVESTORS · HARDWARE TEAMS · BUILDERS · OPENPLAN AI ·", // optional; decision deferred
  footer: { copyright: "© 2026 Sekhar Javvadi", backToTop: "Back to top" },
};

/* ============================================================================================
   LEGACY: still read by sections that haven't been rebuilt yet. Delete each block when the
   section that imports it is rebuilt (see docs/sekharjavvadi-redesign-brief.md §2).
   ============================================================================================ */

// LEGACY: Contact section and footer (page.tsx). Built from `site` so nothing is duplicated.
export const profile = {
  name: site.name,
  location: site.location,
  email: site.email,
  socials: site.socials,
};

// LEGACY: HeroReveal (unused component; deleted in the cleanup step).
// Placeholder "S" monogram.
export const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M70 30C66 20 56 16 48 16 35 16 28 24 28 33c0 22 44 12 44 34 0 10-9 17-22 17-10 0-19-5-22-14" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/></svg>`;

// LEGACY: old How I Build section. Replaced by `principles` above.
export const thinking = {
  mindset:
    "Understand the workflow, identify the friction, learn the underlying technology, build a practical solution, test it with real users, and improve the product based on evidence.",
  principles: [
    { title: "Start with a practical problem", body: "Hiring teams screening faster, hardware teams controlling product data — the product starts from operational friction, not technology for its own sake." },
    { title: "Learn by building", body: "Curiosity turns into architecture, data structures, and deployment. Understanding improves by building and testing." },
    { title: "Connect engineering with business", body: "Every technical choice ties back to customers, pricing, usage cost, and positioning — Reaidy was a two-sided business, not just an AI system." },
    { title: "Look for leverage", body: "Solve a problem once and make the solution useful to many customers. That's the move from services to products." },
    { title: "Think in systems", body: "Candidates and recruiters, parts and assemblies, changes and plans — the full workflow matters more than an isolated feature." },
    { title: "Respect operational reality", body: "API quotas, concurrency, storage cost, and reliability are the gap between a prototype and a product." },
  ],
  lessons: [
    "A prototype is only the beginning. A product must also be reliable, scalable, understandable, and affordable to operate.",
    "AI product quality comes from the complete workflow — context, memory, evaluation, and guardrails — not just model selection.",
    "Architecture should reflect expected usage and cost, not only initial convenience.",
    "External dependencies need contingency plans and clear communication.",
    "Customer and market feedback should shape priorities continuously.",
  ],
  vision:
    "To build practical technology platforms that simplify complex work, empower teams, and help important industries move faster from ideas to real products.",
};
