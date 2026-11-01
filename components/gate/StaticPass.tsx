"use client";
/** Non-WebGL / reduced-motion fallback: a 2D pass over a CSS reader. */
import { useEffect, useState } from "react";
import { drawPassFront, passFonts } from "@/lib/passArt";
import { LCD, LED, type LcdStatus } from "@/lib/textures";

export default function StaticPass({ status, onBoard, onReady }: { status: LcdStatus; onBoard: () => void; onReady: () => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    passFonts().then((f) => {
      if (!alive) return;
      setSrc(drawPassFront(document.createElement("canvas"), f).toDataURL("image/png"));
      onReady();
    });
    return () => { alive = false; };
  }, [onReady]);
  const [txt, col] = LCD[status];
  const boarding = status === "near" || status === "granted";
  return (
    <div className={`static-pass${boarding ? " is-boarding" : ""}`}>
      <button type="button" className="static-card" onClick={onBoard} aria-label="Boarding pass — press to board">
        {src ? <img src={src} alt="" width={492} height={240} /> : <span className="static-card-blank" />}
      </button>
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
      <button type="button" className="board-btn" onClick={onBoard}>Board <span aria-hidden>→</span></button>
    </div>
  );
}
