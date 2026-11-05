import type { ReactNode } from "react";

// Line icons for the OpenPlan problem/capability grid (24px grid, 1.5 stroke, currentColor).
// Order matches `openplan.problems` and `openplan.capabilities` in data/portfolio.ts.

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const problemIcons: ReactNode[] = [
  // Product data is scattered
  <Icon key="scattered">
    <rect x="3" y="4" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="12" y="13" width="9" height="8" rx="1.5" />
    <rect x="3" y="15" width="5" height="5" rx="1.5" />
  </Icon>,
  // Changes are hard to control
  <Icon key="changes">
    <path d="M3 7h4c3 0 4 10 8 10h6" />
    <path d="M3 17h4c1.5 0 2.5-1.5 3.3-3.5" />
    <path d="M14 8.5c.7-.9 1.6-1.5 2.9-1.5H21" />
    <path d="m18 4 3 3-3 3" />
    <path d="m18 14 3 3-3 3" />
  </Icon>,
  // Visibility comes late
  <Icon key="visibility">
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13 13 0 0 1-2.4 3.6" />
    <path d="M6.6 6.6C4.4 8 3 10.2 2.5 12c1 2.5 4.5 7 9.5 7 1.9 0 3.6-.6 5-1.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>,
];

export const capabilityIcons: ReactNode[] = [
  // BOM management
  <Icon key="bom">
    <path d="m12 2.5 9 4.5-9 4.5L3 7l9-4.5Z" />
    <path d="m3 12 9 4.5 9-4.5" />
    <path d="m3 16.5 9 4.5 9-4.5" />
  </Icon>,
  // Engineering change orders
  <Icon key="eco">
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1" />
    <path d="m9 13 2 2 4-4" />
  </Icon>,
  // Lifecycle workflows
  <Icon key="lifecycle">
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 20v-4h-4" />
  </Icon>,
  // Connected project work
  <Icon key="connected">
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="12" cy="18" r="2.5" />
    <path d="M8.5 6h7M7.2 8.2l3.6 7.6M16.8 8.2l-3.6 7.6" />
  </Icon>,
];
