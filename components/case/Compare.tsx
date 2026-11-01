"use client";
import { useRef, useState } from "react";

/** Before/after slider: drag the grip (or use arrow keys). */
export default function Compare({ before, after, caption }: { before?: string; after?: string; caption: string }) {
  const [split, setSplit] = useState(50);
  const [drag, setDrag] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const at = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };
  return (
    <figure className="cs-fig cs-reveal">
      <div
        ref={box}
        className={`compare${drag ? " is-drag" : ""}`}
        style={{ ["--split" as string]: `${split}%` }}
        onPointerDown={(e) => { setDrag(true); (e.target as HTMLElement).setPointerCapture(e.pointerId); at(e.clientX); }}
        onPointerMove={(e) => drag && at(e.clientX)}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
      >
        <div className="cmp-layer cmp-after">{after ? <img src={after} alt="After" /> : <span className="ph-label">AFTER · TODO</span>}</div>
        <div className="cmp-layer cmp-before">{before ? <img src={before} alt="Before" /> : <span className="ph-label">BEFORE · TODO</span>}</div>
        <button
          type="button"
          className="cmp-grip"
          role="slider"
          aria-label="Before / after split"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - 5));
            if (e.key === "ArrowRight") setSplit((s) => Math.min(100, s + 5));
          }}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
