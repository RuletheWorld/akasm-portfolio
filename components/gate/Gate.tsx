"use client";
/**
 * Gate phase machine: splash → pass → site.
 * html.is-covered (set pre-paint by BOOT_SCRIPT) decides whether we show at all.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Splash from "./Splash";
import SkipLink from "./SkipLink";
import StaticPass from "./StaticPass";
import { canRun3D } from "@/lib/canRun3D";
import { KEY_UNLOCKED, store } from "@/lib/storage";
import { play } from "@/lib/sound";
import type { LcdStatus } from "@/lib/textures";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Phase = "splash" | "pass" | "site";

export default function Gate() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [status, setStatusState] = useState<LcdStatus>("idle");
  const [fading, setFading] = useState(false);
  const [bg, setBg] = useState("#faf5f5");
  const errTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const done = useRef(false);
  const t0 = useRef(0);

  const setStatus = useCallback((s: LcdStatus) => {
    clearTimeout(errTimer.current);
    setStatusState(s);
    if (s === "error") errTimer.current = setTimeout(() => setStatusState((c) => (c === "error" ? "idle" : c)), 1800);
  }, []);

  const finish = useCallback(() => {
    store.set(KEY_UNLOCKED, "1");
    document.documentElement.classList.remove("is-covered");
    document.dispatchEvent(new Event("rm:boarded"));
    setPhase("site");
  }, []);

  const grant = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setStatus("granted");
    play("sparkle");
    setTimeout(() => setFading(true), 250);
    setTimeout(finish, 1000);
  }, [finish, setStatus]);

  const skip = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setFading(true);
    setTimeout(finish, 160);
  }, [finish]);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("is-covered")) { setPhase("site"); return; }
    t0.current = performance.now();
    setBg(getComputedStyle(root).getPropertyValue("--bg").trim() || "#faf5f5");
    setMode(canRun3D() ? "3d" : "2d");
    const main = document.querySelector("main");
    main?.setAttribute("inert", "");
    return () => main?.removeAttribute("inert");
  }, []);

  useEffect(() => {
    if (phase === "site") document.querySelector("main")?.removeAttribute("inert");
  }, [phase]);

  const leaveSplash = useCallback(() => {
    if (splashLeaving) return;
    const wait = Math.max(0, 620 - (performance.now() - t0.current));
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]).then(() =>
      setTimeout(() => {
        setSplashLeaving(true);
        setTimeout(() => setPhase((p) => (p === "splash" ? "pass" : p)), 280);
      }, wait),
    );
  }, [splashLeaving]);

  // hard timeout so a stuck WebGL init never traps a visitor
  useEffect(() => {
    if (!mode) return;
    const t = setTimeout(() => { if (mode === "3d") leaveSplash(); }, 12000);
    return () => clearTimeout(t);
  }, [mode, leaveSplash]);

  // keyboard: Enter boards from anywhere on the gate, Escape skips
  useEffect(() => {
    if (phase !== "pass") return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      if (e.key === "Enter" && (document.activeElement === document.body || (document.activeElement as HTMLElement)?.dataset.pass)) grant();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [phase, grant, skip]);

  if (phase === "site") return null;

  const hint = status === "granted" ? "Cleared for boarding" : status === "error" ? "Swipe all the way through" : "Swipe your pass to board";

  return (
    <div className="gate" data-phase={phase} data-mode={mode ?? undefined} data-status={status} role="dialog" aria-label="Boarding gate">
      {mode === "3d" && (
        <div className="gate-stage">
          <Scene status={status} setStatus={setStatus} onSwiped={grant} onReady={leaveSplash} bg={bg} />
          <button type="button" className="pass-focus" data-pass="1" onClick={grant} aria-label="Boarding pass. Press Enter to board.">
            <span className="sr-only">Board</span>
          </button>
        </div>
      )}
      {mode === "2d" && <StaticPass status={status} onReady={leaveSplash} onBoard={() => { setStatus("near"); play("press"); setTimeout(grant, 650); }} />}
      {phase === "pass" && (
        <>
          <p className={`pass-hint${status === "granted" ? " is-granted" : ""}`} aria-live="polite">{hint}</p>
          <p className="pass-help">{mode === "2d" ? "Press Board · or press Enter" : "Drag the pass into the reader and swipe it through · or press Enter"}</p>
        </>
      )}
      <SkipLink onSkip={skip} />
      {phase === "splash" && <Splash leaving={splashLeaving} />}
      <div className={`pass-fade${fading ? " on" : ""}`} />
    </div>
  );
}
