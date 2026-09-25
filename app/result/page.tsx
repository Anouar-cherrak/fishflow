"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { Logo, Wordmark } from "@/components/Logo";
import { trackEvent } from "@/lib/tracking";
import { QuizPlayer } from "@/components/QuizPlayer";

type Flashcard = { question: string; answer: string };
type QuizQuestion = { question: string; options: string[]; correctIndex: number };

type FishFlowResult = {
  id?: string;
  sourceText?: string;
  summary?: string;
  sheet?: string[];
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  best_score?: number | null;
};

type Settings = { difficulty: string; length: string };

export default function Result() {
  const [data, setData] = useState<FishFlowResult | null>(null);
  const [settings, setSettings] = useState<Settings>({ difficulty: "moyen", length: "moyen" });
  const [downloading, setDownloading] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [ficheId, setFicheId] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const sheetHeaderRef = useRef<HTMLDivElement>(null);
  const sheetItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flashcardsHeaderRef = useRef<HTMLDivElement>(null);
  const flashcardItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const quizHeaderRef = useRef<HTMLDivElement>(null);
  const quizItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("fishflow_result");
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      setBestScore(parsed.best_score ?? null);
      if (parsed.id) setFicheId(parsed.id);
    }
    const storedSettings = localStorage.getItem("fishflow_settings");
    if (storedSettings) setSettings(JSON.parse(storedSettings));

    const checkPro = async () => {
      try {
        const res = await fetch("/api/usage");
        const usageData = await res.json();
        setIsPro(!!usageData.isPro);
      } catch {}
    };
    checkPro();

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const regenerateSection = async (key: "summary" | "sheet" | "flashcards" | "quiz") => {
    if (!data?.sourceText) return;
    setRegeneratingKey(key);
    try {
      const formData = new FormData();
      formData.append("mode", "text");
      formData.append("text", data.sourceText.slice(0, 15000));
      formData.append("outputs", key);
      formData.append("difficulty", settings.difficulty);
      formData.append("length", settings.length);

      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const newData = await res.json();

      if (!res.ok) {
        alert(newData.error || "Erreur pendant la régénération.");
        return;
      }

      const updated = { ...data, [key]: newData[key] };
      setData(updated);
      localStorage.setItem("fishflow_result", JSON.stringify(updated));
    } catch (err) {
      alert("Erreur de connexion pendant la régénération. Réessaie.");
    } finally {
      setRegeneratingKey(null);
    }
  };

  const toggleSpeak = () => {
    if (!data?.summary) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(data.summary);
    utterance.lang = "fr-FR";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      let cursorY = margin;

      const blocks: HTMLDivElement[] = [];
      if (logoRef.current) blocks.push(logoRef.current);
      if (data?.summary !== undefined && summaryRef.current) blocks.push(summaryRef.current);
      if (data?.sheet !== undefined) {
        if (sheetHeaderRef.current) blocks.push(sheetHeaderRef.current);
        sheetItemRefs.current.forEach((el) => el && blocks.push(el));
      }
      if (data?.flashcards !== undefined) {
        if (flashcardsHeaderRef.current) blocks.push(flashcardsHeaderRef.current);
        flashcardItemRefs.current.forEach((el) => el && blocks.push(el));
      }
      if (data?.quiz !== undefined && !isPro) {
        if (quizHeaderRef.current) blocks.push(quizHeaderRef.current);
        quizItemRefs.current.forEach((el) => el && blocks.push(el));
      }

      for (const block of blocks) {
        const canvas = await html2canvas(block, { backgroundColor: "#ffffff", scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (cursorY + imgHeight > pageHeight - margin && cursorY > margin) {
          pdf.addPage();
          cursorY = margin;
        }

        pdf.addImage(imgData, "PNG", margin, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 4;
      }

      pdf.save("fishflow-fiche.pdf");
      trackEvent("fiche_telechargee");
    } catch (err) {
      console.error(err);
      alert("Erreur pendant la génération du PDF. Réessaie.");
    } finally {
      setDownloading(false);
    }
  };

  const handleClear = () => {
    if (!confirm("Effacer cette fiche ? Cette action est irréversible.")) return;
    localStorage.removeItem("fishflow_result");
    localStorage.removeItem("fishflow_settings");
    router.push("/generer");
  };

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-black px-4">
        <p className="text-black/50">Aucun résultat trouvé. Retourne à l'accueil pour en générer un.</p>
      </main>
    );
  }

  const RegenButton = ({ sectionKey }: { sectionKey: "summary" | "sheet" | "flashcards" | "quiz" }) => (
    <button
      onClick={() => regenerateSection(sectionKey)}
      disabled={!data.sourceText || regeneratingKey === sectionKey}
      className="flex items-center gap-1.5 text-xs text-black font-medium hover:underline disabled:opacity-50 disabled:no-underline"
    >
      {regeneratingKey === sectionKey ? (
        <>
          <span className="w-3 h-3 border-2 border-black/25 border-t-black rounded-full animate-spin" />
          Régénération...
        </>
      ) : (
        "Régénérer"
      )}
    </button>
  );

  const sectionOpacity = (key: string) =>
    regeneratingKey === key ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity";

  return (
    <main className="min-h-screen bg-white text-black py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <button onClick={handleClear} className="text-sm text-black/30 hover:text-black transition ff-link-underline">
            Effacer cette fiche
          </button>
          <button onClick={() => router.push("/generer")} className="text-sm text-black/60 hover:text-black font-medium transition ff-link-underline">
            ← Nouveau document
          </button>
        </div>

        <div ref={logoRef} className="bg-white rounded-t-2xl border border-black/10 border-b-0 px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <Wordmark className="text-lg" />
          </div>
          <p className="text-black/50 text-sm mt-1">Ta fiche de révision générée</p>
        </div>

        <div className="h-1 bg-white border-x border-black/10" />
        <div className="h-4" />

        {data.summary !== undefined && (
          <div ref={summaryRef} className={`pb-6 ${sectionOpacity("summary")}`}>
            <section className="bg-white rounded-xl shadow-sm border border-black/10 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-black">Résumé</h2>
                <div className="flex items-center gap-3">
                  {isPro && (
                    <button
                      onClick={toggleSpeak}
                      className="text-xs text-[#22C55E] font-medium hover:underline"
                    >
                      {isSpeaking ? "Arrêter" : "Écouter"}
                    </button>
                  )}
                  <RegenButton sectionKey="summary" />
                </div>
              </div>
              <p className="text-black/70 leading-relaxed">{data.summary}</p>
            </section>
          </div>
        )}

        {data.sheet !== undefined && (
          <div className={`pb-6 ${sectionOpacity("sheet")}`}>
            <div ref={sheetHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-black/10 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black">Fiche de révision</h2>
                <RegenButton sectionKey="sheet" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-black/10 rounded-b-xl p-6 pt-2 space-y-2">
              {data.sheet.map((point, i) => (
                <div key={i} ref={(el) => { sheetItemRefs.current[i] = el; }} className="bg-surface rounded-lg border border-black/10 p-3 flex gap-2">
                  <span className="text-black font-bold">•</span>
                  <span className="text-black/70">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.flashcards !== undefined && (
          <div className={`pb-6 ${sectionOpacity("flashcards")}`}>
            <div ref={flashcardsHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-black/10 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black">Flashcards</h2>
                <RegenButton sectionKey="flashcards" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-black/10 rounded-b-xl p-6 pt-2 grid gap-3">
              {data.flashcards.map((card, i) => (
                <div key={i} ref={(el) => { flashcardItemRefs.current[i] = el; }} className="border border-black/10 rounded-lg p-4 bg-surface">
                  <p className="font-medium text-black mb-1">{i + 1}. {card.question}</p>
                  <p className="text-black/60 text-sm">{card.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.quiz !== undefined && (
          <div className={`pb-6 ${sectionOpacity("quiz")}`}>
            <div ref={quizHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-black/10 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-black">Quiz</h2>
                <RegenButton sectionKey="quiz" />
              </div>
              {isPro && bestScore !== null && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-black/50">
                      {bestScore >= 80 ? "Fiche maîtrisée" : "Meilleur score"}
                    </span>
                    <span className="text-xs font-semibold text-black">{bestScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${bestScore >= 80 ? "bg-[#22C55E]" : "bg-black/40"}`}
                      style={{ width: `${bestScore}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white border-x border-b border-black/10 rounded-b-xl p-6 pt-2">
              {isPro ? (
                <QuizPlayer
                  quiz={data.quiz}
                  ficheId={ficheId}
                  currentBestScore={bestScore}
                  onScoreUpdate={setBestScore}
                />
              ) : (
                <div className="space-y-3">
                  {data.quiz.map((q, i) => (
                    <div key={i} ref={(el) => { quizItemRefs.current[i] = el; }} className="border border-black/10 rounded-lg p-4 bg-surface">
                      <p className="font-medium text-black mb-3">{i + 1}. {q.question}</p>
                      <ul className="space-y-2">
                        {q.options.map((opt, j) => (
                          <li
                            key={j}
                            className={`px-3 py-2 rounded-md text-sm ${
                              j === q.correctIndex
                                ? "bg-[#111111] text-[#ffffff] font-semibold"
                                : "bg-white text-black/70 border border-black/10"
                            }`}
                          >
                            {opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <p className="text-xs text-black/40 mb-2">Passe Pro pour jouer le quiz et suivre ta progression</p>
                    <button
                      onClick={() => router.push("/pricing")}
                      className="text-sm px-4 py-2 rounded-lg bg-[#22C55E] text-[#ffffff] font-medium hover:bg-[#16A34A] transition ff-btn"
                    >
                      Découvrir FishFlow Pro
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="mt-2 px-6 py-3 rounded-xl font-display font-semibold bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition w-full disabled:opacity-50 flex items-center justify-center gap-2 ff-btn"
        >
          {downloading ? (
            <>
              <span className="w-4 h-4 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full animate-spin" />
              Génération du PDF...
            </>
          ) : (
            "Télécharger en PDF"
          )}
        </button>
      </div>
    </main>
  );
}