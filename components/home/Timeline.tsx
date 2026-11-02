import Image from "next/image";
import Link from "next/link";
import { caseBySlug, site, type Entry } from "@/content/site";
import FlightPath from "./FlightPath";

const TIMELINE_ID = "flight-plan";

function Chips({ chips }: { chips: string[] }) {
  return (
    <div className="tl-chips">
      {chips.map((c, i) => (
        <span key={c} className="chip" style={{ ["--n" as string]: i }} title={c}>{c}</span>
      ))}
    </div>
  );
}

function CaseRow({ slug, title, sub }: { slug: string; title: string; sub: string }) {
  const thumbs = (caseBySlug(slug)?.figures ?? []).slice(0, 3);
  return (
    <Link href={`/work/${slug}`} className="case-row">
      <span className="tl-dot tl-dot-case" />
      <span className="fan" aria-hidden>
        {["f1", "f2", "f3"].map((k, n) => (
          <span key={k} className={`fan-card ${k}`}>
            {thumbs[n] && <Image src={thumbs[n].src} alt="" width={52} height={72} sizes="52px" />}
          </span>
        ))}
      </span>
      <span className="case-copy">
        <span className="case-title">{title}</span>
        <span className="case-sub">{sub}</span>
      </span>
    </Link>
  );
}

function EntryView({ e, i }: { e: Entry; i: number }) {
  const from = e.years.split("—")[0].trim().slice(-4);
  return (
    <article className="tl-entry" style={{ ["--i" as string]: i }}>
      <Chips chips={e.chips} />
      <div className="tl-head">
        <span className={`tl-dot ${e.current ? "tl-dot-now" : "tl-dot-past"}`} />
        <span className="tl-year" aria-hidden><small>{e.gutter}</small>{from}</span>
        <h3 className="tl-company">{e.company}{e.current && <span className="tl-current">Current</span>}</h3>
      </div>
      <p className="tl-role">{e.role} <span className="tl-years">· {e.years}</span></p>
      <p className="tl-desc">{e.description}</p>
      {e.cases && e.cases.length > 0 && (
        <div className="tl-cases">{e.cases.map((c) => <CaseRow key={c.slug} {...c} />)}</div>
      )}
    </article>
  );
}

export default function Timeline() {
  const entries = site.timeline.filter((e) => e.show !== false);
  return (
    <section className="folio-timeline-wrap" aria-label="Experience">
      <div className="plan-mark reveal" style={{ ["--reveal-delay" as string]: "80ms" }} aria-hidden>
        <small>FLIGHT<br />PLAN</small>
        <svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
      </div>
      <div className="folio-timeline" id={TIMELINE_ID}>
        <FlightPath timelineId={TIMELINE_ID} />
        <article className="tl-entry" style={{ ["--i" as string]: 0 }}>
          <div className="tl-head">
            <span className="tl-dot tl-dot-past" />
            <span className="tl-year" aria-hidden><small>ARRIVALS</small>YYZ</span>
            <h3 className="tl-company">{site.arrivals.label}</h3>
          </div>
          <p className="tl-desc">{site.arrivals.line}</p>
        </article>
        {entries.map((e, i) => <EntryView key={e.id} e={e} i={i + 1} />)}
      </div>
    </section>
  );
}
