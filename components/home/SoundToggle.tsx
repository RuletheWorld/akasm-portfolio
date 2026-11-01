"use client";
import { useEffect, useState } from "react";
import { isMuted, onMuted, setMuted } from "@/lib/sound";

export default function SoundToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => { setM(isMuted()); return onMuted(setM); }, []);
  return (
    <button type="button" className="foot-link" onClick={() => setMuted(!muted)} aria-pressed={!muted}>
      <span>{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
