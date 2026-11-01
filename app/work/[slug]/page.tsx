import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caseBySlug, cases } from "@/content/site";
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
  return c ? { title: c.title, description: c.sub } : {};
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
          <div><dt>Years</dt><dd>{c.years}</dd></div>
          {c.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
        {c.figures[0] && <Figure f={c.figures[0]} n={1} />}
        {c.body.map((p, k) => (
          <p key={k} className={`cs-p cs-reveal${p.startsWith("TODO") ? " is-todo" : ""}`}>
            {k === 0 && <span className="cs-gutter" aria-hidden>BRIEF</span>}
            {p}
          </p>
        ))}
        {c.figures.slice(1).map((f, k) => <Figure key={k} f={f} n={k + 2} />)}
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

function Figure({ f, n }: { f: { caption: string; ratio: number; src?: string }; n: number }) {
  return (
    <figure className="cs-fig cs-reveal">
      <div className="cs-frame" style={{ aspectRatio: String(f.ratio) }}>
        {f.src ? <img src={f.src} alt={f.caption} /> : <span className="ph-label">FIG {String(n).padStart(2, "0")} · IMAGE PLACEHOLDER</span>}
      </div>
      <figcaption>{f.caption}</figcaption>
    </figure>
  );
}
