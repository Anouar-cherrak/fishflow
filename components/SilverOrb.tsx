"use client";

import { useEffect, useRef, useState } from "react";
import { createOrb, type OrbHandle } from "@/components/landing/orb-gl";
import { Orb } from "@/components/Orb";

// La boule argent d'Apprendre : c'est elle qui « réfléchit » quand on pose une question.
// Si le navigateur ne sait pas dessiner en WebGL, on garde l'ancienne boule en CSS.
export function SilverOrb({
  thinking,
  done,
  compact,
  shift,
}: {
  thinking: boolean;
  done: boolean;
  compact: boolean;
  shift: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<OrbHandle | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orb = createOrb(canvas, () => (slotRef.current ? [slotRef.current] : []), reduce);
    if (!orb) {
      queueMicrotask(() => setFallback(true));
      return;
    }
    orbRef.current = orb;
    const root = document.documentElement;
    orb.setDark(root.classList.contains("dark"));
    const watcher = new MutationObserver(() => orb.setDark(root.classList.contains("dark")));
    watcher.observe(root, { attributes: true, attributeFilter: ["class"] });
    const onDown = () => orb.kick(0.3);
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      watcher.disconnect();
      window.removeEventListener("pointerdown", onDown);
      orb.destroy();
      orbRef.current = null;
    };
  }, []);

  useEffect(() => {
    orbRef.current?.think(thinking);
  }, [thinking]);

  useEffect(() => {
    if (done) orbRef.current?.kick(0.6);
  }, [done]);

  if (fallback) return <Orb state={thinking ? "thinking" : done ? "done" : "idle"} compact={compact} shift={shift} />;

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="ff-silver-canvas" />
      <div
        ref={slotRef}
        aria-hidden="true"
        className="ff-silver-slot"
        data-compact={compact ? "true" : "false"}
      />
    </>
  );
}
