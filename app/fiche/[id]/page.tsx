"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
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
      <AppShell size="form">
        <p className="text-black/50 text-sm py-24 text-center" role="status">Chargement...</p>
      </AppShell>
    );
  }

  if (status === "missing" || !data) {
    return (
      <AppShell size="form">
        <div className="py-20 text-center grid gap-5 justify-items-center">
          <h1 className="ff-title">Fiche introuvable.</h1>
          <p className="ff-lead">Cette fiche n&apos;existe pas, ou elle appartient à un autre compte.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/mes-fiches" className="ff-secondary text-sm">Mes fiches</Link>
            <Link href="/login" className="ff-primary text-sm ff-btn">Me connecter</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return <FicheView key={data.id} initialData={data} />;
}
