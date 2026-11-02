import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caseBySlug, cases, type Figure as Fig } from "@/content/site";
import { dims } from "@/content/media";
import CsReveal from "@/components/case/CsReveal";
import Compare from "@/components/case/Compare";
import { ProgressiveBlur } from "@/components/home/Footer";

export const dynamicParams = false;
export function generateStaticParams() {
  return cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = caseBySlug(slug);
  return c ? { title: c.title, description: c.sub, openGraph: c.figures[0] ? { images: [c.figures[0].src] } : undefined } : {};
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = caseBySlug(slug);
  if (!c) notFound();
  const i = cases.findIndex((x) => x.slug === slug);
  const prev = cases[(i - 1 + cases.length) % cases.length];
  const next = cases[(i + 1) % cases.length];
  return (
    <main className="case">
      <CsReveal />
      <div className="case-col">
        <header className="cs-head">
          <p className="cs-eyebrow cs-reveal">{c.eyebrow.map((e, k) => <span key={k}>{e}</span>)}</p>
          <h1 className="cs-title cs-reveal">{c.title}</h1>
          <p className="cs-sub cs-reveal">{c.sub}</p>
        </header>
        <dl className="cs-facts cs-reveal">
          <div><dt>Role</dt><dd>{c.role}</dd></div>
          {c.years && <div><dt>Years</dt><dd>{c.years}</dd></div>}
          {c.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
        {c.figures[0] && <Figure f={c.figures[0]} priority />}
        {c.body.map((p, k) => (
          <p key={k} className="cs-p cs-reveal">
            {k === 0 && <span className="cs-gutter" aria-hidden>BRIEF</span>}
            {p}
          </p>
        ))}
        {c.links && c.links.length > 0 && (
          <p className="cs-p cs-reveal">
            {c.links.map((l, k) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{k > 0 && " · "}{l.label} ↗</a>)}
          </p>
        )}
        {c.figures.slice(1).map((f) => <Figure key={f.src} f={f} />)}
        {c.compare && <Compare {...c.compare} />}
      </div>
      <ProgressiveBlur />
      <nav className="cs-nav" aria-label="Case studies">
        <Link href="/cv" className="cs-nav-btn" aria-label="Back to CV">←</Link>
        <Link href={`/work/${prev.slug}`} className="cs-nav-btn cs-nav-wide"><small>Prev</small>{prev.title}</Link>
        <Link href={`/work/${next.slug}`} className="cs-nav-btn cs-nav-wide"><small>Next</small>{next.title}</Link>
      </nav>
    </main>
  );
}

/**
 * Figures break out of the 512px text column: the cover runs up to 1280px, landscape frames
 * 1100px (the old portfolio's .wide), portrait frames 640px. `sizes` matches those widths so
 * next/image serves 2x files on retina; quality 90 (allowed in next.config images.qualities).
 */
const FIG = {
  hero: { cls: "is-hero", sizes: "(max-width: 1320px) calc(100vw - 40px), 1280px" },
  wide: { cls: "is-wide", sizes: "(max-width: 1140px) calc(100vw - 40px), 1100px" },
  tall: { cls: "is-tall", sizes: "(max-width: 680px) calc(100vw - 40px), 640px" },
};

function Figure({ f, priority }: { f: Fig; priority?: boolean }) {
  const [w, h] = dims(f.src);
  const kind = priority ? FIG.hero : w >= h * 1.15 ? FIG.wide : FIG.tall;
  return (
    <figure className={`cs-fig ${kind.cls} cs-reveal`}>
      <div className="cs-frame" style={{ aspectRatio: `${w} / ${h}` }}>
        <Image src={f.src} alt={f.caption} width={w} height={h} sizes={kind.sizes} quality={90} priority={priority} />
      </div>
      <figcaption>{f.caption}</figcaption>
    </figure>
  );
}
