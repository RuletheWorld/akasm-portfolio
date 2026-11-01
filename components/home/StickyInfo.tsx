"use client";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { easeOutExpo } from "@/lib/motion";

const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;

export default function StickyInfo() {
  const [k, setK] = useState(0);
  const [gmt, setGmt] = useState("GMT−5");
  useEffect(() => {
    try {
      const p = new Intl.DateTimeFormat("en", { timeZone: site.timeZone, timeZoneName: "shortOffset" }).formatToParts(new Date());
      setGmt((p.find((x) => x.type === "timeZoneName")?.value ?? "GMT").toUpperCase().replace("-", "−"));
    } catch {}
    let raf = 0;
    const start = () => {
      const t0 = performance.now();
      const step = (t: number) => {
        const x = Math.min(1, (t - t0) / 900);
        setK(easeOutExpo(x));
        if (x < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (document.documentElement.classList.contains("is-covered")) document.addEventListener("rm:boarded", start, { once: true });
    else start();
    return () => { cancelAnimationFrame(raf); document.removeEventListener("rm:boarded", start); };
  }, []);
  return (
    <aside className="sticky-info reveal" style={{ ["--reveal-delay" as string]: "0ms" }} aria-label="Location">
      <p className="si-name">{site.name}</p>
      <p>{site.location}</p>
      <p className="si-coords">
        {fmt(site.coords.lat * k, "N", "S")}, {fmt(site.coords.lon * k, "E", "W")}
      </p>
      <p>{gmt}</p>
    </aside>
  );
}
