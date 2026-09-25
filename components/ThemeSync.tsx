"use client";

import { useEffect } from "react";

/**
 * Applique la préférence de mode sombre sauvegardée sur le compte de
 * l'utilisateur connecté, dès le chargement de n'importe quelle page
 * (pas seulement /parametres). Ne rend rien à l'écran.
 */
export function ThemeSync() {
  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.darkMode === "boolean") {
          document.documentElement.classList.toggle("dark", data.darkMode);
          try {
            localStorage.setItem("ff-theme", data.darkMode ? "dark" : "light");
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
