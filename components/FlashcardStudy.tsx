"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "@/lib/tracking";

type Flashcard = { question: string; answer: string };

// Mode étude des flashcards : on retourne la carte, puis on dit si on la savait.
// Les cartes « à revoir » reviennent dans un nouveau tour, jusqu'à ce que tout soit su.
// À la fin de la première séance, onComplete reçoit le résultat « du premier coup »
// de chaque carte (dans l'ordre de la liste `cards`).
export function FlashcardStudy({
  cards,
  onClose,
  onComplete,
}: {
  cards: Flashcard[];
  onClose: () => void;
  onComplete?: (firstTry: boolean[]) => void;
}) {
  const [deck, setDeck] = useState<number[]>(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const reportedRef = useRef(false);

  const total = cards.length;
  const current = cards[deck[pos]];
  const firstTryKnown = Object.values(firstTry).filter(Boolean).length;

  const answer = (known: boolean) => {
    if (!flipped || done) return;
    const index = deck[pos];
    const nextMissed = known ? missed : [...missed, index];
    if (round === 1) setFirstTry((prev) => ({ ...prev, [index]: known }));
    setFlipped(false);

    if (pos + 1 < deck.length) {
      setMissed(nextMissed);
      setPos(pos + 1);
    } else if (nextMissed.length > 0) {
      setDeck(nextMissed);
      setMissed([]);
      setPos(0);
      setRound((r) => r + 1);
    } else {
      setMissed([]);
      setDone(true);
    }
  };

  const restart = () => {
    setDeck(cards.map((_, i) => i));
    setPos(0);
    setFlipped(false);
    setMissed([]);
    setRound(1);
    setFirstTry({});
    setDone(false);
  };

  useEffect(() => {
    if (!done) return;
    trackEvent("flashcards_terminees", { total, tours: round });
    // Seule la première séance compte pour la révision espacée (« Recommencer » = entraînement).
    if (!reportedRef.current) {
      reportedRef.current = true;
      onComplete?.(cards.map((_, i) => firstTry[i] ?? true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // On bloque le défilement de la page derrière la fenêtre.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Raccourcis clavier : Échap = fermer, Espace = retourner, ← = à revoir, → = je savais.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (done) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowLeft") {
        answer(false);
      } else if (e.key === "ArrowRight") {
        answer(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (typeof document === "undefined") return null;

  const progress = done ? 100 : Math.round((pos / deck.length) * 100);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-[#000000]/50 backdrop-blur-sm flex items-center justify-center px-4 ff-fade"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface rounded-2xl p-5 ff-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Étudier les flashcards"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {done ? "Terminé" : round === 1 ? `Carte ${pos + 1} / ${deck.length}` : `Tour ${round} · carte ${pos + 1} / ${deck.length}`}
          </p>
          <button
            onClick={onClose}
            className="text-black/30 hover:text-black text-xl leading-none"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-[#22C55E] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-black mb-1">
              {firstTryKnown} / {total}
            </p>
            <p className="text-sm text-black/60 mb-1">sues du premier coup</p>
            <p className="text-xs text-black/40 mb-6">
              {round > 1 ? `Tu as tout su en ${round} tours.` : "Tu as tout su du premier coup."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={restart}
                className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm font-medium text-black hover:bg-white transition"
              >
                Recommencer
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-[#22C55E] text-[#ffffff] text-sm font-medium hover:bg-[#16A34A] transition ff-btn"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="w-full min-h-[220px] bg-white border border-black/10 rounded-xl p-6 text-left flex flex-col justify-between hover:border-black/25 transition"
              aria-label={flipped ? "Voir la question" : "Voir la réponse"}
            >
              <span className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                {flipped ? "Réponse" : "Question"}
              </span>
              <span className={`my-4 ${flipped ? "text-black/80" : "text-black font-medium text-lg"}`}>
                {flipped ? current.answer : current.question}
              </span>
              <span className="text-xs text-black/30">{flipped ? "Touche pour revoir la question" : "Touche pour voir la réponse"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => answer(false)}
                disabled={!flipped}
                className="py-3 rounded-lg border border-black/15 text-sm font-medium text-black hover:bg-white transition disabled:opacity-30 disabled:hover:bg-transparent"
              >
                À revoir
              </button>
              <button
                onClick={() => answer(true)}
                disabled={!flipped}
                className="py-3 rounded-lg bg-[#22C55E] text-[#ffffff] text-sm font-medium hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
              >
                Je savais
              </button>
            </div>

            <p className="hidden sm:block text-center text-xs text-black/30 mt-3">
              Espace : retourner · ← à revoir · → je savais · Échap : fermer
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
