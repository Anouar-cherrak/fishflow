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
      <div className="border border-black/10 rounded-xl p-6 bg-[#F4F4F5] text-center">
        <p className="text-3xl font-bold text-black mb-1">{score}%</p>
        <p className="text-sm text-black/60 mb-4">
          {correctCount} / {quiz.length} bonnes réponses
        </p>
        <p className={`text-sm font-medium mb-4 ${mastered ? "text-[#16A34A]" : "text-black/60"}`}>
          {mastered ? "Fiche maîtrisée !" : "Continue, tu y es presque"}
        </p>
        {saving && <p className="text-xs text-black/30 mb-3">Sauvegarde du score...</p>}
        <button
          onClick={restart}
          className="text-sm px-5 py-2.5 rounded-lg bg-[#22C55E] text-white font-medium hover:bg-[#16A34A] transition ff-btn"
        >
          Refaire le quiz
        </button>
      </div>
    );
  }

  const q = quiz[current];

  return (
    <div className="border border-black/10 rounded-xl p-6 bg-[#F4F4F5]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">
          Question {current + 1} / {quiz.length}
        </p>
        <div className="flex gap-1">
          {quiz.map((_, i) => (
            <div
              key={i}
              className={`w-6 h-1.5 rounded-full ${i <= current ? "bg-[#22C55E]" : "bg-black/10"}`}
            />
          ))}
        </div>
      </div>

      <p className="font-medium text-black mb-4">{q.question}</p>

      <div className="space-y-2 mb-5">
        {q.options.map((opt, i) => {
          let style = "bg-white border-black/10 text-black/80";
          if (selected !== null) {
            if (i === q.correctIndex) {
              style = "bg-[#DCFCE7] border-[#22C55E] text-black font-medium";
            } else if (i === selected) {
              style = "bg-[#FEE2E2] border-[#EF4444] text-black";
            } else {
              style = "bg-white border-black/10 text-black/40";
            }
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button
          onClick={handleNext}
          className="w-full py-2.5 rounded-lg bg-[#22C55E] text-white font-medium hover:bg-[#16A34A] transition ff-btn"
        >
          {current + 1 < quiz.length ? "Question suivante" : "Voir mon score"}
        </button>
      )}
    </div>
  );
}