/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  content/site.ts — THE ONE FILE TO EDIT
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every word on the site comes from here. Facts were seeded ONLY from
 *  Raphael's master résumé (master_muse_1024.pdf) plus the confirmed brief.
 *
 *  Search for "TODO" to find everything that still needs Raphael's input.
 *  Rules: never invent clients, numbers, dates or skills. Studio Nostalgia is
 *  its own employer: never merge it with akasm, never give it a project count.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CaseSlug =
  | "photo-art-direction"
  | "costar"
  | "akasm"
  | "studio-nostalgia"
  | "bricks";

export type CaseRowRef = { slug: CaseSlug; title: string; sub: string };

export type Entry = {
  id: string;
  company: string;
  /** Short text shown inside the round "logo chips". Swap for real logo files later. */
  chips: string[];
  role: string;
  years: string;
  /** Small mono eyebrow above the year in the left gutter. */
  gutter: string;
  current?: boolean;
  description: string;
  cases?: CaseRowRef[];
  /** Set false to keep an entry in the file but off the page. */
  show?: boolean;
};

export type CaseStudy = {
  slug: CaseSlug;
  title: string;
  eyebrow: string[];
  sub: string;
  role: string;
  years: string;
  /** Paragraphs. Placeholders are clearly marked TODO. */
  body: string[];
  facts: { label: string; value: string }[];
  /** Image slots: ratio is width/height. Replace `src` with files in /public/work/<slug>/ */
  figures: { caption: string; ratio: number; src?: string }[];
  /** Optional before/after (great for retouching / grading). */
  compare?: { caption: string; before?: string; after?: string };
};

export const site = {
  name: "Raphael Merchant",
  /** Passenger line on the boarding pass (LAST / FIRST). */
  passengerName: "MERCHANT / RAPHAEL",
  monogram: "RM", // TODO: replace with Raphael's real monogram/logo (SVG) when ready
  title: "Photo Art Director & Creative Producer",
  /** TODO: Raphael to approve or rewrite this two-line intro (paraphrased from the résumé). */
  intro:
    "Art-directing and producing photo, film and aerial work for brands, real estate and studios — from shot list to final delivery.",
  location: "Mississauga, ON",
  coords: { lat: 43.589, lon: -79.6441 },
  timeZone: "America/Toronto",
  url: "https://akasm-portfolio.vercel.app", // TODO: confirm the final domain

  contact: {
    // TODO: confirm each link before publishing. Leave "" to show a TODO pill.
    email: "", // TODO: e.g. the address on the résumé
    linkedin: "", // TODO: LinkedIn URL
    behance: "", // TODO: Behance URL (résumé lists a Behance profile)
    instagram: "", // TODO: Instagram URL (optional)
  },

  /** TODO: drop the final ATS-friendly PDF into /public with this exact name. */
  resumePdf: "/Raphael-Merchant-Resume.pdf",

  /** Boarding-pass artwork fields (drawn in code, see lib/passArt.ts). */
  pass: {
    airline: "MERCHANT AIR", // TODO: Raphael's own invented airline / brand line
    tagline: "PHOTO ART DIRECTION · CREATIVE PRODUCTION",
    flight: "RM2018", // initials + the year akasm was founded
    from: { code: "YYZ", city: "TORONTO / MISSISSAUGA" },
    to: { code: "NXT", city: "YOUR TEAM" }, // TODO: destination = his next role
    date: "OPEN DATE",
    gate: "AD",
    boarding: "NOW",
    seat: "1A",
    zone: "GTA",
    class: "CREATIVE",
    cert: "RPAS ADV", // Transport Canada Advanced RPAS pilot
    fineprint:
      "Carry-on: camera body, gimbal, drone and an Advanced RPAS certificate. Boarding closes when the final frame ships.",
  },

  /** Flight-plan timeline, top to bottom. */
  timeline: [
    {
      id: "bricks",
      company: "Bricks",
      chips: ["Br"], // TODO: Bricks logo
      role: "Founder · Creative Director & Operations Lead",
      years: "2025 — Present",
      gutter: "FOUNDER",
      current: true,
      description:
        "AI-enabled creative operations for Canadian real-estate media: the brand, the visual standard and the system the work runs on — book, shoot, deliver.",
      cases: [
        { slug: "bricks", title: "Bricks", sub: "AI-enabled creative operations and a 24-hour photo delivery standard" },
      ],
    },
    {
      id: "akasm",
      company: "akasm",
      chips: ["ak"], // TODO: akasm logo
      role: "Founder · Art Director & Photographer",
      years: "2018 — Present",
      gutter: "STUDIO",
      current: true,
      description:
        "Independent creative studio. Art-direct and produce brand campaigns end to end — casting, locations, crew, set and post — through QC and delivery.",
      cases: [
        { slug: "akasm", title: "akasm — brand production", sub: "Campaigns and content systems for national clients, including Carhartt" },
        { slug: "photo-art-direction", title: "Photo art direction", sub: "Stills, motion and aerial — directed on set, finished in post" },
      ],
    },
    {
      id: "costar",
      company: "CoStar Group",
      chips: ["Co"], // TODO: CoStar logo (factual "worked at" context only)
      role: "Regional Art Director",
      years: "2023 — 2025",
      gutter: "GGH",
      description:
        "Field and construction-monitoring photography across the Greater Golden Horseshoe. Held the visual standard for property media across 14,600+ listings.",
      cases: [
        { slug: "costar", title: "CoStar — field media", sub: "Interiors, exteriors, aerials and virtual tours at regional scale" },
      ],
    },
    {
      id: "studio-nostalgia",
      company: "Studio Nostalgia",
      chips: ["SN"], // TODO: Studio Nostalgia logo
      role: "Studio Lead · Creative Production Lead",
      years: "2020 — 2023",
      gutter: "STUDIO",
      description:
        "University and post-secondary graduation photography plus studio process management. Trained and led seasonal teams of up to 15 photographers.",
      cases: [
        { slug: "studio-nostalgia", title: "Studio Nostalgia", sub: "Graduation sessions, shoot systems and studio process" },
      ],
    },
    {
      id: "rbc",
      company: "RBC",
      chips: ["RBC"],
      role: "Credit Supervisor",
      years: "2018 — 2020",
      gutter: "BANKING",
      description:
        "Supervised client account and credit casework in a high-volume centre — reviewing and verifying work against compliance standards.",
    },
    {
      id: "bmo",
      company: "BMO",
      chips: ["BMO"],
      role: "General Banking Specialist",
      years: "2016 — 2018",
      gutter: "BANKING",
      description:
        "Front-line client service across multiple banking systems, resolving account inquiries at first point of contact.",
    },
    {
      id: "royal-lepage",
      company: "Royal LePage Signature",
      chips: ["RL"],
      role: "Administrative Assistant / Receptionist",
      years: "2014 — 2015",
      gutter: "BROKERAGE",
      description: "Front-of-house at a real-estate brokerage in Mississauga.",
      show: false, // TODO: on the résumé but not in the brief — set true to show
    },
  ] satisfies Entry[] as Entry[],

  credentials: [
    { label: "Transport Canada", value: "Advanced RPAS (drone) pilot certificate" },
    { label: "York University", value: "Bachelor of Fine Arts (BFA)" },
  ],

  /** Clients that may be named publicly. */
  clients: ["Carhartt"],
  /**
   * TODO (do not render until confirmed): the master résumé also lists these
   * akasm clients — Starbucks, Land Rover, Roots, Best Buy, Chipotle,
   * Uber Eats, DoorDash. They are NOT shown anywhere on the site.
   */

  tools: ["Photoshop", "Lightroom", "Premiere Pro", "After Effects", "Illustrator", "InDesign", "Final Cut Pro", "Capture One", "Figma", "Higgsfield", "Notion"],

  /** Five personal photos for the "memories" fan. TODO: add files + captions. */
  memories: [
    { caption: "TODO: caption 1", src: "" },
    { caption: "TODO: caption 2", src: "" },
    { caption: "TODO: caption 3", src: "" },
    { caption: "TODO: caption 4", src: "" },
    { caption: "TODO: caption 5", src: "" },
  ],

  /** TODO: Raphael's own sign-off line (keep the travel metaphor). */
  outro: {
    line: "Wheels down. Thanks for boarding.",
    sub: "A few frames from between takeoff and landing.",
  },
};

export const cases: CaseStudy[] = [
  {
    slug: "photo-art-direction",
    title: "Photo art direction",
    eyebrow: ["akasm", "Selected work"],
    sub: "Stills, motion and aerial — concept to delivery.",
    role: "Art Director & Photographer",
    years: "2018 — Present",
    body: [
      "Lead photographer and director on set for stills, motion and aerial, with a Transport Canada Advanced RPAS certificate behind the aerial work.",
      "TODO: 150–400 words — the brief, your role, the process and the outcome for a selected project.",
    ],
    facts: [
      { label: "Disciplines", value: "Photo · Film · Aerial" },
      { label: "Certification", value: "Advanced RPAS" },
      { label: "Tools", value: "Capture One · Lightroom · Photoshop" },
    ],
    figures: [
      { caption: "TODO: hero image", ratio: 3 / 2 },
      { caption: "TODO: on-set image", ratio: 4 / 5 },
      { caption: "TODO: final selects", ratio: 3 / 2 },
    ],
    compare: { caption: "TODO: before / after grade" },
  },
  {
    slug: "costar",
    title: "CoStar Group",
    eyebrow: ["Regional Art Director", "2023 — 2025"],
    sub: "Field and construction-monitoring photography across the Greater Golden Horseshoe.",
    role: "Regional Art Director — Field Research Photography & Drone Operations",
    years: "2023 — 2025",
    body: [
      "Managed visual deliverables for CoStar subsidiaries across the Greater Golden Horseshoe and set the standard for property media across 14,600+ listings — interiors, exteriors, aerials and virtual tours.",
      "Operated as a one-person production unit — camera, gimbal, drone and virtual-tour capture — and fed field intelligence such as construction status back to research teams.",
      "TODO: add selected images (with permission) and any additional context.",
    ],
    facts: [
      { label: "Listings", value: "14,600+" },
      { label: "Region", value: "Greater Golden Horseshoe" },
      { label: "Capture", value: "Photo · Drone · Virtual tour" },
    ],
    figures: [
      { caption: "TODO: exterior / aerial", ratio: 3 / 2 },
      { caption: "TODO: construction monitoring", ratio: 3 / 2 },
      { caption: "TODO: interior", ratio: 4 / 5 },
    ],
  },
  {
    slug: "akasm",
    title: "akasm",
    eyebrow: ["Brand production", "2018 — Present"],
    sub: "An independent studio for brand campaigns and content systems.",
    role: "Founder · Art Director & Photographer",
    years: "2018 — Present",
    body: [
      "Art-direct and produce brand campaigns and content systems — photo, film and social — from first concept through final delivery and approval.",
      "Build shoots end to end: casting, locations, crew and vendor sourcing, schedules and shot lists, then direct on set and own post-production through QC.",
      "TODO: write up the Carhartt project (brief, role, process, outcome) once approved for public use.",
    ],
    facts: [
      { label: "Client", value: "Carhartt" },
      { label: "Scope", value: "Photo · Film · Social" },
      { label: "Role", value: "Art Director · Producer" },
    ],
    figures: [
      { caption: "TODO: campaign hero", ratio: 3 / 2 },
      { caption: "TODO: behind the scenes", ratio: 4 / 5 },
      { caption: "TODO: content system", ratio: 1 },
    ],
  },
  {
    slug: "studio-nostalgia",
    title: "Studio Nostalgia",
    eyebrow: ["Studio Lead", "2020 — 2023"],
    sub: "University and post-secondary graduation photography, plus studio process management.",
    role: "Studio Lead · Creative Production Lead",
    years: "2020 — 2023",
    body: [
      "Led the studio's creative output across graduation programmes — session planning, shoot direction, post-production and delivery.",
      "Trained and mentored seasonal photographers in teams of up to 15 at peak, and built the shoot systems, staffing plans and quality bar the studio ran on.",
      "TODO: add images (with permission) and a short note on the studio process you built.",
    ],
    facts: [
      { label: "Team", value: "Up to 15 photographers" },
      { label: "Focus", value: "Graduation photography" },
      { label: "Ops", value: "Studio process management" },
    ],
    figures: [
      { caption: "TODO: studio set-up", ratio: 3 / 2 },
      { caption: "TODO: graduation portrait", ratio: 4 / 5 },
    ],
  },
  {
    slug: "bricks",
    title: "Bricks",
    eyebrow: ["Founder", "2025 — Present"],
    sub: "AI-enabled creative operations for real-estate media.",
    role: "Founder · Creative Director & Operations Lead",
    years: "2025 — Present",
    body: [
      "Bricks runs real-estate media on one flow — book, pay, auto-assign, shoot, delivered — replacing the patchwork of texts, Drive links and invoices.",
      "Defined the brand from zero and direct a distributed network of photographers and editors to a 24-hour photo delivery standard.",
      "TODO: add product screens and a reel (hover-play tiles work well here).",
    ],
    facts: [
      { label: "Role", value: "Founder" },
      { label: "Standard", value: "24-hour photo delivery" },
      { label: "Focus", value: "Creative operations" },
    ],
    figures: [
      { caption: "TODO: Bricks OS screen", ratio: 16 / 10 },
      { caption: "TODO: listing media", ratio: 3 / 2 },
    ],
  },
];

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug);
