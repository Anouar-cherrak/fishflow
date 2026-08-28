"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { Logo, Wordmark } from "@/components/Logo";
import { trackEvent } from "@/lib/tracking";

type Flashcard = { question: string; answer: string };
type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

type FishFlowResult = {
  sourceText?: string;
  summary?: string;
  sheet?: string[];
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
};

type Settings = { difficulty: string; length: string };

export default function Result() {
  const [data, setData] = useState<FishFlowResult | null>(null);
  const [settings, setSettings] = useState<Settings>({ difficulty: "moyen", length: "moyen" });
  const [downloading, setDownloading] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);

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
    if (stored) setData(JSON.parse(stored));

    const storedSettings = localStorage.getItem("fishflow_settings");
    if (storedSettings) setSettings(JSON.parse(storedSettings));
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

      if (data?.summary !== undefined && summaryRef.current) {
        blocks.push(summaryRef.current);
      }

      if (data?.sheet !== undefined) {
        if (sheetHeaderRef.current) blocks.push(sheetHeaderRef.current);
        sheetItemRefs.current.forEach((el) => el && blocks.push(el));
      }

      if (data?.flashcards !== undefined) {
        if (flashcardsHeaderRef.current) blocks.push(flashcardsHeaderRef.current);
        flashcardItemRefs.current.forEach((el) => el && blocks.push(el));
      }

      if (data?.quiz !== undefined) {
        if (quizHeaderRef.current) blocks.push(quizHeaderRef.current);
        quizItemRefs.current.forEach((el) => el && blocks.push(el));
      }

      for (const block of blocks) {
        const canvas = await html2canvas(block, {
          backgroundColor: "#ffffff",
          scale: 2,
        });

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
      <main className="min-h-screen flex items-center justify-center bg-[#F7F5FC] text-[#1E1533] px-4">
        <p className="text-[#1E1533]/50">Aucun résultat trouvé. Retourne à l'accueil pour en générer un.</p>
      </main>
    );
  }

  const RegenButton = ({ sectionKey }: { sectionKey: "summary" | "sheet" | "flashcards" | "quiz" }) => (
    <button
      onClick={() => regenerateSection(sectionKey)}
      disabled={!data.sourceText || regeneratingKey === sectionKey}
      className="flex items-center gap-1.5 text-xs text-[#6D28D9] font-medium hover:underline disabled:opacity-50 disabled:no-underline"
    >
      {regeneratingKey === sectionKey ? (
        <>
          <span className="w-3 h-3 border-2 border-[#6D28D9]/25 border-t-[#6D28D9] rounded-full animate-spin" />
          Régénération...
        </>
      ) : (
        "🔄 Régénérer"
      )}
    </button>
  );

  const sectionOpacity = (key: string) =>
    regeneratingKey === key ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity";

  return (
    <main className="min-h-screen bg-[#F7F5FC] text-[#1E1533] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <button onClick={handleClear} className="text-sm text-[#1E1533]/30 hover:text-red-500 transition">
            🗑️ Effacer cette fiche
          </button>
          <button
            onClick={() => router.push("/generer")}
            className="text-sm text-[#1E1533]/60 hover:text-[#1E1533] font-medium transition"
          >
            ← Nouveau document
          </button>
        </div>

        <div ref={logoRef} className="bg-white rounded-t-2xl border border-[#6D28D9]/10 border-b-0 px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <Wordmark className="text-lg" />
          </div>
          <p className="text-[#1E1533]/50 text-sm mt-1">Ta fiche de révision générée</p>
        </div>

        <div className="h-1 bg-white border-x border-[#6D28D9]/10" />
        <div className="h-4" />

        {data.summary !== undefined && (
          <div ref={summaryRef} className={`pb-6 ${sectionOpacity("summary")}`}>
            <section className="bg-white rounded-xl shadow-sm border border-[#6D28D9]/10 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-[#1E1533] flex items-center gap-2">📝 Résumé</h2>
                <RegenButton sectionKey="summary" />
              </div>
              <p className="text-[#1E1533]/70 leading-relaxed">{data.summary}</p>
            </section>
          </div>
        )}

        {data.sheet !== undefined && (
          <div className={`pb-6 ${sectionOpacity("sheet")}`}>
            <div ref={sheetHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-[#6D28D9]/10 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1E1533] flex items-center gap-2">📌 Fiche de révision</h2>
                <RegenButton sectionKey="sheet" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-[#6D28D9]/10 rounded-b-xl p-6 pt-2 space-y-2">
              {data.sheet.map((point, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    sheetItemRefs.current[i] = el;
                  }}
                  className="bg-[#F7F5FC] rounded-lg border border-[#6D28D9]/10 p-3 flex gap-2"
                >
                  <span className="text-[#6D28D9] font-bold">•</span>
                  <span className="text-[#1E1533]/70">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.flashcards !== undefined && (
          <div className={`pb-6 ${sectionOpacity("flashcards")}`}>
            <div ref={flashcardsHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-[#6D28D9]/10 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1E1533] flex items-center gap-2">🎴 Flashcards</h2>
                <RegenButton sectionKey="flashcards" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-[#6D28D9]/10 rounded-b-xl p-6 pt-2 grid gap-3">
              {data.flashcards.map((card, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    flashcardItemRefs.current[i] = el;
                  }}
                  className="border border-[#6D28D9]/10 rounded-lg p-4 bg-[#F7F5FC]"
                >
                  <p className="font-medium text-[#1E1533] mb-1">{i + 1}. {card.question}</p>
                  <p className="text-[#1E1533]/60 text-sm">{card.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.quiz !== undefined && (
          <div className={`pb-6 ${sectionOpacity("quiz")}`}>
            <div ref={quizHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-[#6D28D9]/10 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1E1533] flex items-center gap-2">❓ Quiz</h2>
                <RegenButton sectionKey="quiz" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-[#6D28D9]/10 rounded-b-xl p-6 pt-2 space-y-3">
              {data.quiz.map((q, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    quizItemRefs.current[i] = el;
                  }}
                  className="border border-[#6D28D9]/10 rounded-lg p-4 bg-[#F7F5FC]"
                >
                  <p className="font-medium text-[#1E1533] mb-3">{i + 1}. {q.question}</p>
                  <ul className="space-y-2">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className={`px-3 py-2 rounded-md text-sm ${
                          j === q.correctIndex
                            ? "bg-[#EFEBF7] text-[#6D28D9] font-semibold border border-[#6D28D9]/25"
                            : "bg-white text-[#1E1533]/70 border border-[#6D28D9]/10"
                        }`}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="mt-2 px-6 py-3 rounded-xl font-display font-semibold bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition w-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#6D28D9]/20"
        >
          {downloading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Génération du PDF...
            </>
          ) : (
            "📥 Télécharger en PDF"
          )}
        </button>
      </div>
    </main>
  );
}