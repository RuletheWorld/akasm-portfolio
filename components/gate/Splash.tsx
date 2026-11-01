import { site } from "@/content/site";

/** Monogram splash with a looping blue sheen. Shown while the gate loads. */
export default function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div className={`splash${leaving ? " is-leaving" : ""}`} aria-hidden>
      <svg className="splash-mark" viewBox="0 0 120 120" width="88" height="88">
        <defs>
          <linearGradient id="rm-sheen" gradientUnits="userSpaceOnUse" x1="-120" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="var(--ink)" />
            <stop offset=".45" stopColor="var(--ink)" />
            <stop offset=".5" stopColor="var(--path)" />
            <stop offset=".55" stopColor="var(--ink)" />
            <stop offset="1" stopColor="var(--ink)" />
            <animate attributeName="x1" values="-120;100" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="x2" values="0;220" dur="2.4s" repeatCount="indefinite" />
          </linearGradient>
          <mask id="rm-mask">
            <rect x="6" y="6" width="108" height="108" rx="26" fill="none" stroke="#fff" strokeWidth="5" />
            <text x="60" y="76" textAnchor="middle" fontSize="46" fontWeight="500" letterSpacing="-1" fill="#fff" style={{ fontFamily: "var(--font-geist-sans)" }}>
              {site.monogram}
            </text>
          </mask>
        </defs>
        <rect width="120" height="120" fill="url(#rm-sheen)" mask="url(#rm-mask)" />
      </svg>
    </div>
  );
}
