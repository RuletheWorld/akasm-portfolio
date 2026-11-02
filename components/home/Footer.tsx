"use client";
import { site } from "@/content/site";
import { KEY_UNLOCKED, store } from "@/lib/storage";
import SoundToggle from "./SoundToggle";

export function ProgressiveBlur() {
  return (
    <div className="pblur" aria-hidden>
      {[0.6, 1.5, 3, 6, 12].map((b, i) => (
        <div
          key={i}
          style={{
            backdropFilter: `blur(${b}px)`,
            WebkitBackdropFilter: `blur(${b}px)`,
            maskImage: `linear-gradient(to bottom, transparent ${i * 20}%, #000 ${i * 20 + 20}%, #000 ${i * 20 + 40}%, transparent ${i * 20 + 60}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${i * 20}%, #000 ${i * 20 + 20}%, #000 ${i * 20 + 40}%, transparent ${i * 20 + 60}%)`,
          }}
        />
      ))}
    </div>
  );
}

export default function Footer() {
  const returnToGate = () => {
    store.del(KEY_UNLOCKED);
    window.scrollTo(0, 0);
    window.location.href = "/";
  };
  const { linkedin, email } = site.contact;
  return (
    <>
      <ProgressiveBlur />
      <nav className="foot" aria-label="Footer">
        <button type="button" className="foot-link" onClick={returnToGate}><span>Return to Gate</span></button>
        <a className="foot-link" href={site.resumePdf} download><span>Résumé</span></a>
        <a className="foot-link" href={linkedin} target="_blank" rel="noreferrer"><span>LinkedIn</span></a>
        <a className="foot-link" href={`mailto:${email}`}><span>Email</span></a>
        <span className="wide-only"><SoundToggle /></span>
      </nav>
    </>
  );
}
