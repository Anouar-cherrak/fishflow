"use client";

import { useEffect, useState } from "react";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideType, setGuideType] = useState<"ios" | "generic">("generic");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
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

  if (isStandalone) return null;

  return (
    <div className="mb-4 bg-[#EFEBF7] border border-[#6D28D9]/15 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#6D28D9] flex items-center justify-center text-lg shrink-0">
          📲
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1E1533]">✨ L'app FishFlow est disponible !</p>
          <p className="text-xs text-[#1E1533]/50">Installe-la sur ton téléphone ou ton PC en un clic.</p>
        </div>
      </div>

      <button
        onClick={handleClick}
        className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition shrink-0"
      >
        📥 Télécharger l'application
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white border border-[#6D28D9]/10 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {guideType === "ios" ? (
              <>
                <p className="font-medium text-[#1E1533] mb-4">Installer FishFlow sur iPhone</p>
                <ol className="text-sm text-[#1E1533]/70 space-y-3 list-decimal list-inside">
                  <li>
                    Ouvre ce site dans <strong className="text-[#1E1533]">Safari</strong>
                  </li>
                  <li>
                    Appuie sur le bouton <strong className="text-[#1E1533]">Partager</strong> (carré avec une flèche)
                  </li>
                  <li>
                    Choisis <strong className="text-[#1E1533]">« Sur l'écran d'accueil »</strong>
                  </li>
                  <li>
                    Confirme avec <strong className="text-[#1E1533]">Ajouter</strong>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-medium text-[#1E1533] mb-4">Installer FishFlow</p>
                <p className="text-sm text-[#1E1533]/70 mb-3">Sur Chrome ou Edge (PC, Android) :</p>
                <ol className="text-sm text-[#1E1533]/70 space-y-3 list-decimal list-inside mb-4">
                  <li>Clique sur le menu du navigateur (⋮ en haut à droite)</li>
                  <li>
                    Choisis <strong className="text-[#1E1533]">« Installer FishFlow »</strong> ou{" "}
                    <strong className="text-[#1E1533]">« Ajouter à l'écran d'accueil »</strong>
                  </li>
                </ol>
                <p className="text-xs text-[#1E1533]/40">
                  Astuce : cherche aussi une petite icône ⊕ directement dans la barre d'adresse.
                </p>
              </>
            )}
            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#EFEBF7] hover:bg-[#e5dff5] transition text-sm text-[#1E1533]"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}