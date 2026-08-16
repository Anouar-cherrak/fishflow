"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    const alreadyShown = sessionStorage.getItem("ff_splash_shown") === "1";

    if (standalone && !alreadyShown) {
      setVisible(true);
      sessionStorage.setItem("ff_splash_shown", "1");
      const fadeTimer = setTimeout(() => setFading(true), 1100);
      const removeTimer = setTimeout(() => setVisible(false), 1500);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <svg width="140" height="140" viewBox="0 0 200 200" fill="none">
        <circle
          cx="100"
          cy="40"
          r="14"
          fill="none"
          stroke="white"
          strokeWidth="8"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ animation: "ff-draw 0.5s ease forwards 0.1s" }}
        />
        <path
          d="M20 130 Q 100 60 180 130"
          fill="none"
          stroke="white"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ animation: "ff-draw 0.7s ease forwards 0.4s" }}
        />
      </svg>
      <style>{`
        @keyframes ff-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}