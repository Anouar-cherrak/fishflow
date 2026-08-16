"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "fishflow_install_dismissed";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setReady(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!ready || isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="mb-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-sm shrink-0">
          📲
        </div>
        <div>
          <p className="text-sm font-medium text-white">Installe FishFlow</p>
          <p className="text-xs text-white/40">Retrouve tes fiches directement depuis ton écran d'accueil.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:opacity-90 transition"
          >
            Installer
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Comment installer
          </button>
        )}
        <button onClick={handleDismiss} className="text-white/30 hover:text-white text-xs px-2">
          ✕
        </button>
      </div>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="bg-[#0B0F1A] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium text-white mb-4">Installer FishFlow sur iPhone</p>
            <ol className="text-sm text-white/70 space-y-3 list-decimal list-inside">
              <li>
                Ouvre ce site dans <strong className="text-white">Safari</strong> (pas dans l'app TikTok/Instagram)
              </li>
              <li>
                Appuie sur le bouton <strong className="text-white">Partager</strong> (icône carré avec une flèche)
              </li>
              <li>
                Fais défiler et choisis <strong className="text-white">« Sur l'écran d'accueil »</strong>
              </li>
              <li>
                Confirme en appuyant sur <strong className="text-white">Ajouter</strong>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}