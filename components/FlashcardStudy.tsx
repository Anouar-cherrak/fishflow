"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "@/lib/tracking";
import { getStreak, REVIEWED_EVENT } from "@/lib/reviews";
import { FlameIcon, flameState } from "@/components/StreakFlame";

type Flashcard = { question: string; answer: string };

// Mode étude des flashcards : on retourne la carte, puis on dit si on la savait.
// Les cartes « à revoir » reviennent dans un nouveau tour, jusqu'à ce que tout soit su.
// À la fin de la première séance, onComplete reçoit le résultat « du premier coup »
// de chaque carte (dans l'ordre de la liste `cards`).
export function FlashcardStudy({
  cards,
  onClose,
  onComplete,
  onPartial,
}: {
  cards: Flashcard[];
  onClose: () => void;
  onComplete?: (firstTry: boolean[]) => void;
  // Fermeture avant la fin : on garde quand même les cartes déjà répondues (index dans `cards`).
  onPartial?: (answered: { index: number; correct: boolean }[]) => void;
}) {
  const [deck, setDeck] = useState<number[]>(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const reportedRef = useRef(false);
  const [streak, setStreak] = useState<{ streak: number; activeToday: boolean } | null>(null);

  const close = () => {
    const answered = Object.entries(firstTry).map(([i, correct]) => ({ index: Number(i), correct }));
    if (!reportedRef.current && answered.length > 0) {
      reportedRef.current = true;
      onPartial?.(answered);
    }
    onClose();
  };

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

  // Bilan : une fois la séance enregistrée, on relit la série pour allumer la flamme.
  useEffect(() => {
    if (!done || !onComplete) return;
    let cancelled = false;
    const load = () => getStreak().then((st) => !cancelled && setStreak(st));
    window.addEventListener(REVIEWED_EVENT, load);
    const fallback = setTimeout(load, 2500);
    return () => {
      cancelled = true;
      window.removeEventListener(REVIEWED_EVENT, load);
      clearTimeout(fallback);
    };
  }, [done, onComplete]);

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
        close();
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
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-surface rounded-2xl p-5 ff-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Étudier les flashcards"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {done ? "Terminé" : round === 1 ? `Carte ${pos + 1} / ${deck.length}` : `Tour ${round} · carte ${pos + 1} / ${deck.length}`}
          </p>
          <button
            onClick={close}
            className="w-11 h-11 -mr-2 -my-2 flex items-center justify-center rounded-full text-black/50 hover:text-black text-xl leading-none"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-[#22C55E] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {done ? (
          <div className="text-center py-2" role="status">
            <p className="text-4xl font-extrabold text-black mb-1 tabular-nums">
              {firstTryKnown} / {total}
            </p>
            <p className="text-sm text-black/60 mb-3">réussies du premier coup</p>
            <p className="font-semibold text-black mb-4">
              {firstTryKnown / total >= 0.9
                ? "Excellent, tu maîtrises ces cartes !"
                : firstTryKnown / total >= 0.6
                  ? "Bien joué, encore un petit effort."
                  : "C'est en revoyant qu'on retient. Tu vas y arriver."}
            </p>
            <ul className="grid gap-2 text-sm text-left bg-white border border-black/10 rounded-xl p-4 mb-4">
              <li className="flex justify-between gap-3">
                <span className="text-black/65">Reviendront demain</span>
                <strong className="tabular-nums">{total - firstTryKnown}</strong>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-black/65">Reviendront plus tard</span>
                <strong className="tabular-nums">{firstTryKnown}</strong>
              </li>
              {round > 1 && (
                <li className="flex justify-between gap-3">
                  <span className="text-black/65">Tours pour tout savoir</span>
                  <strong className="tabular-nums">{round}</strong>
                </li>
              )}
            </ul>
            {streak && streak.streak > 0 && (
              <div className="flex items-center justify-center gap-3 mb-5 ff-fade">
                <FlameIcon state={flameState(streak.streak, streak.activeToday)} size={30} pop />
                <p className="text-left">
                  <strong className="block text-lg leading-tight">
                    {streak.streak} jour{streak.streak > 1 ? "s" : ""} d'affilée
                  </strong>
                  <span className="text-xs text-black/60">Reviens demain pour garder ta flamme allumée.</span>
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={restart}
                className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm font-medium text-black hover:bg-white transition"
              >
                Recommencer
              </button>
              <button
                onClick={close}
                className="flex-1 py-2.5 rounded-full bg-[#22C55E] text-[#04130A] text-sm font-semibold hover:bg-[#16A34A] transition ff-btn"
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
                className="py-3 rounded-full bg-[#22C55E] text-[#04130A] text-sm font-semibold hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
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
