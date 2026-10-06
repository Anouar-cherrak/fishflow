"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FicheView, type FishFlowResult } from "@/components/FicheView";

// Page de secours : une fiche qui n'a pas pu être enregistrée en base reste lisible ici
// (elle est alors gardée dans le navigateur). Une fiche enregistrée a sa propre adresse : /fiche/[id].
export default function Result() {
  const [data, setData] = useState<FishFlowResult | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fishflow_result");
      if (stored) {
        const parsed = JSON.parse(stored) as FishFlowResult;
        if (parsed.id) {
          router.replace(`/fiche/${parsed.id}`);
          return;
        }
        setData(parsed);
      }
    } catch {}
    setChecked(true);
  }, [router]);

  if (data) return <FicheView initialData={data} />;
  if (!checked) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black px-4">
      <p className="text-black/50">Aucun résultat trouvé. Retourne à l'accueil pour en générer un.</p>
    </main>
  );
}
