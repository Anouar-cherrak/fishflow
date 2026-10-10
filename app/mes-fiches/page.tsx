"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { countDueCards } from "@/lib/reviews";

type FicheRow = {
  id: string;
  title: string;
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
  const [dueCount, setDueCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    countDueCards().then(setDueCount);
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const [fichesRes, foldersRes] = await Promise.all([
        // On ne charge que l'en-tête de chaque fiche ; le contenu complet est chargé à l'ouverture.
        supabase
          .from("fiches")
          .select("id, title, created_at, folder_id, best_score")
          .order("created_at", { ascending: false }),
        supabase.from("folders").select("*").order("created_at", { ascending: true }),
      ]);

      if (!fichesRes.error && fichesRes.data) setFiches(fichesRes.data as FicheRow[]);
      if (!foldersRes.error && foldersRes.data) setFolders(foldersRes.data as FolderRow[]);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleView = (fiche: FicheRow) => {
    router.push(`/fiche/${fiche.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette fiche ? Cette action est irréversible.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("fiches").delete().eq("id", id);
    if (error) {
      alert("Impossible de supprimer cette fiche pour l'instant. Vérifie ta connexion et réessaie.");
      return;
    }
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
      <AppShell size="wide">
        <p className="text-black/50 text-sm py-24 text-center" role="status">Chargement...</p>
      </AppShell>
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

  const tabClass = (active: boolean) =>
    `shrink-0 flex items-center gap-2 min-h-[44px] px-4 rounded-full text-sm font-semibold transition whitespace-nowrap lg:w-full lg:rounded-2xl lg:justify-start ${
      active ? "bg-black text-white" : "bg-surface text-black/65 hover:text-black border border-black/10"
    }`;

  return (
    <AppShell size="wide">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 ff-fade-up">
        <div>
          <h1 className="ff-title mb-2">Mes fiches.</h1>
          <p className="ff-lead">
            {fiches.length === 0
              ? "Ici, tu retrouves toutes tes fiches. Tu peux les classer par matière."
              : `${fiches.length} fiche${fiches.length > 1 ? "s" : ""} au total, dont ${thisMonthCount} ce mois-ci.`}
          </p>
        </div>
        <button type="button" onClick={() => router.push("/generer")} className="ff-primary ff-btn">
          Nouvelle fiche
        </button>
      </div>

      {dueCount > 0 && (
        <div className="mb-8 bg-surface border border-[#22C55E]/50 rounded-3xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 ff-fade-up">
          <p className="text-black">
            <span className="font-extrabold text-xl mr-1">{dueCount}</span> carte{dueCount > 1 ? "s" : ""} à réviser aujourd&apos;hui
          </p>
          <button type="button" onClick={() => router.push("/reviser")} className="ff-primary text-sm ff-btn shrink-0">
            Réviser
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:gap-10 grid-cols-[minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)] items-start">
        {/* Dossiers */}
        <div className="ff-fade-up min-w-0">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" role="group" aria-label="Dossiers">
            <button type="button" aria-pressed={activeFolder === "all"} onClick={() => setActiveFolder("all")} className={tabClass(activeFolder === "all")}>
              Toutes ({fiches.length})
            </button>

            {folders.map((folder) => (
              <div key={folder.id} className="relative shrink-0 lg:w-full">
                <button
                  type="button"
                  aria-pressed={activeFolder === folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  className={`${tabClass(activeFolder === folder.id)} pr-11`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: folder.color }} aria-hidden="true" />
                  {folder.name} ({fiches.filter((f) => f.folder_id === folder.id).length})
                </button>
                <button
                  type="button"
                  onClick={() => deleteFolder(folder.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-current opacity-60 hover:opacity-100 text-sm"
                  aria-label={`Supprimer le dossier ${folder.name}`}
                  title="Supprimer le dossier"
                >
                  ✕
                </button>
              </div>
            ))}

            {noneCount > 0 && folders.length > 0 && (
              <button type="button" aria-pressed={activeFolder === "none"} onClick={() => setActiveFolder("none")} className={tabClass(activeFolder === "none")}>
                Sans dossier ({noneCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNewFolder(!showNewFolder)}
              aria-expanded={showNewFolder}
              className="shrink-0 min-h-[44px] px-4 rounded-full text-sm font-semibold border border-dashed border-black/30 text-black/60 hover:border-[#22C55E] hover:text-black transition whitespace-nowrap lg:w-full lg:rounded-2xl"
            >
              + Nouveau dossier (matière)
            </button>
          </div>

          {showNewFolder && (
            <div className="mt-3 bg-surface border border-black/10 rounded-2xl p-4 ff-fade">
              <label htmlFor="folder-name" className="sr-only">Nom du dossier</label>
              <input
                id="folder-name"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Matière (ex : Anglais, Droit...)"
                className="w-full min-h-[44px] px-3 border border-black/15 rounded-xl mb-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                autoFocus
              />
              <div className="flex items-center gap-2 mb-3 flex-wrap" role="group" aria-label="Couleur du dossier">
                {PASTEL_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setNewFolderColor(c.value)}
                    aria-pressed={newFolderColor === c.value}
                    className={`w-8 h-8 rounded-full transition ${
                      newFolderColor === c.value ? "ring-2 ring-offset-2 ring-offset-[var(--ff-surface)] ring-[#22C55E]" : ""
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={createFolder} disabled={!newFolderName.trim()} className="ff-primary text-sm min-h-[44px] ff-btn">
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                  className="text-sm px-4 rounded-full text-black/60 hover:text-black transition min-h-[44px]"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fiches */}
        <div className="min-w-0">
          {filteredFiches.length === 0 ? (
            <div className="bg-surface border border-black/10 rounded-3xl p-10 text-center ff-fade-up grid gap-4 justify-items-center">
              <p className="text-black/60">
                {fiches.length === 0 ? "Tu n'as pas encore de fiche. Colle un cours, envoie un PDF ou une photo : ta première fiche arrive en quelques secondes." : "Aucune fiche dans cette section."}
              </p>
              {fiches.length === 0 && (
                <button type="button" onClick={() => router.push("/generer")} className="ff-primary ff-btn">
                  Créer ma première fiche
                </button>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {filteredFiches.map((fiche, i) => {
                const ficheFolder = folders.find((f) => f.id === fiche.folder_id);
                return (
                  <li
                    key={fiche.id}
                    className="min-w-0 bg-surface border border-black/10 rounded-3xl p-5 flex flex-col gap-4 ff-fade-up ff-card"
                    style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                  >
                    <div className="min-w-0 flex-1">
                      {editingId === fiche.id ? (
                        <div className="flex items-center gap-2">
                          <label htmlFor={`rename-${fiche.id}`} className="sr-only">Nouveau titre</label>
                          <input
                            id={`rename-${fiche.id}`}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveTitle(fiche.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            autoFocus
                            className="flex-1 min-w-0 min-h-[44px] px-3 border border-black/30 rounded-xl text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                          />
                          <button type="button" onClick={() => saveTitle(fiche.id)} disabled={saving} className="text-sm font-semibold text-[#22C55E] shrink-0 disabled:opacity-50 min-h-[44px] px-1">
                            OK
                          </button>
                          <button type="button" onClick={cancelEditing} className="text-sm text-black/50 shrink-0 min-h-[44px] px-1">
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {ficheFolder && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-black/60">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ficheFolder.color }} aria-hidden="true" />
                                {ficheFolder.name}
                              </span>
                            )}
                            {fiche.best_score !== null && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                                  fiche.best_score >= 80 ? "bg-[#22C55E] text-[#04130A]" : "bg-white border border-black/15 text-black/60"
                                }`}
                              >
                                Quiz {fiche.best_score}%
                              </span>
                            )}
                          </div>
                          <h2 className="font-bold text-lg leading-snug text-black line-clamp-3 break-words">{fiche.title}</h2>
                        </>
                      )}
                      <p className="text-sm text-black/50 mt-2">
                        {new Date(fiche.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:flex-wrap sm:-mx-2">
                      <button type="button" onClick={() => handleView(fiche)} className="ff-primary text-sm min-h-[44px] sm:min-h-[40px] px-5 sm:mx-2 ff-btn col-span-3 sm:col-span-1 mb-1 sm:mb-0">
                        Ouvrir
                      </button>
                      <button type="button" onClick={() => startEditing(fiche)} className="text-sm text-black/60 hover:text-black transition px-2.5 min-h-[44px] sm:min-h-[40px] rounded-full hover:bg-white">
                        Renommer
                      </button>
                      <button type="button" onClick={() => setMovingFicheId(fiche.id)} className="text-sm text-black/60 hover:text-black transition px-2.5 min-h-[44px] sm:min-h-[40px] rounded-full hover:bg-white" title="Ranger cette fiche dans un dossier (une matière, par exemple)">
                        Classer
                      </button>
                      <button type="button" onClick={() => handleDelete(fiche.id)} className="text-sm text-black/60 hover:text-[var(--quiz-wrong-text)] transition px-2.5 min-h-[44px] sm:min-h-[40px] rounded-full hover:bg-white">
                        Supprimer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {movingFicheId && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[70] bg-[#000000]/50 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setMovingFicheId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Déplacer la fiche"
            className="bg-surface border border-black/10 rounded-3xl shadow-xl p-4 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-black mb-3 px-1">Ranger cette fiche dans…</p>
            <button type="button" onClick={() => moveFicheToFolder(movingFicheId, null)} className="w-full text-left text-sm px-3 min-h-[44px] rounded-xl hover:bg-white transition">
              Sans dossier
            </button>
            {folders.map((folder) => (
              <button
                type="button"
                key={folder.id}
                onClick={() => moveFicheToFolder(movingFicheId, folder.id)}
                className="w-full text-left text-sm px-3 min-h-[44px] rounded-xl hover:bg-white transition flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: folder.color }} aria-hidden="true" />
                {folder.name}
              </button>
            ))}
            {folders.length === 0 && <p className="text-xs text-black/50 px-3 py-2">Crée d&apos;abord un dossier (par exemple une matière) avec « + Nouveau dossier (matière) ».</p>}
            <button type="button" onClick={() => setMovingFicheId(null)} className="ff-secondary w-full mt-2 text-sm">
              Annuler
            </button>
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
