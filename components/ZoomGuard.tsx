"use client";

import { useEffect } from "react";

// Champs où un double appui sert à sélectionner un mot : on n'y touche pas.
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
// Touches de zoom du navigateur (Ctrl/Cmd + « + », « - », « 0 ») : par position de touche (AZERTY compris) et par caractère.
const ZOOM_CODES = new Set(["Equal", "Minus", "Digit0", "NumpadAdd", "NumpadSubtract", "Numpad0"]);
const ZOOM_KEYS = new Set(["+", "=", "-", "_", "0"]);

/**
 * Le site garde toujours sa taille normale, comme une appli : pas de zoom au pincement, au double appui,
 * ni avec Ctrl + molette / Ctrl + « + ». Complète la balise viewport (app/layout.tsx) et le CSS
 * (touch-action dans app/globals.css), que Safari sur iPhone ignore en partie. Ne rend rien à l'écran.
 * Le défilement normal n'est jamais bloqué : chaque écouteur s'arrête tout de suite s'il ne s'agit pas d'un zoom.
 */
export function ZoomGuard() {
  useEffect(() => {
    // Safari (iPhone, iPad, pavé tactile du Mac) : le pincement passe par ces événements « gesture ».
    const stopGesture = (e: Event) => e.preventDefault();

    // Ordinateur : Ctrl + molette, et le pincement du pavé tactile (Chrome, Edge, Firefox l'envoient comme Ctrl + molette).
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    // Ordinateur : Ctrl/Cmd + « + », « - », « 0 ». Les autres raccourcis (copier, coller…) passent normalement.
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (ZOOM_CODES.has(e.code) || ZOOM_KEYS.has(e.key)) e.preventDefault();
    };

    // iPhone : deux appuis rapides au même endroit zooment parfois malgré tout. On annule le second
    // et on rejoue le clic, pour qu'un bouton touché deux fois vite réagisse quand même deux fois.
    // Un glissement (défilement) n'est pas un appui : on ne rejoue jamais de clic après avoir fait défiler.
    let lastEnd = 0;
    let startX = 0, startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const tap = !!t && Math.abs(t.clientX - startX) < 10 && Math.abs(t.clientY - startY) < 10;
      const now = e.timeStamp;
      const quick = now - lastEnd < 320;
      lastEnd = tap ? now : 0;
      if (!tap || !quick || e.touches.length > 0 || e.changedTouches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (!target || target.closest(EDITABLE)) return;
      e.preventDefault();
      target.click();
    };

    const iosLike = "ongesturestart" in window;
    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("keydown", onKey);
    if (iosLike) {
      document.addEventListener("gesturestart", stopGesture, opts);
      document.addEventListener("gesturechange", stopGesture, opts);
      document.addEventListener("gestureend", stopGesture, opts);
      document.addEventListener("touchstart", onTouchStart, { passive: true });
      document.addEventListener("touchend", onTouchEnd, opts);
    }
    return () => {
      window.removeEventListener("wheel", onWheel, opts);
      window.removeEventListener("keydown", onKey);
      if (iosLike) {
        document.removeEventListener("gesturestart", stopGesture, opts);
        document.removeEventListener("gesturechange", stopGesture, opts);
        document.removeEventListener("gestureend", stopGesture, opts);
        document.removeEventListener("touchstart", onTouchStart);
        document.removeEventListener("touchend", onTouchEnd, opts);
      }
    };
  }, []);

  return null;
}
