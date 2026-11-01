"use client";
import { useEffect } from "react";

/** Reveals .cs-reveal blocks as they enter view (top < 0.92 × viewport), staggered by batch order. */
export default function CsReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".cs-reveal:not(.is-in)")];
    const io = new IntersectionObserver(
      (ents) => {
        let i = 0;
        for (const e of ents)
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.style.setProperty("--cs-delay", `${Math.min(++i, 4) * 60}ms`);
            el.classList.add("is-in");
            io.unobserve(el);
          }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
