"use client";

import { useEffect } from "react";

// Champs où un double appui sert à sélectionner un mot : on n'y touche pas.
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * Le zoom est libre (pincement, Ctrl + molette, Ctrl + « + » / « - ») : les personnes qui voient mal doivent pouvoir agrandir.
 * On ne bloque que le zoom accidentel du double appui sur iPhone (boutons touchés deux fois vite, ex. flashcards).
 * Le zoom automatique de l'iPhone sur les champs est évité par le CSS (champs à 16 px, app/globals.css),
 * et le double appui ailleurs par touch-action: manipulation. Ne rend rien à l'écran.
 */
export function ZoomGuard() {
  useEffect(() => {
    // iPhone : deux appuis rapides au même endroit zooment parfois malgré touch-action. On annule le second
    // et on rejoue le clic, pour qu'un bouton touché deux fois vite réagisse quand même deux fois.
    // Un glissement (défilement) ou un pincement n'est pas un appui : on ne rejoue jamais de clic dans ces cas.
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

    if (!("ongesturestart" in window)) return;
    const opts: AddEventListenerOptions = { passive: false };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, opts);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd, opts);
    };
  }, []);

  return null;
}
