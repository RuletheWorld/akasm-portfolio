import { site } from "@/content/site";
import StickyInfo from "./StickyInfo";
import HeroWindow from "./HeroWindow";
import Timeline from "./Timeline";
import Memories from "./Memories";
import Footer from "./Footer";

function ContactPill({ label, href }: { label: string; href: string }) {
  if (!href) return null;
  return <a className="pill" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{label}</a>;
}

export default function Home() {
  const c = site.contact;
  return (
    <main className="folio" id="cv">
      <StickyInfo />
      <div className="folio-col">
        <header className="folio-hero">
          <HeroWindow />
          <div className="folio-intro reveal">
            <h1 className="folio-title">{site.title}</h1>
            <p className="folio-lede">{site.intro}</p>
          </div>
        </header>

        <Timeline />

        <section className="folio-about reveal" style={{ ["--reveal-delay" as string]: "200ms" }} aria-label="About">
          <h2 className="mono-label">About</h2>
          {site.about.map((p, k) => <p key={k} className="folio-p">{p}</p>)}
          <ul className="tl-creds about-facts">
            {site.aboutFacts.map((f) => <li key={f.label}><span className="mono-label">{f.label}</span>{f.value}</li>)}
          </ul>
          <Memories />
        </section>

        <section className="folio-contact reveal" style={{ ["--reveal-delay" as string]: "240ms" }} aria-label="Contact">
          <h2 className="mono-label">Contact</h2>
          <div className="pills">
            <a className="pill pill-primary" href={site.resumePdf} download>Download résumé (PDF)</a>
            <ContactPill label="Email" href={c.email ? `mailto:${c.email}` : ""} />
            <ContactPill label="LinkedIn" href={c.linkedin} />
            <ContactPill label="Behance" href={c.behance} />
            <ContactPill label="Unsplash" href={c.unsplash} />
          </div>
        </section>

        <section className="folio-outro reveal" style={{ ["--reveal-delay" as string]: "280ms" }}>
          <p className="outro-line">{site.outro.line}</p>
          <p className="outro-sub">{site.outro.sub}</p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
