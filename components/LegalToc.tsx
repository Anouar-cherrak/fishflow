"use client";

import { useEffect, useState } from "react";

// Sommaire des pages légales : construit à partir des titres « h2 » de la page (rien à tenir à jour à la main).
export function LegalToc() {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    const hs = Array.from(document.querySelectorAll<HTMLHeadingElement>("main h2"));
    hs.forEach((h, i) => { if (!h.id) h.id = `partie-${i + 1}`; });
    const found = hs.map((h) => ({ id: h.id, label: h.textContent?.trim() ?? "" })).filter((x) => x.label);
    // Une seule mise à jour, après lecture de la page déjà affichée.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(found);
  }, []);
  if (items.length < 3) return null;
  return (
    <nav aria-label="Sommaire" className="mb-10 pb-6 border-b border-black/15">
      <p className="font-semibold mb-1">Sommaire</p>
      <ol className="grid sm:grid-cols-2 sm:gap-x-6">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className="ff-link inline-flex min-h-[44px] items-center font-medium">
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
