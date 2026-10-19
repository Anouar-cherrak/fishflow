"use client";

import { useEffect, useRef } from "react";

// Une texture de décor (rayons, reflets) dessinée dans un <canvas> une fois la page affichée.
// Pourquoi un canvas : une grande image de fond serait prise pour « l'élément principal » de la page
// et retarderait son affichage mesuré (LCP). Le canvas est dessiné une seule fois ; ensuite il ne fait
// que glisser (transform), ce qui ne coûte presque rien.
// « tileW » / « tileH » : taille d'un motif répété (sans tileH : toute la hauteur de la zone). Sans tileW : étirée.
export function TextureCanvas({ src, className, tileW, tileH }: { src: string; className: string; tileW?: number; tileH?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let img: HTMLImageElement | null = null;
    let cancelled = false;

    const draw = () => {
      if (!img || cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!tileW) {
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        const tw = tileW, th = tileH ?? h;
        for (let y = 0; y < h; y += th) for (let x = 0; x < w; x += tw) ctx.drawImage(img, x, y, tw, th);
      }
      canvas.dataset.ready = "true";
    };

    const start = () => {
      if (cancelled) return;
      img = new Image();
      img.decoding = "async";
      img.src = src;
      img.decode().then(draw, () => {});
    };
    // Après le chargement de la page, quand le navigateur est au repos.
    const idle = () => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300));
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });

    let t = 0;
    const onResize = () => { window.clearTimeout(t); t = window.setTimeout(draw, 200); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("load", idle);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [src, tileW, tileH]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
