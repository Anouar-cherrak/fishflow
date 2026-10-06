"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
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
    <AppShell size="form">
      <div className="py-20 text-center grid gap-5 justify-items-center">
        <h1 className="ff-title">Aucun résultat.</h1>
        <p className="ff-lead">Génère une fiche pour la voir ici.</p>
        <Link href="/generer" className="ff-primary text-sm ff-btn">Générer une fiche</Link>
      </div>
    </AppShell>
  );
}
