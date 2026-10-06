"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FicheView, type FishFlowResult } from "@/components/FicheView";

export default function FichePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<FishFlowResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const { data: row, error } = await supabase
        .from("fiches")
        .select("id, data, best_score")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !row) {
        setStatus("missing");
        return;
      }

      setData({ ...(row.data as FishFlowResult), id: row.id, best_score: row.best_score });
      setStatus("ready");
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black/40 text-sm">Chargement...</p>
      </main>
    );
  }

  if (status === "missing" || !data) {
    return (
      <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-4 text-center gap-4">
        <p className="text-black/60">Cette fiche est introuvable, ou elle appartient à un autre compte.</p>
        <div className="flex items-center gap-3">
          <Link href="/mes-fiches" className="text-sm font-medium px-4 py-2 rounded-lg border border-black/15 hover:bg-surface transition">
            Mes fiches
          </Link>
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition ff-btn">
            Me connecter
          </Link>
        </div>
      </main>
    );
  }

  return <FicheView key={data.id} initialData={data} />;
}
