"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Fenêtre (dialogue) accessible au clavier : à l'ouverture le focus entre dedans, Tab reste à l'intérieur,
// Échap ferme, et à la fermeture le focus revient sur le bouton qui l'avait ouverte.
export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void, open = true) {
  // Toujours la dernière version de onClose (elle peut dépendre de l'état de la fenêtre).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const first = box?.querySelector<HTMLElement>("[data-autofocus]") ?? box?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? box)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const start = items[0];
      const end = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === start || !ref.current.contains(document.activeElement))) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && (document.activeElement === end || !ref.current.contains(document.activeElement))) {
        e.preventDefault();
        start.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, ref]);
}
