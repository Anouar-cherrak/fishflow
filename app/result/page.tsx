"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { Logo, Wordmark } from "@/components/Logo";

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
          backgroundColor: "#f9fafb",
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
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-white px-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2563EB] rounded-full blur-3xl opacity-20 pointer-events-none" />
        <p className="relative text-white/50">Aucun résultat trouvé. Retourne à l'accueil pour en générer un.</p>
      </main>
    );
  }

  const RegenButton = ({ sectionKey }: { sectionKey: "summary" | "sheet" | "flashcards" | "quiz" }) => (
    <button
      onClick={() => regenerateSection(sectionKey)}
      disabled={!data.sourceText || regeneratingKey === sectionKey}
      className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
    >
      {regeneratingKey === sectionKey ? (
        <>
          <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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
    <main className="min-h-screen bg-[#0B0F1A] text-white py-10 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2563EB] rounded-full blur-3xl opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#7C3AED] rounded-full blur-3xl opacity-15 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <button onClick={handleClear} className="text-sm text-white/30 hover:text-red-400 transition">
            🗑️ Effacer cette fiche
          </button>
          <button
            onClick={() => router.push("/generer")}
            className="text-sm text-white/60 hover:text-white font-medium transition"
          >
            ← Nouveau document
          </button>
        </div>

        {/* Logo — capturé pour le PDF, reste sur fond clair volontairement */}
        <div ref={logoRef} className="bg-[#F4F7FB] rounded-t-2xl px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <Wordmark className="text-lg text-gray-900" />
          </div>
          <p className="text-gray-500 text-sm mt-1">Ta fiche de révision générée</p>
        </div>

        <div className="bg-[#F4F7FB] px-1 pb-1 rounded-b-sm" />
        <div className="h-4" />

        {data.summary !== undefined && (
          <div ref={summaryRef} className={`pb-6 ${sectionOpacity("summary")}`}>
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">📝 Résumé</h2>
                <RegenButton sectionKey="summary" />
              </div>
              <p className="text-gray-700 leading-relaxed">{data.summary}</p>
            </section>
          </div>
        )}

        {data.sheet !== undefined && (
          <div className={`pb-6 ${sectionOpacity("sheet")}`}>
            <div ref={sheetHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-gray-200 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">📌 Fiche de révision</h2>
                <RegenButton sectionKey="sheet" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-6 pt-2 space-y-2">
              {data.sheet.map((point, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    sheetItemRefs.current[i] = el;
                  }}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex gap-2"
                >
                  <span className="text-blue-600 font-bold">•</span>
                  <span className="text-gray-700">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.flashcards !== undefined && (
          <div className={`pb-6 ${sectionOpacity("flashcards")}`}>
            <div ref={flashcardsHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-gray-200 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">🎴 Flashcards</h2>
                <RegenButton sectionKey="flashcards" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-6 pt-2 grid gap-3">
              {data.flashcards.map((card, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    flashcardItemRefs.current[i] = el;
                  }}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <p className="font-medium text-gray-900 mb-1">{i + 1}. {card.question}</p>
                  <p className="text-gray-600 text-sm">{card.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.quiz !== undefined && (
          <div className={`pb-6 ${sectionOpacity("quiz")}`}>
            <div ref={quizHeaderRef} className="bg-white rounded-t-xl border border-b-0 border-gray-200 px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">❓ Quiz</h2>
                <RegenButton sectionKey="quiz" />
              </div>
            </div>
            <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-6 pt-2 space-y-3">
              {data.quiz.map((q, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    quizItemRefs.current[i] = el;
                  }}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <p className="font-medium text-gray-900 mb-3">{i + 1}. {q.question}</p>
                  <ul className="space-y-2">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className={`px-3 py-2 rounded-md text-sm ${
                          j === q.correctIndex
                            ? "bg-blue-50 text-blue-800 font-semibold border border-blue-200"
                            : "bg-white text-gray-700 border border-gray-200"
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
          className="mt-2 px-6 py-3 rounded-xl font-display font-semibold bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition w-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_30px_-10px_rgba(124,58,237,0.6)]"
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