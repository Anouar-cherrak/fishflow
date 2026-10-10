"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { trackEvent } from "@/lib/tracking";

type Exam = { id: string; title: string; exam_date: string; fiche_ids: string[] };
type FicheLite = { id: string; title: string; cards: number; folder_id: string | null };
type FolderLite = { id: string; name: string; color: string };
type Review = { fiche_id: string; box: number; due_at: string };

const DAY_MS = 86400000;

function daysLeft(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function Examens() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [exams, setExams] = useState<Exam[]>([]);
  const [fiches, setFiches] = useState<FicheLite[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [folders, setFolders] = useState<FolderLite[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data: examRows, error: examError } = await supabase
      .from("exams")
      .select("id, title, exam_date, fiche_ids")
      .order("exam_date", { ascending: true });
    if (examError) {
      setStatus("unavailable");
      return;
    }

    const { data: ficheRows } = await supabase.from("fiches").select("id, title, data, folder_id").order("created_at", { ascending: false });
    setFiches(
      (ficheRows ?? []).map((f) => ({
        id: f.id as string,
        title: (f.title as string) || "Fiche sans titre",
        cards: Array.isArray(f.data?.flashcards) ? f.data.flashcards.length : 0,
        folder_id: (f.folder_id as string | null) ?? null,
      }))
    );

    const { data: folderRows } = await supabase.from("folders").select("id, name, color").order("created_at", { ascending: true });
    setFolders((folderRows ?? []) as FolderLite[]);

    const { data: reviewRows } = await supabase.from("card_reviews").select("fiche_id, box, due_at").limit(5000);
    setReviews((reviewRows ?? []) as Review[]);
    setExams((examRows ?? []) as Exam[]);
    setStatus("ready");
  }, [router]);

  useEffect(() => {
    // Chargement au démarrage de la page
    queueMicrotask(load);
  }, [load]);

  const visibleFiches = fiches.filter((f) =>
    folderFilter === "all" ? true : folderFilter === "none" ? !f.folder_id : f.folder_id === folderFilter
  );
  const allVisibleSelected = visibleFiches.length > 0 && visibleFiches.every((f) => selected.includes(f.id));
  const toggleVisible = () =>
    setSelected((cur) =>
      allVisibleSelected
        ? cur.filter((id) => !visibleFiches.some((f) => f.id === id))
        : Array.from(new Set([...cur, ...visibleFiches.map((f) => f.id)]))
    );

  const chip = (active: boolean) =>
    `shrink-0 min-h-[40px] px-4 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
      active ? "bg-black text-white border-transparent" : "bg-white text-black/70 border-black/15 hover:text-black"
    }`;

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Donne un nom à ton examen.");
    if (!date || daysLeft(date) < 0) return setError("Choisis une date à venir.");
    if (selected.length === 0) return setError("Choisis au moins une fiche à réviser.");
    setSaving(true);
    const { error: err } = await createClient().from("exams").insert({ title: title.trim().slice(0, 80), exam_date: date, fiche_ids: selected });
    setSaving(false);
    if (err) return setError("Impossible d'enregistrer. Réessaie.");
    trackEvent("examen_cree", { fiches: selected.length });
    setCreating(false);
    setTitle("");
    setDate("");
    setSelected([]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet examen ? Tes fiches et tes cartes ne sont pas supprimées.")) return;
    const { error: err } = await createClient().from("exams").delete().eq("id", id);
    if (err) return alert("Impossible de supprimer cet examen pour l'instant. Réessaie.");
    setExams((cur) => cur.filter((x) => x.id !== id));
  };

  return (
    <AppShell size="normal">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 ff-fade-up">
        <div>
          <h1 className="ff-title mb-2">Mes examens.</h1>
          <p className="ff-lead">Tu as un examen bientôt ? Donne la date et choisis tes fiches. FishFlow te dit combien de cartes revoir chaque jour.</p>
        </div>
        {status === "ready" && !creating && exams.length > 0 && (
          <button type="button" onClick={() => setCreating(true)} className="ff-primary ff-btn">
            Ajouter un examen
          </button>
        )}
      </div>

      {status === "loading" && <p className="text-black/50 text-sm py-16 text-center" role="status">Chargement...</p>}

      {status === "unavailable" && (
        <div className="bg-surface border border-black/10 rounded-3xl p-8 text-center">
          <p className="font-semibold mb-1">Cette page arrive bientôt.</p>
          <p className="text-sm text-black/60">Elle sera disponible dès que la mise à jour sera terminée.</p>
        </div>
      )}

      {status === "ready" && creating && (
        <form onSubmit={create} className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-8 mb-8 grid gap-5 ff-fade-up">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="exam-title" className="text-sm font-semibold text-black/70">1. Le nom de l&apos;examen</label>
              <input
                id="exam-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Ex : Partiel de droit"
                className="min-h-[48px] px-4 rounded-xl border border-black/15 bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="exam-date" className="text-sm font-semibold text-black/70">2. La date</label>
              <input id="exam-date" type="date" min={new Date().toLocaleDateString("sv-SE")} value={date} onChange={(e) => setDate(e.target.value)} className="min-h-[48px] px-4 rounded-xl border border-black/15 bg-white" />
            </div>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-black/70 mb-1">3. Les fiches à réviser pour cet examen</legend>
            {fiches.length === 0 ? (
              <p className="text-sm text-black/60">
                Tu n&apos;as pas encore de fiche. <Link href="/generer" className="underline underline-offset-4">Crées-en une</Link> d&apos;abord.
              </p>
            ) : (
              <>
              {folders.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par dossier">
                  <button type="button" aria-pressed={folderFilter === "all"} onClick={() => setFolderFilter("all")} className={chip(folderFilter === "all")}>Toutes</button>
                  {folders.map((fo) => (
                    <button key={fo.id} type="button" aria-pressed={folderFilter === fo.id} onClick={() => setFolderFilter(fo.id)} className={`${chip(folderFilter === fo.id)} inline-flex items-center gap-2`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fo.color }} aria-hidden="true" />
                      {fo.name}
                    </button>
                  ))}
                  <button type="button" aria-pressed={folderFilter === "none"} onClick={() => setFolderFilter("none")} className={chip(folderFilter === "none")}>Sans dossier</button>
                </div>
              )}
              {visibleFiches.length > 0 && (
                <button type="button" onClick={toggleVisible} className="justify-self-start text-sm font-semibold underline underline-offset-4 min-h-[44px]">
                  {allVisibleSelected ? "Tout décocher" : folderFilter === "all" ? "Tout cocher" : "Cocher tout ce dossier"}
                </button>
              )}
              {visibleFiches.length === 0 && <p className="text-sm text-black/60">Aucune fiche dans ce dossier.</p>}
              <ul className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                {visibleFiches.map((f) => (
                  <li key={f.id}>
                    <label className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl border border-black/10 bg-white cursor-pointer">
                      <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} className="w-5 h-5 accent-[#22C55E]" />
                      <span className="flex-1 min-w-0 truncate">{f.title}</span>
                      <span className="text-xs text-black/50 shrink-0">{f.cards} cartes</span>
                    </label>
                  </li>
                ))}
              </ul>
              {selected.length > 0 && <p className="text-xs text-black/60" aria-live="polite">{selected.length} fiche{selected.length > 1 ? "s" : ""} choisie{selected.length > 1 ? "s" : ""}</p>}
              </>
            )}
          </fieldset>

          {error && <p className="text-sm text-[var(--quiz-wrong-text)]" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="ff-primary ff-btn">{saving ? "Enregistrement..." : "Enregistrer"}</button>
            <button type="button" onClick={() => { setCreating(false); setError(""); }} className="ff-secondary">Annuler</button>
          </div>
        </form>
      )}

      {status === "ready" && exams.length === 0 && !creating && (
        <div className="bg-surface border border-black/10 rounded-3xl p-8 sm:p-10 text-center grid gap-4 justify-items-center ff-fade-up">
          <p className="font-semibold text-lg">Aucun examen pour l&apos;instant.</p>
          <p className="text-black/60 max-w-[46ch]">Ajoute la date de ton prochain examen et choisis les fiches qui comptent. Ensuite, FishFlow te dit chaque jour combien de cartes revoir, pour être prêt à temps.</p>
          <button type="button" onClick={() => setCreating(true)} className="ff-primary ff-btn">Ajouter mon premier examen</button>
        </div>
      )}

      {status === "ready" && exams.length > 0 && (
        <ul className="grid gap-5 md:grid-cols-2">
          {exams.map((exam, i) => {
            const left = daysLeft(exam.exam_date);
            const ids = new Set(exam.fiche_ids);
            const total = fiches.filter((f) => ids.has(f.id)).reduce((sum, f) => sum + f.cards, 0);
            const mine = reviews.filter((r) => ids.has(r.fiche_id));
            const mastered = mine.filter((r) => r.box >= 4).length;
            const due = mine.filter((r) => new Date(r.due_at).getTime() <= Date.now()).length;
            const remaining = Math.max(0, total - mastered);
            const perDay = left > 0 ? Math.ceil(remaining / left) : remaining;
            const percent = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0;
            const past = left < 0;
            return (
              <li key={exam.id} className="bg-surface border border-black/10 rounded-3xl p-6 grid gap-4 ff-fade-up min-w-0" style={{ animationDelay: `${Math.min(i * 0.06, 0.3)}s` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight break-words">{exam.title}</h2>
                    <p className="text-sm text-black/60 capitalize">{formatDate(exam.exam_date)}</p>
                  </div>
                  <p className="text-right shrink-0">
                    <span className="block text-3xl font-extrabold leading-none">{past ? "—" : left === 0 ? "J" : left}</span>
                    <span className="text-xs text-black/60">{past ? "terminé" : left === 0 ? "aujourd'hui" : left === 1 ? "jour" : "jours"}</span>
                  </p>
                </div>

                <div>
                  <div className="h-2.5 rounded-full bg-black/10 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Cartes connues">
                    <div className="h-full rounded-full bg-[#22C55E] transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-sm text-black/65 mt-2">{mastered} cartes connues sur {total}</p>
                </div>

                {!past && total > 0 && (
                  <p className="text-sm">
                    {remaining === 0 ? (
                      <strong>Tu connais tout. Relis de temps en temps pour ne pas oublier.</strong>
                    ) : (
                      <>
                        <strong>{perDay} carte{perDay > 1 ? "s" : ""} par jour</strong> pour être prêt le jour J{left > 0 ? "" : " maintenant"}.
                      </>
                    )}
                    {due > 0 && <span className="text-black/60"> {due} à revoir aujourd&apos;hui.</span>}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {!past && (
                    <button type="button" onClick={() => router.push(`/reviser?fiches=${exam.fiche_ids.join(",")}`)} className="ff-primary text-sm ff-btn">
                      Réviser pour cet examen
                    </button>
                  )}
                  <button type="button" onClick={() => remove(exam.id)} className="text-sm text-black/55 hover:text-black underline underline-offset-4 min-h-[44px] px-1">
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
