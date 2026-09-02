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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase.from("fiches").select("*").order("created_at", { ascending: false });
      if (!error && data) setFiches(data as FicheRow[]);
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

  const startEditing = (fiche: FicheRow) => {
    setEditingId(fiche.id);
    setEditValue(fiche.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveTitle = async (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("fiches").update({ title: trimmed }).eq("id", id);
    if (!error) {
      setFiches((prev) => prev.map((f) => (f.id === id ? { ...f, title: trimmed } : f)));
    }
    setSaving(false);
    setEditingId(null);
    setEditValue("");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black/40 text-sm">Chargement...</p>
      </main>
    );
  }

  const now = new Date();
  const thisMonthCount = fiches.filter((f) => {
    const d = new Date(f.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <main className="min-h-screen bg-white text-black px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Logo size={22} />
          <Wordmark className="text-sm" />
        </div>

        <div className="flex items-center justify-between mb-4 mt-4">
          <h1 className="text-xl font-semibold">Mes fiches</h1>
          <button onClick={() => router.push("/generer")} className="text-sm bg-white border border-black/20 px-3 py-1.5 rounded-full font-medium hover:border-black/40 transition">
            + Nouvelle fiche
          </button>
        </div>

        {fiches.length > 0 && (
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-black">{thisMonthCount}</p>
              <p className="text-xs text-black/40 mt-0.5">fiche{thisMonthCount > 1 ? "s" : ""} ce mois-ci</p>
            </div>
            <div className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-black">{fiches.length}</p>
              <p className="text-xs text-black/40 mt-0.5">au total</p>
            </div>
          </div>
        )}

        {fiches.length === 0 ? (
          <div className="bg-white border border-black/10 rounded-2xl p-10 text-center">
            <p className="text-black/50 mb-4">Tu n'as pas encore de fiche sauvegardée.</p>
            <button onClick={() => router.push("/generer")} className="px-4 py-2 rounded-lg font-medium bg-black text-white hover:bg-[#1a1a1a] transition">
              Créer ma première fiche
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {fiches.map((fiche) => (
              <div key={fiche.id} className="bg-white border border-black/10 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {editingId === fiche.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle(fiche.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                        className="w-full px-2 py-1 border border-black/30 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <button onClick={() => saveTitle(fiche.id)} disabled={saving} className="text-xs font-semibold text-black shrink-0 disabled:opacity-50">
                        ✓
                      </button>
                      <button onClick={cancelEditing} className="text-xs text-black/40 shrink-0">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-black truncate">{fiche.title}</p>
                      <button onClick={() => startEditing(fiche)} className="text-black/30 hover:text-black transition text-sm shrink-0" title="Renommer">
                        ✏️
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-black/30 mt-0.5">
                    {new Date(fiche.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => handleView(fiche)} className="text-sm text-black font-medium hover:underline transition">
                    Voir
                  </button>
                  <button onClick={() => handleDelete(fiche.id)} className="text-sm text-black/30 hover:text-black transition">
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