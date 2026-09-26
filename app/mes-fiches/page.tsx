"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";

type FicheRow = {
  id: string;
  title: string;
  data: any;
  created_at: string;
  folder_id: string | null;
  best_score: number | null;
};

type FolderRow = {
  id: string;
  name: string;
  color: string;
};

const PASTEL_COLORS = [
  { name: "Violet", value: "#E9D5FF" },
  { name: "Rose", value: "#FBCFE8" },
  { name: "Bleu", value: "#BFDBFE" },
  { name: "Vert", value: "#BBF7D0" },
  { name: "Jaune", value: "#FEF08A" },
  { name: "Orange", value: "#FED7AA" },
  { name: "Rouge", value: "#FECACA" },
  { name: "Gris", value: "#E5E7EB" },
];

export default function MesFiches() {
  const [fiches, setFiches] = useState<FicheRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | "all" | "none">("all");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(PASTEL_COLORS[0].value);
  const [movingFicheId, setMovingFicheId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const [fichesRes, foldersRes] = await Promise.all([
        supabase.from("fiches").select("*").order("created_at", { ascending: false }),
        supabase.from("folders").select("*").order("created_at", { ascending: true }),
      ]);

      if (!fichesRes.error && fichesRes.data) setFiches(fichesRes.data as FicheRow[]);
      if (!foldersRes.error && foldersRes.data) setFolders(foldersRes.data as FolderRow[]);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleView = (fiche: FicheRow) => {
    localStorage.setItem(
      "fishflow_result",
      JSON.stringify({ ...fiche.data, id: fiche.id, best_score: fiche.best_score })
    );
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

  const createFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("folders")
      .insert({ name: trimmed, color: newFolderColor, user_id: userData.user.id })
      .select()
      .single();

    if (!error && data) {
      setFolders((prev) => [...prev, data as FolderRow]);
      setNewFolderName("");
      setNewFolderColor(PASTEL_COLORS[0].value);
      setShowNewFolder(false);
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Supprimer ce dossier ? Les fiches à l'intérieur ne seront pas supprimées, juste déclassées.")) return;
    const supabase = createClient();
    await supabase.from("folders").delete().eq("id", id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setFiches((prev) => prev.map((f) => (f.folder_id === id ? { ...f, folder_id: null } : f)));
    if (activeFolder === id) setActiveFolder("all");
  };

  const moveFicheToFolder = async (ficheId: string, folderId: string | null) => {
    const supabase = createClient();
    await supabase.from("fiches").update({ folder_id: folderId }).eq("id", ficheId);
    setFiches((prev) => prev.map((f) => (f.id === ficheId ? { ...f, folder_id: folderId } : f)));
    setMovingFicheId(null);
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

  const filteredFiches = fiches.filter((f) => {
    if (activeFolder === "all") return true;
    if (activeFolder === "none") return !f.folder_id;
    return f.folder_id === activeFolder;
  });

  const noneCount = fiches.filter((f) => !f.folder_id).length;

  return (
    <main className="min-h-screen bg-white text-black px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2 ff-fade">
          <Logo size={22} />
          <Wordmark className="text-sm" />
        </div>

        <div className="flex items-center justify-between mb-4 mt-4 ff-fade-up">
          <h1 className="text-xl font-semibold">Mes fiches</h1>
          <button onClick={() => router.push("/generer")} className="text-sm bg-[#22C55E] text-[#ffffff] px-3 py-1.5 rounded-full font-medium hover:bg-[#16A34A] transition ff-btn">
            Nouvelle fiche
          </button>
        </div>

        {fiches.length > 0 && (
          <div className="flex gap-3 mb-6 ff-fade-up" style={{ animationDelay: "0.05s" }}>
            <div className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-center ff-card">
              <p className="text-2xl font-semibold text-black">{thisMonthCount}</p>
              <p className="text-xs text-black/40 mt-0.5">fiche{thisMonthCount > 1 ? "s" : ""} ce mois-ci</p>
            </div>
            <div className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-center ff-card">
              <p className="text-2xl font-semibold text-black">{fiches.length}</p>
              <p className="text-xs text-black/40 mt-0.5">au total</p>
            </div>
          </div>
        )}

        <div className="mb-5 ff-fade-up" style={{ animationDelay: "0.08s" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveFolder("all")}
              className={`text-sm px-3 py-1.5 rounded-full font-medium transition ${
                activeFolder === "all" ? "bg-[#111111] text-[#ffffff]" : "bg-surface text-black/60 hover:bg-black/10"
              }`}
            >
              Toutes ({fiches.length})
            </button>

            {folders.map((folder) => (
              <div key={folder.id} className="relative group">
                <button
                  onClick={() => setActiveFolder(folder.id)}
                  className={`text-sm pl-3 pr-7 py-1.5 rounded-full font-medium transition flex items-center gap-2 ${
                    activeFolder === folder.id ? "ring-2 ring-black/40" : ""
                  }`}
                  style={{ backgroundColor: folder.color, color: "#1a1a1a" }}
                >
                  {folder.name} ({fiches.filter((f) => f.folder_id === folder.id).length})
                </button>
                <button
                  onClick={() => deleteFolder(folder.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-black/50 hover:text-black text-sm font-bold transition"
                  title="Supprimer le dossier"
                >
                  ✕
                </button>
              </div>
            ))}

            {noneCount > 0 && (
              <button
                onClick={() => setActiveFolder("none")}
                className={`text-sm px-3 py-1.5 rounded-full font-medium transition ${
                  activeFolder === "none" ? "bg-[#111111] text-[#ffffff]" : "bg-surface text-black/60 hover:bg-black/10"
                }`}
              >
                Sans dossier ({noneCount})
              </button>
            )}

            <button
              onClick={() => setShowNewFolder(!showNewFolder)}
              className="text-sm px-3 py-1.5 rounded-full font-medium border border-dashed border-black/25 text-black/50 hover:border-black/40 hover:text-black transition"
            >
              + Nouveau dossier
            </button>
          </div>

          {showNewFolder && (
            <div className="mt-3 bg-white border border-black/10 rounded-xl p-4 ff-fade">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom de la matière (ex: Anglais, Droit...)"
                className="w-full p-2.5 border border-black/15 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
              />
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {PASTEL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewFolderColor(c.value)}
                    className={`w-7 h-7 rounded-full transition ${
                      newFolderColor === c.value ? "ring-2 ring-offset-2 ring-black" : ""
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="text-sm px-4 py-2 rounded-lg bg-[#22C55E] text-[#ffffff] font-medium hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
                >
                  Créer
                </button>
                <button
                  onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                  className="text-sm px-4 py-2 rounded-lg text-black/50 hover:text-black transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {filteredFiches.length === 0 ? (
          <div className="bg-white border border-black/10 rounded-2xl p-10 text-center ff-fade-up ff-card">
            <p className="text-black/50 mb-4">
              {fiches.length === 0 ? "Tu n'as pas encore de fiche sauvegardée." : "Aucune fiche dans cette section."}
            </p>
            {fiches.length === 0 && (
              <button onClick={() => router.push("/generer")} className="px-4 py-2 rounded-lg font-medium bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition ff-btn">
                Créer ma première fiche
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFiches.map((fiche, i) => {
              const ficheFolder = folders.find((f) => f.id === fiche.folder_id);
              return (
                <div
                  key={fiche.id}
                  className="bg-white border border-black/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ff-fade-up ff-card"
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                >
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
                        <button onClick={() => saveTitle(fiche.id)} disabled={saving} className="text-xs font-semibold text-[#22C55E] shrink-0 disabled:opacity-50">
                          OK
                        </button>
                        <button onClick={cancelEditing} className="text-xs text-black/40 shrink-0">
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {ficheFolder && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: ficheFolder.color }}
                          />
                        )}
                        <p className="font-medium text-black truncate">{fiche.title}</p>
                        {fiche.best_score !== null && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              fiche.best_score >= 80
                                ? "bg-[#DCFCE7] text-[#16A34A]"
                                : "bg-surface text-black/50"
                            }`}
                          >
                            {fiche.best_score}%
                          </span>
                        )}
                        <button onClick={() => startEditing(fiche)} className="text-black/30 hover:text-black transition text-xs shrink-0" title="Renommer">
                          Renommer
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-black/30 mt-0.5">
                      {new Date(fiche.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 -mx-2 sm:mx-0">
                    <button
                      onClick={() => setMovingFicheId(fiche.id)}
                      className="text-sm text-black/40 hover:text-black transition px-2 py-1.5 rounded-lg hover:bg-surface"
                      title="Déplacer vers un dossier"
                    >
                      Dossier
                    </button>
                    <button onClick={() => handleView(fiche)} className="text-sm text-[#22C55E] font-medium hover:underline transition ff-link-underline px-2 py-1.5 rounded-lg hover:bg-surface">
                      Voir
                    </button>
                    <button onClick={() => handleDelete(fiche.id)} className="text-sm text-black/30 hover:text-black transition px-2 py-1.5 rounded-lg hover:bg-surface">
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {movingFicheId && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setMovingFicheId(null)}
        >
          <div
            className="bg-surface border border-black/10 rounded-2xl shadow-xl p-4 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-black mb-3 px-1">Déplacer vers</p>
            <button
              onClick={() => moveFicheToFolder(movingFicheId, null)}
              className="w-full text-left text-sm px-3 py-2.5 rounded-lg hover:bg-surface transition"
            >
              Sans dossier
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => moveFicheToFolder(movingFicheId, folder.id)}
                className="w-full text-left text-sm px-3 py-2.5 rounded-lg hover:bg-surface transition flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: folder.color }} />
                {folder.name}
              </button>
            ))}
            {folders.length === 0 && (
              <p className="text-xs text-black/30 px-3 py-2">Crée d'abord un dossier plus haut.</p>
            )}
            <button
              onClick={() => setMovingFicheId(null)}
              className="w-full mt-2 text-center text-sm px-3 py-2.5 rounded-lg bg-surface text-black/60 hover:text-black transition"
            >
              Annuler
            </button>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}