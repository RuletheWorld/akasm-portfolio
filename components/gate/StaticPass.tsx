"use client";
/**
 * 2D fallback (?static or no WebGL): the pass sits on a CSS reader and must be
 * swiped through it. Same rule as the 3D gate: a sideways drag covering enough
 * distance within the swipe window grants; nothing else does.
 */
import { useEffect, useRef, useState } from "react";
import { drawPassFront, passFonts } from "@/lib/passArt";
import { LCD, LED, type LcdStatus } from "@/lib/textures";
import { play } from "@/lib/sound";
import { OM } from "./constants";

const SPAN = 0.62; // fraction of the card width the swipe must travel (≈ traverseSpan / card width × 0.76)

export default function StaticPass({ status, setStatus, onSwiped, onReady }: {
  status: LcdStatus; setStatus: (s: LcdStatus) => void; onSwiped: () => void; onReady: () => void;
}) {
  const [src, setSrc] = useState("");
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; pts: { t: number; x: number }[]; done: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    passFonts().then((f) => {
      if (!alive) return;
      setSrc(drawPassFront(document.createElement("canvas"), f).toDataURL("image/png"));
      onReady();
    });
    return () => { alive = false; };
  }, [onReady]);

  const down = (e: React.PointerEvent) => {
    if (status === "granted") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x0: e.clientX, pts: [{ t: performance.now(), x: e.clientX }], done: false };
    setDragging(true);
    setStatus("near");
    play("press");
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.done) return;
    const w = card.current?.offsetWidth ?? 400;
    const x = e.clientX - d.x0;
    setDx(Math.max(-w * 0.9, Math.min(w * 0.9, x)));
    const now = performance.now();
    d.pts.push({ t: now, x: e.clientX });
    while (d.pts.length > 1 && now - d.pts[0].t > OM.swipeWindowMs) d.pts.shift();
    let lo = Infinity, hi = -Infinity;
    for (const p of d.pts) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); }
    if (hi - lo > w * SPAN) { d.done = true; onSwiped(); }
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setDx(0);
    if (d && !d.done) { play("error"); setStatus("error"); }
  };

  const [txt, col] = LCD[status];
  return (
    <div className={`static-pass${status === "granted" ? " is-boarding" : ""}`}>
      <div
        ref={card}
        className={`static-card${dragging ? " is-dragging" : ""}`}
        style={{ transform: dragging || dx ? `translate(${dx}px, 70px) rotate(${dx * 0.004}deg)` : undefined }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        role="img" aria-label="Boarding pass. Drag it sideways through the reader to board."
      >
        {src ? <img src={src} alt="" width={492} height={240} draggable={false} /> : <span className="static-card-blank" />}
      </div>
      <div className="static-reader" aria-hidden>
        <div className="static-slot" />
        <div className="static-face">
          <div className="static-lcd" style={{ color: col, textShadow: `0 0 10px ${col}` }}>
            <span className="ghost">~~~~~~~</span>
            <span className="live">{txt}</span>
          </div>
          <span className="static-led" style={{ background: LED[status], boxShadow: status === "idle" ? "none" : `0 0 14px 3px ${LED[status]}` }} />
        </div>
      </div>
    </div>
  );
}
