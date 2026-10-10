"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { FlashcardStudy } from "@/components/FlashcardStudy";
import { recordReviewResults, getProgress, type Progress } from "@/lib/reviews";
import { trackEvent } from "@/lib/tracking";

type DueCard = {
  question: string;
  answer: string;
  ficheId: string;
  cardIndex: number;
};

// Une séance = au maximum 20 cartes, pour que ça reste court et facile à faire chaque jour.
const SESSION_SIZE = 20;

export default function Reviser() {
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [cards, setCards] = useState<DueCard[]>([]);
  const [dueTotal, setDueTotal] = useState(0);
  const [studying, setStudying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      getProgress().then(setProgress);

      // Depuis « Examens » : on ne révise que les fiches de cet examen.
      const only = (new URLSearchParams(window.location.search).get("fiches") ?? "")
        .split(",")
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id));

      let query = supabase
        .from("card_reviews")
        .select("fiche_id, card_index", { count: "exact" })
        .lte("due_at", new Date().toISOString());
      if (only.length > 0) query = query.in("fiche_id", only);
      const { data: dueData, count, error } = await query.order("due_at", { ascending: true }).limit(SESSION_SIZE);
      if (error) {
        setStatus("empty");
        return;
      }
      const dueRows: { fiche_id: string; card_index: number }[] = (dueData ?? []) as { fiche_id: string; card_index: number }[];

      // Pour un examen, les cartes jamais étudiées comptent aussi : elles arrivent après celles à revoir.
      let newRows: { fiche_id: string; card_index: number }[] = [];
      let ficheSource = dueRows.map((r) => r.fiche_id);
      if (only.length > 0) {
        const { data: tracked } = await supabase.from("card_reviews").select("fiche_id, card_index").in("fiche_id", only);
        const seen = new Set((tracked ?? []).map((r) => `${r.fiche_id}:${r.card_index}`));
        const { data: examFiches } = await supabase.from("fiches").select("id, data").in("id", only);
        for (const f of examFiches ?? []) {
          const total = Array.isArray(f.data?.flashcards) ? f.data.flashcards.length : 0;
          for (let i = 0; i < total; i++) if (!seen.has(`${f.id}:${i}`)) newRows.push({ fiche_id: f.id as string, card_index: i });
        }
        newRows = newRows.slice(0, Math.max(0, SESSION_SIZE - dueRows.length));
        ficheSource = [...ficheSource, ...newRows.map((r) => r.fiche_id)];
      }

      const allRows = [...dueRows, ...newRows];
      if (allRows.length === 0) {
        setStatus("empty");
        return;
      }

      const ficheIds = Array.from(new Set(ficheSource));
      const { data: fiches } = await supabase.from("fiches").select("id, data").in("id", ficheIds);

      const flashcardsByFiche = new Map<string, { question: string; answer: string }[]>();
      for (const fiche of fiches ?? []) {
        const list = fiche.data?.flashcards;
        if (Array.isArray(list)) flashcardsByFiche.set(fiche.id as string, list);
      }

      const due: DueCard[] = [];
      for (const row of allRows) {
        const card = flashcardsByFiche.get(row.fiche_id)?.[row.card_index];
        if (card?.question && card?.answer) {
          due.push({
            question: card.question,
            answer: card.answer,
            ficheId: row.fiche_id,
            cardIndex: row.card_index,
          });
        }
      }

      if (due.length === 0) {
        setStatus("empty");
        return;
      }

      setCards(due);
      setDueTotal((count ?? dueRows.length) + newRows.length);
      setStatus("ready");
    };

    load();
  }, [router]);

  const handleComplete = (firstTry: boolean[]) => {
    trackEvent("revision_terminee", { cartes: cards.length });
    recordReviewResults(
      firstTry.map((correct, i) => ({
        ficheId: cards[i].ficheId,
        cardIndex: cards[i].cardIndex,
        correct,
      }))
    );
    setFinished(true);
    setTimeout(() => getProgress().then(setProgress), 800);
  };

  const stats = progress && progress.tracked > 0
    ? [
        { label: "jours de suite", value: progress.streak },
        { label: "cartes connues", value: progress.mastered },
        { label: "cartes en cours", value: progress.tracked },
      ]
    : null;

  return (
    <AppShell size="normal">
      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-3">Réviser.</h1>
        <p className="ff-lead">Chaque jour, tu revois les cartes qu'il faut revoir. Tu réponds, et FishFlow décide quand te les remontrer.</p>
      </div>

      {stats && (
        <ul className="grid grid-cols-3 gap-3 sm:gap-5 mb-8 ff-fade-up" aria-label="Ta progression">
          {stats.map((st) => (
            <li key={st.label} className="bg-surface border border-black/10 rounded-3xl p-4 sm:p-6 ff-card">
              <p className="text-3xl sm:text-5xl font-extrabold tracking-tight text-black">{st.value}</p>
              <p className="text-xs sm:text-sm text-black/60 mt-1">{st.label}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-stretch">
        <section aria-live="polite" className="bg-surface border border-black/10 rounded-3xl p-7 sm:p-10 flex flex-col justify-center ff-fade-up">
          {status === "loading" && <p className="text-black/50">Chargement...</p>}

          {status === "empty" && !finished && (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Rien à réviser pour l&apos;instant.</h2>
              <p className="text-black/60 mb-6 max-w-[48ch]">
                C&apos;est normal si tu viens d&apos;arriver. Ouvre une fiche et fais ses flashcards une première fois : ensuite, elles reviendront ici toutes seules, au bon moment.
              </p>
              <div>
                <button type="button" onClick={() => router.push("/mes-fiches")} className="ff-primary ff-btn">
                  Voir mes fiches
                </button>
              </div>
            </>
          )}

          {status === "ready" && !finished && (
            <>
              <p className="text-6xl sm:text-7xl font-extrabold tracking-tight text-black">{dueTotal}</p>
              <p className="text-black/70 text-lg mt-1 mb-2">carte{dueTotal > 1 ? "s" : ""} à réviser aujourd&apos;hui</p>
              {dueTotal > cards.length ? (
                <p className="text-sm text-black/50 mb-6">On commence par les {cards.length} plus urgentes. Le reste, ce sera pour demain.</p>
              ) : (
                <div className="mb-6" />
              )}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("revision_commencee", { cartes: cards.length });
                    setStudying(true);
                  }}
                  className="ff-primary ff-btn"
                >
                  Commencer
                </button>
              </div>
            </>
          )}

          {finished && (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Séance terminée.</h2>
              <p className="text-black/60 mb-6 max-w-[48ch]">
                Les cartes que tu connais reviendront plus tard, celles à revoir demain. Reviens quand il y en a de nouvelles.
              </p>
              <div>
                <button type="button" onClick={() => router.push("/mes-fiches")} className="ff-primary ff-btn">
                  Retour à mes fiches
                </button>
              </div>
            </>
          )}
        </section>

        <section aria-label="Comment ça marche" className="border border-black/10 rounded-3xl p-7 sm:p-10 ff-fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-bold tracking-tight mb-4">Comment ça marche</h2>
          <ol className="grid gap-4">
            {[
              ["Tu lis la question", "Réponds dans ta tête, sans regarder."],
              ["Tu retournes la carte", "Puis tu dis si tu savais ou pas."],
              ["FishFlow s'occupe du reste", "Une carte que tu connais revient plus tard (jusqu'à 30 jours). Une carte ratée revient demain."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full border border-black/20 flex items-center justify-center text-sm font-bold" aria-hidden="true">{i + 1}</span>
                <span>
                  <strong className="block">{t}</strong>
                  <span className="text-black/60 text-sm">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {studying && cards.length > 0 && (
        <FlashcardStudy cards={cards} onClose={() => setStudying(false)} onComplete={handleComplete} />
      )}
    </AppShell>
  );
}
