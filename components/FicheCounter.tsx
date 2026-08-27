"use client";

import { useEffect, useState } from "react";

export function FicheCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  if (!count) return null;

  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm text-white/70">
      📚 <span className="font-semibold text-white">{count.toLocaleString("fr-FR")}</span> fiches créées avec FishFlow
    </div>
  );
}