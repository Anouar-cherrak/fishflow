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

      const { data: dueRows, count, error } = await supabase
        .from("card_reviews")
        .select("fiche_id, card_index", { count: "exact" })
        .lte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(SESSION_SIZE);

      if (error || !dueRows || dueRows.length === 0) {
        setStatus("empty");
        return;
      }

      const ficheIds = Array.from(new Set(dueRows.map((r) => r.fiche_id as string)));
      const { data: fiches } = await supabase.from("fiches").select("id, data").in("id", ficheIds);

      const flashcardsByFiche = new Map<string, { question: string; answer: string }[]>();
      for (const fiche of fiches ?? []) {
        const list = fiche.data?.flashcards;
        if (Array.isArray(list)) flashcardsByFiche.set(fiche.id as string, list);
      }

      const due: DueCard[] = [];
      for (const row of dueRows) {
        const card = flashcardsByFiche.get(row.fiche_id as string)?.[row.card_index as number];
        if (card?.question && card?.answer) {
          due.push({
            question: card.question,
            answer: card.answer,
            ficheId: row.fiche_id as string,
            cardIndex: row.card_index as number,
          });
        }
      }

      if (due.length === 0) {
        setStatus("empty");
        return;
      }

      setCards(due);
      setDueTotal(count ?? due.length);
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
        { label: "jours d'affilée", value: progress.streak },
        { label: "cartes maîtrisées", value: progress.mastered },
        { label: "cartes suivies", value: progress.tracked },
      ]
    : null;

  return (
    <AppShell size="normal">
      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-3">Réviser.</h1>
        <p className="ff-lead">Tes cartes reviennent au bon moment : vite si tu les rates, plus tard si tu les sais.</p>
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
                Étudie les flashcards d&apos;une fiche : les cartes reviendront ici au bon moment, pour que tu les retiennes.
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
                <p className="text-sm text-black/50 mb-6">On commence par les {cards.length} plus urgentes.</p>
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
          <h2 className="text-xl font-bold tracking-tight mb-2">Comment ça marche</h2>
          <p className="text-black/60 mb-6 text-sm sm:text-base">
            Chaque carte monte d&apos;une case quand tu la sais, et redescend quand tu la rates. Plus la case est haute, plus elle revient tard.
          </p>
          <ol className="ff-boxes" aria-label="Les cinq cases et leur délai">
            {["1 jour", "3 jours", "7 jours", "14 jours", "30 jours"].map((d, i) => (
              <li key={d} style={{ ["--i" as string]: i }}>
                <span className="ff-box-card" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-semibold">{d}</span>
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
