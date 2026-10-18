"use client";

import { useEffect } from "react";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";

/**
 * Applique la préférence de mode sombre sauvegardée sur le compte de
 * l'utilisateur connecté, dès le chargement de n'importe quelle page
 * (pas seulement /parametres). Ne rend rien à l'écran.
 */
export function ThemeSync() {
  useEffect(() => {
    // Le choix fait sur cet appareil gagne. Sans choix local, le thème sombre est le thème par défaut.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("ff-theme2");
    } catch {}
    // Pas connecté : pas de préférence de compte à lire (et pas d'erreur 401 dans la console).
    if (stored || !hasAuthCookie()) return;
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.darkMode === true) {
          document.documentElement.classList.toggle("dark", data.darkMode);
          try {
            localStorage.setItem("ff-theme2", data.darkMode ? "dark" : "light");
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
