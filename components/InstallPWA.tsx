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
    <div className="mb-4 bg-[#F4F4F5] border border-black/10 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-lg shrink-0">
          📲
        </div>
        <div>
          <p className="text-sm font-semibold text-black">L'app FishFlow est disponible !</p>
          <p className="text-xs text-black/50">Installe-la sur ton téléphone ou ton PC en un clic.</p>
        </div>
      </div>

      <button
        onClick={handleClick}
        className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-black text-white hover:bg-[#1a1a1a] transition shrink-0"
      >
        📥 Télécharger l'application
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white border border-black/10 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {guideType === "ios" ? (
              <>
                <p className="font-medium text-black mb-4">Installer FishFlow sur iPhone</p>
                <ol className="text-sm text-black/70 space-y-3 list-decimal list-inside">
                  <li>Ouvre ce site dans <strong className="text-black">Safari</strong></li>
                  <li>Appuie sur le bouton <strong className="text-black">Partager</strong> (carré avec une flèche)</li>
                  <li>Choisis <strong className="text-black">« Sur l'écran d'accueil »</strong></li>
                  <li>Confirme avec <strong className="text-black">Ajouter</strong></li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-medium text-black mb-4">Installer FishFlow</p>
                <p className="text-sm text-black/70 mb-3">Sur Chrome ou Edge (PC, Android) :</p>
                <ol className="text-sm text-black/70 space-y-3 list-decimal list-inside mb-4">
                  <li>Clique sur le menu du navigateur (⋮ en haut à droite)</li>
                  <li>
                    Choisis <strong className="text-black">« Installer FishFlow »</strong> ou{" "}
                    <strong className="text-black">« Ajouter à l'écran d'accueil »</strong>
                  </li>
                </ol>
                <p className="text-xs text-black/40">
                  Astuce : cherche aussi une petite icône ⊕ directement dans la barre d'adresse.
                </p>
              </>
            )}
            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#F4F4F5] hover:bg-black/10 transition text-sm text-black"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}