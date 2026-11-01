/** Web Audio synth. Every sound is generated in code: no audio files. */
import { KEY_MUTED, store } from "./storage";

type Tone = { kind: "tone"; f: number; type?: OscillatorType; d: number; g?: number; glide?: number; at?: number };
type Noise = { kind: "noise"; filter: BiquadFilterType; f: number; q?: number; d: number; g?: number; at?: number };
type Preset = { layers: (Tone | Noise)[]; shimmer?: { delay: number; fb: number; wet: number; lp: number } };

export const PRESETS = {
  // a short plastic "clack": two band-passed noise bursts plus a low thump
  press: { layers: [
    { kind: "noise", filter: "bandpass", f: 1800, q: 1.6, d: 0.022, g: 0.5 },
    { kind: "noise", filter: "bandpass", f: 3600, q: 2.2, d: 0.012, g: 0.22, at: 0.006 },
    { kind: "tone", f: 190, type: "sine", d: 0.05, g: 0.12, glide: 90 },
  ] },
  error: { layers: [
    { kind: "noise", filter: "bandpass", f: 850, d: 0.05, g: 0.3 },
    { kind: "tone", f: 440, type: "triangle", d: 0.12, g: 0.16 },
    { kind: "tone", f: 349.2, type: "triangle", d: 0.16, g: 0.16, at: 0.1 },
  ] },
  sparkle: {
    layers: [1568, 1975.5, 2349.3, 3136].map((f, i) => ({ kind: "tone" as const, f, d: 0.5, g: 0.07, at: i * 0.045 })),
    shimmer: { delay: 0.07, fb: 0.35, wet: 0.22, lp: 6000 },
  },
  tick: { layers: [{ kind: "noise", filter: "highpass", f: 4200, d: 0.012, g: 0.12 }] },
  toggle: { layers: [
    { kind: "noise", filter: "bandpass", f: 1200, d: 0.03, g: 0.3 },
    { kind: "tone", f: 660, d: 0.06, g: 0.05 },
  ] },
  // window shade: a soft zip of filtered noise, then a clack
  shade: { layers: [
    { kind: "noise", filter: "bandpass", f: 900, q: 0.7, d: 0.22, g: 0.12 },
    { kind: "noise", filter: "bandpass", f: 2000, q: 1.4, d: 0.03, g: 0.35, at: 0.2 },
  ] },
} satisfies Record<string, Preset>;

export type SoundName = keyof typeof PRESETS;

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => store.get(KEY_MUTED) === "1";
export const setMuted = (m: boolean) => {
  store.set(KEY_MUTED, m ? "1" : "0");
  listeners.forEach((l) => l(m));
};
export const onMuted = (l: (m: boolean) => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

function noiseBuffer(c: AudioContext) {
  if (noise) return noise;
  noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

export function play(name: SoundName, volume = 1) {
  if (typeof window === "undefined" || isMuted()) return;
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ua && !ua.hasBeenActive) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const c = ctx, now = c.currentTime, p: Preset = PRESETS[name];
    const out = c.createGain();
    out.gain.value = volume;
    out.connect(c.destination);
    if (p.shimmer) {
      const d = c.createDelay(), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
      d.delayTime.value = p.shimmer.delay; fb.gain.value = p.shimmer.fb; lp.frequency.value = p.shimmer.lp; wet.gain.value = p.shimmer.wet;
      out.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(c.destination);
    }
    for (const L of p.layers) {
      const t0 = now + (L.at ?? 0), g = c.createGain(), peak = L.g ?? 0.2;
      g.gain.setValueAtTime(1e-4, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(1e-4, t0 + L.d);
      g.connect(out);
      if (L.kind === "tone") {
        const o = c.createOscillator();
        o.type = L.type ?? "sine";
        o.frequency.setValueAtTime(L.f, t0);
        if (L.glide) o.frequency.exponentialRampToValueAtTime(L.glide, t0 + L.d);
        o.connect(g); o.start(t0); o.stop(t0 + L.d + 0.05);
      } else {
        const src = c.createBufferSource();
        src.buffer = noiseBuffer(c);
        const f = c.createBiquadFilter();
        f.type = L.filter; f.frequency.value = L.f; f.Q.value = L.q ?? 1;
        src.connect(f); f.connect(g);
        src.start(t0, Math.random() * 0.3); src.stop(t0 + L.d + 0.02);
      }
    }
  } catch {}
}

const last: Record<string, number> = {};
export function playThrottled(name: SoundName, ms: number, volume = 1) {
  const t = performance.now();
  if (t - (last[name] ?? -1e9) < ms) return;
  last[name] = t;
  play(name, volume);
}
