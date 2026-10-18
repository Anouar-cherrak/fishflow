"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Première visite : aucune version n'est encore installée. On ne recharge alors jamais la page
    // (sinon un nouveau visiteur verrait la page se charger deux fois).
    const hadController = !!navigator.serviceWorker.controller;
    let timer = 0;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        // Vérifie s'il existe une nouvelle version toutes les 30 secondes
        timer = window.setInterval(() => {
          registration.update().catch(() => {});
        }, 30000);

        // Dès qu'une nouvelle version est prête, on l'active immédiatement
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      }).catch(() => {});
    };

    // Une fois la nouvelle version activée, on recharge une seule fois
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // L'installation attend la fin du chargement : elle ne prend pas de bande passante à la page.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
