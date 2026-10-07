"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Scene = { caption: string; art: ReactNode };

const SCENE_MS = 3600;

// Une petite animation de ~15 secondes (4 étapes) qui montre comment utiliser une fonction.
// Elle défile toute seule quand elle est visible. On peut la mettre en pause ou choisir une étape.
export function Explainer({
  id,
  title,
  intro,
  scenes,
  href,
  cta,
}: {
  id: string;
  title: string;
  intro: string;
  scenes: Scene[];
  href: string;
  cta: string;
}) {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((es) => setVisible(es[0].isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused) return;
    const t = setTimeout(() => setScene((s) => (s + 1) % scenes.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [scene, visible, paused, scenes.length]);

  return (
    <article ref={ref} id={id} className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-7 scroll-mt-28">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10 items-center">
        <div className="min-w-0 lg:order-2">
          <div className="ex-stage" aria-hidden="true">
            <div key={scene} className="ex-scene">
              {scenes[scene].art}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3" role="group" aria-label={`Étapes : ${title}`}>
            {scenes.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setScene(i)}
                aria-label={`Étape ${i + 1} : ${s.caption}`}
                aria-current={i === scene ? "step" : undefined}
                className="ex-seg"
                data-state={i < scene ? "done" : i === scene ? "now" : "next"}
                data-paused={paused ? "true" : "false"}
                style={{ ["--ms" as string]: `${SCENE_MS}ms` }}
              />
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="ml-1 min-h-[44px] px-4 rounded-full border border-black/15 text-sm font-semibold hover:bg-black/5 transition"
            >
              {paused ? "Reprendre" : "Pause"}
            </button>
          </div>
        </div>

        <div className="min-w-0 lg:order-1">
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">{title}</h2>
          <p className="text-black/65 mb-4 max-w-[48ch]">{intro}</p>
          <ol className="grid gap-2 mb-5">
            {scenes.map((s, i) => (
              <li key={i} className={`flex gap-3 text-sm transition ${i === scene ? "text-black font-semibold" : "text-black/55"}`}>
                <span className="tabular-nums text-[#22C55E] font-bold w-4 shrink-0">{i + 1}</span>
                <span>{s.caption}</span>
              </li>
            ))}
          </ol>
          <Link href={href} className="ff-primary ff-btn text-sm">
            {cta}
          </Link>
        </div>
      </div>
    </article>
  );
}
