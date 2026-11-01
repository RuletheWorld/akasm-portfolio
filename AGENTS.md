<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project notes
- All copy lives in `content/site.ts`. Never invent clients, numbers, dates or skills.
- No GSAP / Framer Motion / Lenis. Motion = CSS keyframes + hand-rolled springs in `lib/motion.ts`.
- `research/` material is reference only and must never be committed.
