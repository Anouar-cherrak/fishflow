"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppNav } from "@/components/AppNav";
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

  return (
    <>
    <AppNav />
    <main className="min-h-screen bg-white text-black px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-4 ff-fade-up">
          <h1 className="text-xl font-semibold">Réviser</h1>
          <Link href="/mes-fiches" className="text-sm text-black/60 hover:text-black transition ff-link-underline">
            ← Mes fiches
          </Link>
        </div>

        {progress && progress.tracked > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6 ff-fade-up">
            {[
              { label: "jours d'affilée", value: progress.streak },
              { label: "cartes maîtrisées", value: progress.mastered },
              { label: "cartes suivies", value: progress.tracked },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-black/10 rounded-xl p-3 text-center ff-card">
                <p className="text-2xl font-bold text-black">{s.value}</p>
                <p className="text-xs text-black/50">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {status === "loading" && <p className="text-black/40 text-sm">Chargement...</p>}

        {status === "empty" && !finished && (
          <div className="bg-white border border-black/10 rounded-2xl p-10 text-center ff-fade-up ff-card">
            <p className="text-black font-medium mb-2">Rien à réviser pour l'instant.</p>
            <p className="text-black/50 text-sm mb-5">
              Étudie les flashcards d'une fiche : les cartes reviendront ici au bon moment, pour que tu les retiennes.
            </p>
            <button
              onClick={() => router.push("/mes-fiches")}
              className="px-4 py-2 rounded-lg font-medium bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition ff-btn"
            >
              Voir mes fiches
            </button>
          </div>
        )}

        {status === "ready" && !finished && (
          <div className="bg-white border border-black/10 rounded-2xl p-8 text-center ff-fade-up ff-card">
            <p className="text-4xl font-bold text-black mb-1">{dueTotal}</p>
            <p className="text-black/60 mb-1">carte{dueTotal > 1 ? "s" : ""} à réviser</p>
            {dueTotal > cards.length && (
              <p className="text-xs text-black/40 mb-5">On commence par les {cards.length} plus urgentes.</p>
            )}
            {dueTotal <= cards.length && <div className="mb-5" />}
            <button
              onClick={() => {
                trackEvent("revision_commencee", { cartes: cards.length });
                setStudying(true);
              }}
              className="px-6 py-3 rounded-xl font-display font-semibold bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition ff-btn"
            >
              Commencer
            </button>
          </div>
        )}

        {finished && (
          <div className="bg-white border border-black/10 rounded-2xl p-10 text-center ff-fade-up ff-card">
            <p className="text-black font-medium mb-2">Séance terminée.</p>
            <p className="text-black/50 text-sm mb-5">
              Les cartes que tu connais reviendront plus tard, celles à revoir demain. Reviens quand il y en a de nouvelles.
            </p>
            <button
              onClick={() => router.push("/mes-fiches")}
              className="px-4 py-2 rounded-lg font-medium bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition ff-btn"
            >
              Retour à mes fiches
            </button>
          </div>
        )}
      </div>

      {studying && cards.length > 0 && (
        <FlashcardStudy cards={cards} onClose={() => setStudying(false)} onComplete={handleComplete} />
      )}
    </main>
    </>
  );
}
