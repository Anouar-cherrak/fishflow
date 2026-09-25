"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);

    // Si l'utilisateur est connecté, on récupère sa préférence sauvegardée sur son compte
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.darkMode === "boolean") {
          setIsDark(data.darkMode);
          document.documentElement.classList.toggle("dark", data.darkMode);
          try {
            localStorage.setItem("ff-theme", data.darkMode ? "dark" : "light");
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ff-theme", next ? "dark" : "light");
    } catch {}
    // Sauvegarde sur le compte (silencieux si non connecté)
    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: next }),
    }).catch(() => {});
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between py-1"
      aria-pressed={isDark}
    >
      <span className="text-sm font-medium text-black">Mode sombre</span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          isDark ? "bg-[#22C55E]" : "bg-black/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-[#ffffff] shadow transition ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
