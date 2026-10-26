"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const alreadyShown = sessionStorage.getItem("ff_splash_shown") === "1";

    if (standalone && !alreadyShown) {
      setVisible(true);
      sessionStorage.setItem("ff_splash_shown", "1");
      const fadeTimer = setTimeout(() => setFading(true), 1400);
      const removeTimer = setTimeout(() => setVisible(false), 1800);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`ff-splash fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* La raie arrive en douceur (simple apparition si l'animation est coupée). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/raie.svg"
        alt=""
        aria-hidden="true"
        width={140}
        height={115}
        style={{ animation: "ff-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards", opacity: 0, transform: "scale(0.6)" }}
      />

      <p
        className="ff-wordmark text-[#EAF6FF] text-xl mt-4"
        style={{
          opacity: 0,
          animation: "0.5s ease forwards 0.9s",
        }}
      >
        FishFlow
      </p>

      <style>{`
        @keyframes ff-pop {
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="ff-pop"], [style*=""] { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}