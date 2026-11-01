"use client";
/** Cabin window with a draggable shade. Closing the shade switches to the dark cabin theme. */
import { useCallback, useEffect, useRef } from "react";
import { clamp, easeInOutCubic, spring } from "@/lib/motion";
import { KEY_DARK, store } from "@/lib/storage";
import { play } from "@/lib/sound";

const OPEN = 0.1, CLOSED = 0.9;

export default function HeroWindow() {
  const pane = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const s = useRef({ x: OPEN, v: 0, target: OPEN, dragging: false, startY: 0, startX: 0, lastY: 0, lastT: 0, raf: 0, moved: false, tween: 0 });

  const paint = useCallback(() => {
    root.current?.style.setProperty("--shade", s.current.x.toFixed(4));
  }, []);

  const applyTheme = useCallback((dark: boolean) => {
    const html = document.documentElement;
    if ((html.dataset.theme === "dark") === dark) return;
    html.classList.add("is-recolouring");
    if (dark) html.dataset.theme = "dark"; else delete html.dataset.theme;
    store.set(KEY_DARK, dark ? "1" : "0");
    setTimeout(() => html.classList.remove("is-recolouring"), 520);
  }, []);

  const settle = useCallback((target: number) => {
    const st = s.current;
    st.target = target;
    cancelAnimationFrame(st.raf);
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      spring(st, st.target, 190, 26, dt);
      paint();
      if (Math.abs(st.x - st.target) > 1e-4 || Math.abs(st.v) > 1e-3) st.raf = requestAnimationFrame(step);
      else { st.x = st.target; st.v = 0; paint(); arrived(); }
    };
    st.raf = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint]);

  const arrived = () => {
    const dark = s.current.x > 0.5;
    if (dark) play("shade", 0.2);
    applyTheme(dark);
  };

  const tweenTo = (target: number) => {
    const st = s.current, from = st.x, dur = Math.max(260, 900 * Math.abs(target - from)), t0 = performance.now();
    cancelAnimationFrame(st.raf);
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      st.x = from + (target - from) * easeInOutCubic(k);
      paint();
      if (k < 1) st.raf = requestAnimationFrame(step); else { st.v = 0; arrived(); }
    };
    play("toggle", 0.5);
    st.raf = requestAnimationFrame(step);
  };

  useEffect(() => {
    s.current.x = s.current.target = document.documentElement.dataset.theme === "dark" ? CLOSED : OPEN;
    paint();
    return () => cancelAnimationFrame(s.current.raf);
  }, [paint]);

  const down = (e: React.PointerEvent) => {
    const st = s.current;
    cancelAnimationFrame(st.raf);
    st.dragging = true; st.moved = false;
    st.startY = e.clientY; st.startX = st.x; st.lastY = e.clientY; st.lastT = performance.now(); st.v = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "grabbing";
  };
  const move = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.dragging || !pane.current) return;
    const h = pane.current.offsetHeight;
    if (Math.abs(e.clientY - st.startY) > 3) st.moved = true;
    st.x = clamp(st.startX + (e.clientY - st.startY) / h, 0.04, 0.96);
    const now = performance.now(), dt = Math.max(1, now - st.lastT) / 1000;
    st.v = st.v * 0.6 + (((e.clientY - st.lastY) / h) / dt) * 0.4;
    st.lastY = e.clientY; st.lastT = now;
    paint();
  };
  const up = () => {
    const st = s.current;
    if (!st.dragging) return;
    st.dragging = false;
    document.body.style.cursor = "";
    if (!st.moved) { tweenTo(st.target > 0.5 ? OPEN : CLOSED); st.target = st.target > 0.5 ? OPEN : CLOSED; return; }
    const target = st.v > 1.6 ? CLOSED : st.v < -1.6 ? OPEN : st.x > 0.5 ? CLOSED : OPEN;
    play("toggle", 0.4);
    settle(target);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const t = s.current.target > 0.5 ? OPEN : CLOSED; s.current.target = t; tweenTo(t); }
  };

  return (
    <div ref={root} className="hero-window reveal" style={{ ["--reveal-delay" as string]: "0ms" }}>
      <div className="hw-bezel">
        <div ref={pane} className="hw-pane">
          <div className="hw-sky"><span className="cloud c1" /><span className="cloud c2" /><span className="cloud c3" /><span className="hw-sun" /></div>
          <div className="hw-shutter"><span className="hw-lip" /></div>
          <div className="hw-glare" />
        </div>
      </div>
      <button
        type="button"
        className="hw-grab"
        aria-label="Window shade: drag or press to switch light and dark theme"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      />
    </div>
  );
}
