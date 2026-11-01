# Raphael Merchant — portfolio & CV

A boarding-pass gate leads into a flight-plan CV. Built with Next.js (App Router), TypeScript and Tailwind v4. The 3D gate uses React Three Fiber, Rapier and postprocessing. Motion is plain CSS plus small hand-written springs (`lib/motion.ts`); there's no GSAP or Framer Motion.

## Routes

| Route | What it is |
| --- | --- |
| `/` | The gate. Drag the pass into the reader and swipe it all the way through, or press Enter. **Skip to CV** is always visible. |
| `/?skip` | Skips the gate and opens the CV straight away. Use this in links you send to recruiters. |
| `/cv` | The CV, with no gate. |
| `/work/[slug]` | Case pages: `photo-art-direction`, `costar`, `akasm`, `studio-nostalgia`, `bricks`. |
| `/?force3d`, `/?static` | Debug flags: force the WebGL gate, or force the 2D fallback. |

Once someone gets through the gate, it's remembered (localStorage `rm-pass-unlocked`). **Return to Gate** in the footer clears that. The 2D fallback is used when WebGL isn't available, when `prefers-reduced-motion` is set, or on low-power devices (`lib/canRun3D.ts`).

## Editing content

**Everything you read on the site lives in [`content/site.ts`](content/site.ts).** Search that file for `TODO` to find what still needs your input:

- Contact links (`email`, `linkedin`, `behance`, `instagram`). An empty string shows a "TODO" pill.
- Logos for the timeline chips (right now they're text initials), and the monogram.
- The intro line, the sign-off line, the boarding-pass airline line and the destination.
- Five personal photos and their captions for the memories fan (put the files in `/public`).
- Case-page body copy, images and the before/after pair.
- The final domain (`url`), which feeds the sitemap and metadata.

House rules for content: never add a client, number, date or skill that isn't true. Keep **Studio Nostalgia** and **akasm** as separate entries, and don't give Studio Nostalgia a project count. Carhartt is the only client named publicly.

### Résumé PDF

`public/Raphael-Merchant-Resume.pdf` is a **placeholder**. Replace it with your final ATS-friendly PDF and keep the same file name. Remove your personal phone number first, because this file is public.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # type-check (tsc --noEmit)
```

You need Node 20 or newer.

## Deploying on Vercel

1. Import the GitHub repo in Vercel. `vercel.json` already sets `"framework": "nextjs"`, so the defaults work: build `next build`, output `.next`.
2. You don't need any environment variables.
3. Every push to a branch gets a preview URL. Merging to `main` deploys to production.
4. Add your domain under *Project → Settings → Domains*, then update `url` in `content/site.ts`.

## Project layout

```
app/                 routes (/, /cv, /work/[slug]), globals.css, sitemap, robots
components/gate/     3D gate (Scene), 2D fallback (StaticPass), splash, skip link
components/home/     hero window + shade theme switch, flight-path timeline, memories, footer
components/case/     case-page reveal + before/after compare slider
content/site.ts      ALL copy and links
lib/                 springs, sound, storage keys, canvas textures for pass + LCD
legacy/              the previous static homepage, kept for reference
public/fonts/        DSEG14 (OFL, see DSEG-LICENSE.txt) for the reader LCD
```

## Credits

The interaction mechanics are inspired by boarding-pass portfolio sites. All the copy, art, sound and code in this repo are original. Fonts: Geist, DM Mono, DSEG14 (SIL OFL).
