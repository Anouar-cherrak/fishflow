"use client";

import { useEffect, useRef, useState } from "react";
import { useDialog } from "@/lib/use-dialog";
import { createPortal } from "react-dom";

// Événement « installer l'appli » de Chrome (pas encore dans les types du navigateur).
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideType, setGuideType] = useState<"ios" | "generic">("generic");
  const guideRef = useRef<HTMLDivElement>(null);
  useDialog(guideRef, () => setShowGuide(false), showGuide);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    try {
      if (localStorage.getItem("ff-install-hidden") === "1") setDismissed(true);
    } catch {}

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (isIOS) {
      setGuideType("ios");
      setShowGuide(true);
      return;
    }
    setGuideType("generic");
    setShowGuide(true);
  };

  if (isStandalone || dismissed) return null;

  const hide = () => {
    setDismissed(true);
    try {
      localStorage.setItem("ff-install-hidden", "1");
    } catch {}
  };

  return (
    <div className="mb-4 bg-surface border border-black/10 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-black">Mets FishFlow sur ton écran d&apos;accueil</p>
        <p className="text-xs text-black/60">Tu l&apos;ouvres ensuite comme une appli, en un geste.</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={handleClick} className="ff-secondary text-sm min-h-[44px] px-4">
          Installer
        </button>
        <button type="button" onClick={hide} className="text-sm text-black/60 hover:text-black underline underline-offset-4 min-h-[44px] px-3">
          Plus tard
        </button>
      </div>

      {showGuide && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 ff-veil flex items-center justify-center px-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            ref={guideRef}
            role="dialog"
            aria-modal="true"
            aria-label={guideType === "ios" ? "Installer FishFlow sur iPhone" : "Installer FishFlow"}
            className="bg-surface border border-black/10 rounded-2xl p-6 max-w-sm w-full shadow-xl max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="font-medium text-black">
                {guideType === "ios" ? "Installer FishFlow sur iPhone" : "Installer FishFlow"}
              </p>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-black/60 hover:text-black text-xl leading-none shrink-0 ml-3"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {guideType === "ios" ? (
              <ol className="text-sm text-black/70 space-y-3 list-decimal list-inside">
                <li>Ouvre ce site dans <strong className="text-black">Safari</strong></li>
                <li>Appuie sur le bouton <strong className="text-black">Partager</strong> (carré avec une flèche)</li>
                <li>Choisis <strong className="text-black">« Sur l'écran d'accueil »</strong></li>
                <li>Confirme avec <strong className="text-black">Ajouter</strong></li>
              </ol>
            ) : (
              <>
                <p className="text-sm text-black/70 mb-3">Sur Chrome ou Edge (ordinateur, Android) : clique sur la petite icône d&apos;installation, à droite dans la barre d&apos;adresse.</p>
                <p className="text-xs text-black/60">
                  Si tu ne la vois pas : ouvre le menu du navigateur (⋮ en haut à droite) puis choisis « Installer FishFlow ».
                </p>
              </>
            )}

            <button
              type="button"
              data-autofocus
              onClick={() => setShowGuide(false)}
              className="ff-secondary mt-5 w-full text-sm"
            >
              Compris
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}