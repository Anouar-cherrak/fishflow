"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type QuizQuestion = { question: string; options: string[]; correctIndex: number };

export function QuizPlayer({
  quiz,
  ficheId,
  currentBestScore,
  onScoreUpdate,
}: {
  quiz: QuizQuestion[];
  ficheId: string;
  currentBestScore: number | null;
  onScoreUpdate: (score: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
  };

  const handleNext = async () => {
    const newAnswers = [...answers, selected!];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < quiz.length) {
      setCurrent(current + 1);
    } else {
      const correctCount = newAnswers.filter((a, i) => a === quiz[i].correctIndex).length;
      const score = Math.round((correctCount / quiz.length) * 100);
      setFinished(true);

      if (ficheId && (currentBestScore === null || score > currentBestScore)) {
        setSaving(true);
        const supabase = createClient();
        await supabase.from("fiches").update({ best_score: score }).eq("id", ficheId);
        setSaving(false);
        onScoreUpdate(score);
      }
    }
  };

  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  if (finished) {
    const correctCount = answers.filter((a, i) => a === quiz[i].correctIndex).length;
    const score = Math.round((correctCount / quiz.length) * 100);
    const mastered = score >= 80;

    return (
      <div className="border border-black/10 rounded-xl p-6 bg-surface text-center">
        <p className="text-3xl font-bold text-black mb-1">{score}%</p>
        <p className="text-[15px] ff-muted mb-4">
          {correctCount} / {quiz.length} bonnes réponses
        </p>
        <p className={`text-sm font-medium mb-4 ${mastered ? "text-accent-strong" : "ff-muted"}`}>
          {mastered ? "Fiche maîtrisée !" : "Continue, tu y es presque."}
        </p>
        {saving && <p className="text-sm ff-muted mb-3" role="status">Enregistrement du score…</p>}
        <button
          type="button"
          onClick={restart}
          className="ff-primary text-sm"
        >
          Refaire le quiz
        </button>
      </div>
    );
  }

  const q = quiz[current];

  return (
    <div className="border border-black/10 rounded-xl p-6 bg-surface">
      <div className="flex items-center justify-between mb-4 gap-2">
        <p className="text-sm font-semibold ff-muted shrink-0">
          Question {current + 1} / {quiz.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1 min-w-0" aria-hidden="true">
          {quiz.map((_, i) => (
            <div
              key={i}
              className={`w-3 sm:w-6 h-1.5 rounded-full shrink-0 ${i <= current ? "bg-accent" : "bg-black/10"}`}
            />
          ))}
        </div>
      </div>

      <p className="text-lg font-semibold leading-snug text-black mb-4">{q.question}</p>

      <div className="space-y-2 mb-5">
        {q.options.map((opt, i) => {
          let style = "bg-white border-black/20 text-black";
          if (selected !== null) {
            if (i === q.correctIndex) {
              style = "bg-[var(--quiz-correct-bg)] border-[var(--quiz-correct-border)] text-[var(--quiz-correct-text)] font-medium";
            } else if (i === selected) {
              style = "bg-[var(--quiz-wrong-bg)] border-[var(--quiz-wrong-border)] text-[var(--quiz-wrong-text)]";
            } else {
              style = "bg-white border-black/10 text-black/60";
            }
          }
          const mark = selected === null ? null : i === q.correctIndex ? "ok" : i === selected ? "ko" : null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full min-h-[52px] text-left px-4 py-3 rounded-xl border text-base transition-colors flex items-center justify-between gap-3 ${style}`}
            >
              <span>{opt}</span>
              {mark && (
                <svg className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {mark === "ok" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
                </svg>
              )}
              {mark && <span className="sr-only">{mark === "ok" ? " (bonne réponse)" : " (ta réponse, fausse)"}</span>}
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className={`text-base font-semibold ${selected !== null ? "mb-4" : "sr-only"}`}>
        {selected === null
          ? ""
          : selected === q.correctIndex
            ? "Bonne réponse !"
            : `Pas tout à fait : la bonne réponse est « ${q.options[q.correctIndex]} ».`}
      </p>

      {selected !== null && (
        <button
          type="button"
          onClick={handleNext}
          className="ff-primary w-full"
        >
          {current + 1 < quiz.length ? "Question suivante" : "Voir mon score"}
        </button>
      )}
    </div>
  );
}