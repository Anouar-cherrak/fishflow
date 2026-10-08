"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type Scene = { caption: string; art: ReactNode };

// Affiche un écran dessiné sur 1000 px de large, réduit pour tenir dans la place disponible.
export function SceneStage({ scene, sceneKey }: { scene: Scene; sceneKey: string | number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const set = () => setScale(el.clientWidth / 1000);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Sur téléphone l'écran est petit : on peut le toucher pour l'agrandir en travers.
  const small = scale < 0.62;
  return (
    <>
      <div
        className="sx-wrap"
        ref={wrapRef}
        aria-hidden={small ? undefined : "true"}
        role={small ? "button" : undefined}
        tabIndex={small ? 0 : undefined}
        aria-label={small ? "Agrandir l'animation" : undefined}
        onClick={small ? () => setZoom(true) : undefined}
        onKeyDown={small ? (e) => (e.key === "Enter" || e.key === " ") && setZoom(true) : undefined}
        style={small ? { cursor: "zoom-in" } : undefined}
      >
        <div key={sceneKey} className="sx" style={{ transform: `scale(${scale})` }}>
          {scene.art}
        </div>
        {small && <span className="sx-zoom" aria-hidden="true">Toucher pour agrandir</span>}
      </div>
      {zoom && <ZoomView scene={scene} sceneKey={sceneKey} onClose={() => setZoom(false)} />}
    </>
  );
}

// Plein écran, tourné d'un quart de tour : l'écran de l'animation est large, le téléphone est haut.
function ZoomView({ scene, sceneKey, onClose }: { scene: Scene; sceneKey: string | number; onClose: () => void }) {
  const [size, setSize] = useState({ w: 0, h: 0, land: false });
  useEffect(() => {
    const set = () => {
      const land = window.innerWidth > window.innerHeight;
      setSize(land ? { w: window.innerWidth, h: window.innerHeight, land } : { w: window.innerHeight, h: window.innerWidth, land });
    };
    set();
    window.addEventListener("resize", set);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  if (typeof document === "undefined" || !size.w) return null;
  const s = Math.min(size.w / 1000, (size.h - 44) / 560);
  return createPortal(
    <div className="sx-zoomback" onClick={onClose} role="dialog" aria-modal="true" aria-label="Animation agrandie">
      <div className="sx-zoomrot" style={size.land ? { width: size.w, height: size.h, left: 0, transform: "none" } : { width: size.w, height: size.h }}>
        <div style={{ width: 1000 * s, height: 560 * s, position: "relative", overflow: "hidden", borderRadius: 14, border: "1px solid var(--ff-line)" }}>
          <div key={sceneKey} className="sx" style={{ transform: `scale(${s})` }}>
            {scene.art}
          </div>
        </div>
        <button type="button" className="sx-zoomclose" onClick={onClose}>Fermer</button>
      </div>
    </div>,
    document.body
  );
}

const SCENE_MS = 4200;

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
          <SceneStage scene={scenes[scene]} sceneKey={scene} />
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
