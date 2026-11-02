/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  content/site.ts — THE ONE FILE TO EDIT
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every word on the site comes from here. Facts come from Raphael's master
 *  ATS résumé (canon) and copy/images carried over from the previous portfolio.
 *  Where the two disagreed, the résumé wins.
 *
 *  Rules: never invent clients, numbers, dates or skills. Brand clients belong
 *  to akasm only. Studio Nostalgia is its own employer: never merge it with
 *  akasm, never give it a project count or brand clients.
 *  Images live in /public/work/<slug>/; add each new file's [width, height]
 *  to content/media.ts so next/image can size it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CaseSlug =
  | "costar"
  | "akasm"
  | "lovecorn"
  | "carhartt"
  | "benz"
  | "landscape"
  | "ai-horses"
  | "photo-art-direction"
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

export type Figure = { caption: string; src: string };

export type CaseStudy = {
  slug: CaseSlug;
  title: string;
  eyebrow: string[];
  sub: string;
  role: string;
  /** Omit when the old portfolio gave no dates for the piece. */
  years?: string;
  body: string[];
  facts: { label: string; value: string }[];
  /** Files in /public/work/<slug>/. Size comes from content/media.ts. */
  figures: Figure[];
  links?: { label: string; href: string }[];
  /** Optional before/after (only with a true capture/edit pair of identical framing). */
  compare?: { caption: string; before?: string; after?: string };
};

/** Brand clients — akasm commissions only (canon list). */
const AKASM_CLIENTS = ["Starbucks", "Chipotle", "Best Buy", "Roots", "Uber Eats", "DoorDash", "Storage Mart", "LoveCorn", "Carhartt"];

const w = (slug: string, file: string) => `/work/${slug}/${file}`;

export const site = {
  name: "Raphael Merchant",
  /** Passenger line on the boarding pass (LAST / FIRST). */
  passengerName: "MERCHANT / RAPHAEL",
  monogram: "RM", // Placeholder monogram (also drawn on the pass) — swap for a real mark if Kam supplies one.
  title: "Photographer & Art Director",
  intro:
    "Photographer and art director in Mississauga — cinematic, character-first stills, film and aerial for brands, real estate and studios, from shot list to final delivery.",
  location: "Mississauga, ON",
  coords: { lat: 43.589, lon: -79.6441 },
  timeZone: "America/Toronto",
  url: "https://akasm-portfolio.vercel.app",

  /** Exactly as on the previous portfolio + résumé. No phone number anywhere public. */
  contact: {
    email: "raph@shortermerchant.com",
    linkedin: "https://www.linkedin.com/in/akasm",
    behance: "https://be.net/akasm",
    unsplash: "https://unsplash.com/@akasm",
  },

  /** Master ATS résumé with the phone number removed. */
  resumePdf: "/Raphael-Merchant-Resume.pdf",

  about: [
    "Raphael Merchant is a photographer and art director based in Mississauga. The work leans cinematic and romantic — romanticized realism — where subjects are made monumental through scale, motion, and contrast. Luxury and athleticism against grit or open land. Hard daylight and soft fog. Motion blur as authorship. Not amenity photography — character first.",
  ],
  aboutFacts: [
    { label: "Role", value: "Photographer & Art Director" },
    { label: "Based", value: "Mississauga, ON" },
    { label: "Status", value: "Available freelance & full-time" },
    { label: "Focus", value: "Editorial · Automotive · Workwear · Landscape" },
  ],
  /** Boarding-pass artwork fields (drawn in code, see lib/passArt.ts). */
  pass: {
    airline: "MERCHANT AIR", // Placeholder airline line on the pass — Kam to confirm or rename.
    tagline: "PHOTO ART DIRECTION · CREATIVE PRODUCTION",
    flight: "RM2018", // initials + the year akasm was founded
    from: { code: "LHR", city: "LONDON" }, // Raphael's story: London → Toronto
    to: { code: "YYZ", city: "TORONTO" },
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
      chips: ["Br"],
      role: "Production & Operations Lead",
      years: "2025 — Present",
      gutter: "OPS",
      current: true,
      description:
        "A Canadian real-estate media and operations platform — book → pay → auto-assign → shoot → delivered. Run as sole operator, owning pricing, margin, resourcing and revenue decisions with full P&L accountability.",
      cases: [
        { slug: "bricks", title: "Bricks", sub: "Listing media, end to end — book, shoot, deliver" },
      ],
    },
    {
      id: "akasm",
      company: "akasm",
      chips: ["ak"],
      role: "Director · Photographer · Filmmaker",
      years: "2018 — Present",
      gutter: "STUDIO",
      current: true,
      description: `Independent creative studio. Art-direct and produce brand campaigns and content systems — photo, film and social — from first concept through delivery. Clients include ${AKASM_CLIENTS.join(", ")}.`,
      cases: [
        { slug: "akasm", title: "akasm — brand production", sub: "Campaigns and content systems for national clients" },
        { slug: "lovecorn", title: "LoveCorn", sub: "Creative direction — rebrand, packaging and campaign launch" },
        { slug: "carhartt", title: "Carhartt WIP", sub: "Workwear editorial — industrial booth, orange jacket, camo and fleece" },
        { slug: "benz", title: "Benz", sub: "Mercedes barn study — a classic Benz framed by riders in the hall" },
        { slug: "landscape", title: "Landscape", sub: "Arid valleys, B&W highlands and train-framed mountains" },
        { slug: "ai-horses", title: "AI Horses", sub: "Generated Western riders — dust, motion and hard blue sky" },
        { slug: "photo-art-direction", title: "Selected frames", sub: "Standalone frames — automotive, workwear and open land" },
      ],
    },
    {
      id: "costar",
      company: "CoStar Group",
      chips: ["Co"],
      role: "Regional Visual Media Lead / Field Research Photographer",
      years: "06/2023 — 06/2025",
      gutter: "GGH",
      description:
        "All visual media deliverables for every CoStar subsidiary across the Greater Golden Horseshoe — 14,600+ listings, 20+ commercial properties a day for two years, and 1,687 drone flights. Part of the team that launched Apartments.com in Canada.",
      cases: [
        { slug: "costar", title: "CoStar — field media", sub: "Interiors, exteriors, aerials and virtual tours at regional scale" },
      ],
    },
    {
      id: "studio-nostalgia",
      company: "Studio Nostalgia",
      chips: ["SN"],
      role: "Studio Lead",
      years: "2020 — 2023",
      gutter: "STUDIO",
      description:
        "Graduation and studio portrait photography at volume. Led the studio's creative output and trained and mentored seasonal teams of up to 15.",
      cases: [
        { slug: "studio-nostalgia", title: "Studio Nostalgia", sub: "Graduation portraits, soft studio light and process in frame" },
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
        "Supervised live client account and credit casework in a high-volume centre — assigning, reviewing and verifying work against bank compliance standards.",
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
      show: false, // On the résumé but not in the brief — set true to show.
    },
  ] satisfies Entry[] as Entry[],

  credentials: [
    { label: "Transport Canada", value: "Advanced RPAS (drone) pilot certificate — 1,687 flights · 1,580 km · 157 hours" },
    { label: "York University", value: "Bachelor of Fine Arts (BFA), 2014–2018" },
    { label: "TopPhotoAwards 2021", value: "Staged food photography honoured" },
    { label: "Snappr 2019", value: "Named among Toronto's Best Photographers" },
  ],

  /** Clients that may be named publicly — akasm only. */
  clients: AKASM_CLIENTS,

  tools: ["Capture One", "Lightroom", "Photoshop", "Premiere Pro", "After Effects", "Illustrator", "InDesign", "Final Cut Pro", "Figma", "Higgsfield", "Frame.io", "Notion", "Asana", "Monday.com", "Airtable"],

  /** Five frames for the "memories" fan. */
  memories: [
    { caption: "Mercedes coupe alone in a riding hall", src: w("gallery", "mercedes-barn-solo.jpg") },
    { caption: "Cream Ferrari F40 on a residential street", src: w("gallery", "f40-street.jpg") },
    { caption: "Trail runners moving through arid terrain", src: w("gallery", "trail-runners.jpg") },
    { caption: "Lancia Integrale suspended in a desert study", src: w("gallery", "lancia-integrale.jpg") },
    { caption: "Figure in a yellow tee in a green field", src: w("gallery", "garm-field.jpg") },
  ],

  outro: {
    line: "Wheels down. Thanks for boarding.",
    sub: "A few frames from between takeoff and landing.",
  },
};

const seq = (slug: string, files: [string, string][]): Figure[] => files.map(([f, caption]) => ({ src: w(slug, f), caption }));

export const cases: CaseStudy[] = [
  {
    slug: "costar",
    title: "CoStar Group",
    eyebrow: ["Regional Visual Media Lead", "06/2023 — 06/2025"],
    sub: "Visual standards and architectural craft across the Greater Golden Horseshoe — how industrial and residential space reads on camera.",
    role: "Regional Visual Media Lead / Field Research Photographer",
    years: "06/2023 — 06/2025",
    body: [
      "Managed all visual media deliverables for every CoStar subsidiary across the Greater Golden Horseshoe, CoStar's largest region in Canada — photography, drone and virtual tours — owning the quality, consistency and delivery of property media at regional scale.",
      "Set and held the visual standard across 14,600+ listings, sustaining 20+ commercial properties a day for two years: interiors, exteriors, aerials and virtual tours shot in live retail and residential environments.",
      "Part of the team that launched Apartments.com in Canada, owning the visual deliverables behind the launch; that media went on to feed national Apartments.com campaigns, including Super Bowl commercial productions.",
      "Flew 1,687 drone missions (1,580 km, 157 hours) under a Transport Canada Advanced RPAS certificate, and worked as a one-person production unit — camera, gimbal, drone and virtual-tour capture — feeding new listings, construction status and tenant changes back to CoStar's research teams.",
    ],
    facts: [
      { label: "Listings", value: "14,600+" },
      { label: "Pace", value: "20+ commercial properties / day" },
      { label: "Drone", value: "1,687 flights · 1,580 km · 157 h" },
      { label: "Launch", value: "Apartments.com Canada" },
    ],
    figures: seq("costar", [
      ["01-cover.jpg", "Industrial loading — trailer at dock, CRE exterior"],
      ["02.jpg", "Drone — curved-glass commercial exterior"],
      ["03.jpg", "Office interior — empty commercial floor"],
      ["04.jpg", "Winter aerial — multifamily asset overview"],
      ["05.jpg", "Rooftop amenity — urban multifamily"],
      ["06.jpg", "Courtyard at dusk"],
      ["07.jpg", "Courtyard — alternate edit"],
      ["09-riverbend-lobby.jpg", "Lobby amenity — orange seats, wood ceiling"],
    ]),
  },
  {
    slug: "akasm",
    title: "akasm",
    eyebrow: ["Brand production", "2018 — Present"],
    sub: "An independent creative studio for brand campaigns and content systems.",
    role: "Director · Photographer · Filmmaker",
    years: "2018 — Present",
    body: [
      "Art-direct and produce brand campaigns and content systems for national clients, covering photo, film and social, from first concept through final delivery and approval.",
      "Build shoots end to end: casting, locations, crew and vendor sourcing, schedules and shot lists, then direct on set and own post-production through QC and delivery. Production budgets are owned line by line, with full financial accountability to clients on every engagement.",
      "Lead photographer and director on set for stills, motion and aerial, with a Transport Canada Advanced RPAS certificate behind the aerial work — and an early adopter of AI-assisted production with Higgsfield and Adobe's generative tools where they raise the craft bar.",
      "Recognition: staged food photography honoured at TopPhotoAwards (2021); named among Toronto's Best Photographers by Snappr (2019).",
    ],
    facts: [
      { label: "Clients", value: AKASM_CLIENTS.join(" · ") },
      { label: "Scope", value: "Photo · Film · Social · Aerial" },
    ],
    figures: [
      { src: w("lovecorn", "01-cover.jpg"), caption: "LoveCorn — campaign key visual" },
      { src: w("carhartt", "01-cover.jpg"), caption: "Carhartt WIP — workwear editorial" },
      { src: w("benz", "01-cover.jpg"), caption: "Benz — Mercedes barn study" },
    ],
  },
  {
    slug: "lovecorn",
    title: "LoveCorn",
    eyebrow: ["akasm", "Creative direction"],
    sub: "Rebrand and campaign launch — brand world, packaging and campaign stills for a snack brand that needed character over polish.",
    role: "Creative Director",
    body: [
      "End-to-end LoveCorn campaign: brand strategy, custom CGI corn assets, a bold colour system, packaging, social, retail and launch.",
    ],
    facts: [
      { label: "Client", value: "LoveCorn" },
      { label: "Scope", value: "Brand · Packaging · Campaign · Social · Retail" },
    ],
    figures: seq("lovecorn", [
      ["01-cover.jpg", "Four LoveCorn bags floating over pink, yellow, cyan and burgundy bands"],
      ["02.jpg", "Hand holding a blue LoveCorn bag against cyan with scattered corn"],
      ["03.jpg", "Red LoveCorn pack with orange corn pieces on yellow"],
      ["04.jpg", "Two LoveCorn packs on a yellow skateboard, sneaker entering frame"],
      ["05.jpg", "Four packs floating above an outstretched hand on light blue"],
    ]),
  },
  {
    slug: "carhartt",
    title: "Carhartt WIP",
    eyebrow: ["akasm", "Editorial"],
    sub: "Workwear editorial — industrial booth, orange jacket, camo and fleece.",
    role: "Photographer & Art Director",
    body: [
      "A workwear editorial staged in an industrial paint booth: hard light, grate floors and full-length silhouettes, with close back details on camo, fleece and quilting.",
    ],
    facts: [
      { label: "Brand", value: "Carhartt WIP" },
      { label: "Focus", value: "Workwear · Editorial" },
    ],
    figures: seq("carhartt", [
      ["01-cover.jpg", "Full-length orange Carhartt jacket in an industrial paint booth"],
      ["02.jpg", "Camo overalls back detail with plaid flannel"],
      ["03.jpg", "Two models seated and standing in the paint booth"],
      ["04.jpg", "High-pile fleece jacket back detail"],
      ["05.jpg", "Denim jacket over an orange layer against light panels"],
      ["06.jpg", "Spotlight portrait with quilted vest on a grate floor"],
    ]),
  },
  {
    slug: "benz",
    title: "Benz",
    eyebrow: ["akasm", "Automotive"],
    sub: "Mercedes barn study — a classic Benz framed by riders in the hall.",
    role: "Photographer & Art Director",
    body: [
      "Luxury against grit: a classic Mercedes coupe set inside a working riding hall, with riders and horses in motion around it.",
    ],
    facts: [{ label: "Focus", value: "Automotive · Equestrian" }],
    figures: seq("benz", [
      ["01-cover.jpg", "Benz between riders in a riding hall"],
      ["02.jpg", "Mercedes coupe three-quarter in the arena"],
      ["03.jpg", "Coupe with equestrian rider in the barn"],
      ["04.jpg", "Mercedes coupe alone in the riding hall"],
      ["05.jpg", "Moody coupe study under barn lights"],
      ["06.jpg", "Barn doorway in sun"],
      ["07.jpg", "Equestrian aisle portrait"],
      ["08.jpg", "Horse in motion through the barn"],
      ["09.jpg", "Two riders framing the narrative"],
    ]),
  },
  {
    slug: "landscape",
    title: "Landscape",
    eyebrow: ["akasm", "Landscape"],
    sub: "Arid river valleys, highland lakes, and train-framed mountains.",
    role: "Photographer",
    body: [
      "Open land at scale — arid valleys in colour, highlands in black and white, and mountains framed through the rails.",
    ],
    facts: [{ label: "Focus", value: "Landscape · Black & white" }],
    figures: seq("landscape", [
      ["01-cover.jpg", "River valley with rails and arid mountains"],
      ["02.jpg", "Turquoise river winding through a canyon"],
      ["03.jpg", "Lake and arid mountain range"],
      ["04.jpg", "Overcast valley lake from a high ridge"],
      ["05.jpg", "B&W mountain reflected in a still tarn"],
      ["06.jpg", "B&W highland lake in a valley"],
      ["07.jpg", "B&W rocky mountain face"],
      ["08.jpg", "B&W windswept tree on a rocky outcrop"],
      ["09.jpg", "B&W pony in moorland grass"],
      ["10.jpg", "B&W lake valley with shoreline track"],
      ["11.jpg", "Mountains framed through a train coupler"],
    ]),
  },
  {
    slug: "ai-horses",
    title: "AI Horses",
    eyebrow: ["akasm", "AI-generated"],
    sub: "Generated Western and equestrian riders — dust, motion, and hard blue sky.",
    role: "Art Director",
    body: [
      "A generated series, not photographed: Western riders and horses in motion, art-directed for dust, hard daylight and a deep blue sky.",
    ],
    facts: [{ label: "Medium", value: "AI-generated imagery" }],
    figures: seq("ai-horses", [
      ["01-cover.jpg", "Western rider on a bucking pinto against blue sky (AI-generated)"],
      ["02.jpg", "Western rider on a dark horse (AI-generated)"],
      ["03.jpg", "White horse rearing with rider (AI-generated)"],
      ["04.jpg", "Chestnut horse moving through dust (AI-generated)"],
      ["05.jpg", "Dark horse bucking mid-air (AI-generated)"],
      ["06.jpg", "Horse and rider leaping over a ridge (AI-generated)"],
      ["07.jpg", "Western rider and horse in motion (AI-generated)"],
      ["08.jpg", "Western rider on a rearing horse (AI-generated)"],
      ["09.jpg", "Rider above a bucking horse in dust (AI-generated)"],
      ["10.jpg", "Western rider on a dark horse against blue sky (AI-generated)"],
    ]),
  },
  {
    slug: "photo-art-direction",
    title: "Selected frames",
    eyebrow: ["akasm", "Gallery"],
    sub: "Standalone frames — automotive, workwear and open land.",
    role: "Photographer & Art Director",
    body: [
      "Single frames that live outside the titled sequences: cars in hangars and on quiet streets, workwear in open fields, runners on arid trails.",
    ],
    facts: [{ label: "Focus", value: "Editorial · Automotive · Workwear · Landscape" }],
    figures: seq("gallery", [
      ["mercedes-barn-solo.jpg", "Mercedes coupe alone in a riding hall"],
      ["f40-street.jpg", "Cream Ferrari F40 on a residential street"],
      ["f40-rear.jpg", "Ferrari F40 rear three-quarter"],
      ["f40-detail.jpg", "Ferrari wing and badge detail"],
      ["lancia-integrale.jpg", "Lancia Integrale suspended in a desert study"],
      ["mercedes-race.jpg", "Mercedes C11 race car in an industrial hangar"],
      ["warehouse-race.jpg", "Prototype race cars in a dark warehouse"],
      ["trail-runners.jpg", "Trail runners moving through arid terrain"],
      ["arid-rails-portrait.jpg", "Arid landscape framed by rails"],
      ["terrain-wind-02.jpg", "Figure in workwear against windswept terrain"],
      ["terrain-wind-03.jpg", "Motion-blur walk through a golden field"],
      ["clothing-cargo-field.jpg", "Oversized cargo pants in a grassy field"],
      ["garm-field.jpg", "Figure in a yellow tee and sweatpants in a green field"],
    ]),
  },
  {
    slug: "studio-nostalgia",
    title: "Studio Nostalgia",
    eyebrow: ["Studio Lead", "2020 — 2023"],
    sub: "Graduation and studio portraits — memory-forward people, soft studio light, and process in frame.",
    role: "Studio Lead",
    years: "2020 — 2023",
    body: [
      "Led the studio's creative output across seasonal and graduation programmes — session planning, shoot direction, post-production and delivery.",
      "Trained and mentored seasonal teams of up to 15 at peak on craft, shoot workflows and client service, and built the shoot systems, staffing plans and quality bar the studio ran on through peak season.",
      "Ran studio operations day to day — session flow, equipment readiness and a consistent client experience from booking to delivery.",
    ],
    facts: [
      { label: "Team", value: "Seasonal teams of up to 15" },
      { label: "Focus", value: "Graduation & studio portraits" },
      { label: "Ops", value: "Shoot systems · Staffing · QC" },
    ],
    figures: seq("studio-nostalgia", [
      ["01-cover.jpg", "Behind-the-scenes laptop review during a portrait session"],
      ["02.jpg", "Studio stool portrait with reflector edge"],
      ["03.jpg", "Studio portrait"],
      ["04.jpg", "Graduation portrait with rose and visible reflector"],
      ["05.jpg", "Studio portrait"],
      ["06.jpg", "Portrait detail"],
      ["07.jpg", "Giving direction — softbox and tethered review in frame"],
      ["08.jpg", "Wide studio process — subject, backdrop and set signage"],
      ["09.jpg", "Process frame"],
      ["10.jpg", "Studio portrait"],
    ]),
  },
  {
    slug: "bricks",
    title: "Bricks",
    eyebrow: ["Production & Operations Lead", "2025 — Present"],
    sub: "Listing media, end to end — book, shoot, deliver.",
    role: "Production & Operations Lead",
    years: "2025 — Present",
    body: [
      "Bricks is a Canadian real-estate media and operations platform that books, assigns, shoots and delivers MLS-ready listing media — HDR photos, licensed drone and floor plans — in one pay-to-lock flow: book → pay → auto-assign → shoot → delivered.",
      "The goal: kill quote ping-pong, surprise travel fees and scattered delivery. One browser path, so an agent sees price and clock before they pay, then gets listing-ready media without chasing handoffs. Stills stay MLS-safe — real windows, no invented sky or dusk by default — and everything lands in one listing instead of a loose folder.",
      "Run as sole operator, owning every pricing, margin, resourcing and revenue decision with full P&L accountability — built on two years as CoStar's Regional Visual Media Lead across 14,600+ listings (career experience, not Bricks booking volume).",
    ],
    facts: [
      { label: "Loop", value: "Book → Pay → Assign → Shoot → Deliver" },
      { label: "Turnaround", value: "24–48h target" },
      { label: "Market", value: "Canadian agents & teams" },
    ],
    links: [{ label: "brxs.ca", href: "https://www.brxs.ca" }],
    figures: seq("bricks", [
      ["01-cover.jpg", "Book a shoot in the browser — price and clock before you pay"],
      ["03.jpg", "Delivery lands in one shareable listing, not a loose folder"],
      ["04.jpg", "MLS, web and print exports in one place"],
      ["07-listing-craft.jpg", "MLS-safe stills — real windows, no invented sky by default"],
    ]),
  },
];

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug);
