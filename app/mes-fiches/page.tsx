"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";

type FicheRow = {
  id: string;
  title: string;
  data: any;
  created_at: string;
};

export default function MesFiches() {
  const [fiches, setFiches] = useState<FicheRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("fiches")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFiches(data as FicheRow[]);
      }
      setLoading(false);
    };

    load();
  }, [router]);

  const handleView = (fiche: FicheRow) => {
    localStorage.setItem("fishflow_result", JSON.stringify(fiche.data));
    router.push("/result");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette fiche ? Cette action est irréversible.")) return;
    const supabase = createClient();
    await supabase.from("fiches").delete().eq("id", id);
    setFiches((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <p className="text-white/30 text-sm">Chargement...</p>
      </main>
    );
  }

  const now = new Date();
  const thisMonthCount = fiches.filter((f) => {
    const d = new Date(f.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white px-4 py-10 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-[#7C3AED] rounded-full blur-3xl opacity-15 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Logo size={22} />
          <Wordmark className="text-sm" />
        </div>

        <div className="flex items-center justify-between mb-4 mt-4">
          <h1 className="text-xl font-semibold">Mes fiches</h1>
          <button
            onClick={() => router.push("/generer")}
            className="text-sm bg-white/10 border border-white/10 px-3 py-1.5 rounded-full font-medium hover:bg-white/20 transition"
          >
            + Nouvelle fiche
          </button>
        </div>

        {fiches.length > 0 && (
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-semibold bg-gradient-to-r from-[#2563EB] to-[#EC4899] bg-clip-text text-transparent">
                {thisMonthCount}
              </p>
              <p className="text-xs text-white/40 mt-0.5">fiche{thisMonthCount > 1 ? "s" : ""} ce mois-ci</p>
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-white">{fiches.length}</p>
              <p className="text-xs text-white/40 mt-0.5">au total</p>
            </div>
          </div>
        )}

        {fiches.length === 0 ? (
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-10 text-center">
            <p className="text-white/40 mb-4">Tu n'as pas encore de fiche sauvegardée.</p>
            <button
              onClick={() => router.push("/generer")}
              className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition"
            >
              Créer ma première fiche
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {fiches.map((fiche) => (
              <div
                key={fiche.id}
                className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{fiche.title}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(fiche.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleView(fiche)}
                    className="text-sm text-white/80 hover:text-white font-medium hover:underline transition"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => handleDelete(fiche.id)}
                    className="text-sm text-white/30 hover:text-red-400 transition"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}