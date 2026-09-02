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
      className={`fixed inset-0 z-[100] bg-[#111111] flex flex-col items-center justify-center transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <svg width="120" height="120" viewBox="0 0 200 200" fill="none">
        <circle
          cx="100"
          cy="42"
          r="16"
          fill="white"
          style={{
            transformOrigin: "100px 42px",
            animation: "ff-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            opacity: 0,
            transform: "scale(0)",
          }}
        />
        <path
          d="M18 132 Q 100 62 182 132"
          fill="none"
          stroke="white"
          strokeWidth="11"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ animation: "ff-draw 0.6s ease forwards 0.35s" }}
        />
        <path
          d="M18 152 Q 100 82 182 152"
          fill="none"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ animation: "ff-draw 0.6s ease forwards 0.55s" }}
        />
      </svg>

      <p
        className="text-white font-semibold text-lg mt-4"
        style={{
          opacity: 0,
          animation: "ff-fade-up 0.5s ease forwards 0.9s",
        }}
      >
        FishFlow
      </p>

      <style>{`
        @keyframes ff-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ff-pop {
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes ff-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}