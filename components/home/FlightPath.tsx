"use client";
import { useEffect, useRef } from "react";

const CURVE_D = "M43 0V7.3A39 39 0 0 1 21.71 42.05A39 39 0 0 0 0.5 76.75V110";
const R = 30, LEAD = 15, MOBILE_H = LEAD + R * 2;
const mobileCurve = (dx: number) => {
  const t = dx + 0.5;
  return `M${t} 0V${LEAD}A${R} ${R} 0 0 1 ${t - R} ${LEAD + R}H${0.5 + R}A${R} ${R} 0 0 0 .5 ${MOBILE_H}`;
};

/** Scroll-lit flight path: curve from the plane, then a dotted rail with a glowing tip. */
export default function FlightPath({ timelineId }: { timelineId: string }) {
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const dotsPath = useRef<SVGPathElement>(null);
  const lit = useRef<SVGPathElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!, timeline = document.getElementById(timelineId)!;
    let curveLen = 118, curveH = 110, railH = 0, top = 0;
    let dots: { el: Element; y: number; lit: boolean }[] = [];
    let cur = 0, target = 0, raf = 0;

    const measure = () => {
      if (!svg.current || !dotsPath.current || !lit.current) return; // unmounted (e.g. list → map swap)
      const centred = getComputedStyle(el).getPropertyValue("--plan-centre").trim() === "1";
      if (centred) {
        const col = timeline.getBoundingClientRect();
        const railX = el.getBoundingClientRect().left;
        const dx = Math.max(R * 2 + 4, col.left + col.width / 2 - railX);
        const d = mobileCurve(dx);
        dotsPath.current!.setAttribute("d", d); lit.current!.setAttribute("d", d);
        svg.current!.setAttribute("viewBox", `0 0 ${dx + 1} ${MOBILE_H}`);
        svg.current!.style.width = `${dx + 1}px`; svg.current!.style.height = `${MOBILE_H}px`;
        curveH = MOBILE_H;
      } else {
        dotsPath.current!.setAttribute("d", CURVE_D); lit.current!.setAttribute("d", CURVE_D);
        svg.current!.setAttribute("viewBox", "0 0 44 110");
        svg.current!.style.width = "44px"; svg.current!.style.height = "110px";
        curveH = 110;
      }
      el.style.setProperty("--curve-h", `${curveH}px`);
      curveLen = lit.current!.getTotalLength() || 118;
      railH = rail.current!.offsetHeight;
      top = el.getBoundingClientRect().top + scrollY;
      dots = [...timeline.querySelectorAll(".tl-dot")].map((d) => {
        const r = d.getBoundingClientRect();
        return { el: d, y: r.top + r.height / 2 + scrollY, lit: d.classList.contains("is-lit") };
      });
    };
    const progress = () => {
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      return max <= 0 ? 1 : Math.min(1, Math.max(0, scrollY / max));
    };
    const tick = () => {
      raf = 0;
      const d = target - cur;
      cur = Math.abs(d) < 2e-4 ? target : cur + d * 0.12;
      const dist = cur * (curveLen + railH);
      const cp = Math.min(1, Math.max(0, dist / curveLen));
      const rp = railH ? Math.min(1, Math.max(0, (dist - curveLen) / railH)) : 0;
      el.style.setProperty("--curve-p", cp.toFixed(4));
      el.style.setProperty("--rail-p", rp.toFixed(4));
      const tipY = top + curveH * cp + railH * rp;
      for (const o of dots) {
        const on = o.y <= tipY;
        if (on !== o.lit) { o.lit = on; o.el.classList.toggle("is-lit", on); }
      }
      if (cur !== target) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => { target = progress(); if (!raf) raf = requestAnimationFrame(tick); };
    const onResize = () => { measure(); onScroll(); };
    measure(); cur = progress(); onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    document.addEventListener("rm:boarded", onResize);
    timeline.addEventListener("animationend", onResize);
    document.fonts?.ready.then(onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(timeline);
    return () => {
      removeEventListener("scroll", onScroll); removeEventListener("resize", onResize);
      document.removeEventListener("rm:boarded", onResize);
      timeline.removeEventListener("animationend", onResize);
      ro.disconnect(); cancelAnimationFrame(raf);
    };
  }, [timelineId]);

  return (
    <div ref={root} className="folio-path" aria-hidden>
      <svg ref={svg} className="path-curve" viewBox="0 0 44 110">
        <path ref={dotsPath} className="pc-dots" d={CURVE_D} />
        <path ref={lit} className="pc-lit" d={CURVE_D} pathLength={1} />
      </svg>
      <div ref={rail} className="path-rail">
        <div className="path-lit" />
      </div>
    </div>
  );
}
