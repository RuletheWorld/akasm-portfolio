"use client";
/**
 * CV as a drive: a tall scroll section with a sticky full-bleed nav map. Scroll drives the
 * truck from Arrivals (YYZ) through every stop in canon order; the card shows the stop.
 * 3D whenever WebGL exists (reduced motion only softens it); `?static` / no WebGL → the route list.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { site, type Entry } from "@/content/site";
import { canRun3D, softMotion } from "@/lib/canRun3D";
import GLBoundary from "@/components/GLBoundary";
import Timeline from "../Timeline";
import type { Drive, StopLabel } from "./MapScene";

const MapScene = dynamic(() => import("./MapScene"), { ssr: false });

const HOLD = 0.35;
const fromYear = (e: Entry) => e.years.split("—")[0].trim().slice(-4);

function Card({ i, entries, onList }: { i: number; entries: Entry[]; onList: () => void }) {
  if (i === 0) {
    const a = site.arrivals;
    return (
      <div className="jm-card" key="arr">
        <p className="jm-eyebrow"><span className="jm-plane" aria-hidden>✈</span>{a.label} · LHR → YYZ</p>
        <h3 className="jm-company">{a.line}</h3>
        <p className="jm-role">{a.sub}</p>
        <p className="jm-hint" aria-hidden><span className="jm-wheel" />Scroll</p>
      </div>
    );
  }
  const e = entries[i - 1];
  const cases = e.cases ?? [];
  return (
    <div className="jm-card" key={e.id}>
      <p className="jm-eyebrow">Stop {i} of {entries.length} · {e.years}</p>
      <h3 className="jm-company">{e.company}{e.current && <span className="tl-current">Current</span>}</h3>
      <p className="jm-role">{e.role}</p>
      <ul className="jm-proof">{e.proof.map((p) => <li key={p}>{p}</li>)}</ul>
      {cases.length > 0 && (
        <div className="jm-cases">
          {cases.slice(0, 3).map((c) => <Link key={c.slug} href={`/work/${c.slug}`} className="jm-case">{c.title}<span aria-hidden>→</span></Link>)}
          {cases.length > 3 && <button type="button" className="jm-case jm-more" onClick={onList}>+{cases.length - 3} more</button>}
        </div>
      )}
    </div>
  );
}

export default function Journey() {
  const entries = useMemo(() => site.timeline.filter((e) => e.show !== false), []);
  const N = entries.length + 1;
  const labels: StopLabel[] = useMemo(
    () => [{ id: "arrivals", label: "YYZ · Arrivals" }, ...entries.map((e) => ({ id: e.id, label: `${e.company} · ${fromYear(e)}` }))],
    [entries],
  );
  const [mode, setMode] = useState<"ssr" | "map" | "list">("ssr");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const drive = useRef<Drive>({ p: 0, target: 0, s: 0, x: 0, z: 0, soft: false });
  const sec = useRef<HTMLElement>(null);

  useEffect(() => {
    drive.current.soft = softMotion();
    setMode(canRun3D() ? "map" : "list");
  }, []);

  useEffect(() => {
    if (mode !== "map") return;
    const el = sec.current!;
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) setMounted(true); }, { rootMargin: "100% 0px" });
    const vis = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting) document.documentElement.dataset.map = "on";
      else delete document.documentElement.dataset.map;
    });
    near.observe(el); vis.observe(el);
    const onScroll = () => {
      const r = el.getBoundingClientRect(), span = r.height - innerHeight;
      drive.current.p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { delete document.documentElement.dataset.map; near.disconnect(); vis.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, [mode]);

  const goTo = useCallback((i: number) => {
    const el = sec.current!, span = el.offsetHeight - innerHeight;
    const p = Math.min(1, (i + 0.12) / (N - 1 + HOLD));
    const top = el.getBoundingClientRect().top + scrollY + p * span;
    scrollTo({ top: i === N - 1 ? el.getBoundingClientRect().top + scrollY + span : top, behavior: softMotion() ? "auto" : "smooth" });
  }, [N]);

  const toList = useCallback(() => setMode("list"), []);

  if (mode !== "map") {
    return (
      <div className="journey-list" id="route">
        {mode === "list" && canRunToggle() && (
          <button type="button" className="jm-toggle jm-toggle-inline" onClick={() => setMode("map")}>Map view</button>
        )}
        <Timeline />
      </div>
    );
  }

  const next = active < N - 1 ? labels[active + 1] : null;
  return (
    <section ref={sec} className="journey" id="route" aria-label="Experience — route map" style={{ ["--stops" as string]: N }}>
      <div className="jm-stage">
        {mounted && (
          <GLBoundary fallback={null} onFail={toList}>
            <MapScene drive={drive.current} labels={labels} onStop={setActive} active={active} visible={visible} />
          </GLBoundary>
        )}
        <div className="jm-ui">
          <div className="jm-banner" aria-live="polite">
            <span className="jm-arrow" aria-hidden>{next ? "↑" : "●"}</span>
            <span>
              <small>{next ? "Next stop" : "You've arrived"}</small>
              {next ? next.label : `${labels[N - 1].label.split(" · ")[0]} · Now`}
            </span>
          </div>
          <button type="button" className="jm-toggle" onClick={toList}>List view</button>
          <div className="jm-card-slot"><Card i={active} entries={entries} onList={toList} /></div>
          <ol className="jm-rail" aria-label="Stops">
            {labels.map((l, i) => (
              <li key={l.id}>
                <button type="button" className={i === active ? "is-active" : i < active ? "is-visited" : ""} onClick={() => goTo(i)} aria-label={l.label} aria-current={i === active ? "step" : undefined}>
                  <span className="jm-rail-dot" /><span className="jm-rail-label">{i === 0 ? "YYZ" : l.label.split(" · ")[1]}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function canRunToggle() {
  return typeof window !== "undefined" && canRun3D();
}
