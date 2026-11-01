"use client";
import { useState } from "react";
import { site } from "@/content/site";

const ROT = [-8, -3, 2, 6, -4];

/** Five-photo fan. Neighbours shift ±9·0.5^(d−1)px; the active card lifts and scales. */
export default function Memories() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="memories" onPointerLeave={() => setActive(null)}>
      {site.memories.map((m, i) => {
        const d = active === null ? 0 : i - active;
        const shift = active === null || d === 0 ? 0 : Math.sign(d) * 9 * Math.pow(0.5, Math.abs(d) - 1);
        const on = active === i;
        return (
          <button
            key={i}
            type="button"
            className={`mem${on ? " is-on" : ""}`}
            style={{ ["--rot" as string]: `${ROT[i % ROT.length] * (on ? 0.3 : 1)}deg`, ["--sx" as string]: `${shift}px`, zIndex: on ? 10 : i }}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={m.caption}
          >
            {m.src ? <img src={m.src} alt="" /> : <span className="mem-ph">{String(i + 1).padStart(2, "0")}</span>}
            {on && <span className="mem-tip">{m.caption}</span>}
          </button>
        );
      })}
    </div>
  );
}
