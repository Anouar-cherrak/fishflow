"use client";

import { ShareFiche } from "@/components/ShareFiche";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { trackEvent } from "@/lib/tracking";
import { QuizPlayer } from "@/components/QuizPlayer";
import { createClient } from "@/lib/supabase/client";
import { FlashcardStudy } from "@/components/FlashcardStudy";
import { clearFicheReviews, recordReviewResults } from "@/lib/reviews";

type Flashcard = { question: string; answer: string };
type QuizQuestion = { question: string; options: string[]; correctIndex: number };

export type FishFlowResult = {
  id?: string;
  title?: string;
  sourceText?: string;
  summary?: string;
  sheet?: string[];
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  best_score?: number | null;
};

type Settings = { difficulty: string; length: string };

type SectionKey = "summary" | "sheet" | "flashcards" | "quiz";

// Trois présentations de la même fiche : on lit, on mémorise ou on prend des notes différemment.
type Template = "classique" | "memo" | "cornell";
const TEMPLATES: { key: Template; label: string; hint: string }[] = [
  { key: "classique", label: "Classique", hint: "Cartes aérées, facile à parcourir" },
  { key: "memo", label: "Mémo", hint: "Compact, pour relire vite ou imprimer" },
  { key: "cornell", label: "Cornell", hint: "Questions à gauche, notes à droite" },
];
const TEMPLATE_KEY = "ff-template";

function RegenButton({
  sectionKey,
  hasSource,
  regenerating,
  onRegenerate,
}: {
  sectionKey: SectionKey;
  hasSource: boolean;
  regenerating: boolean;
  onRegenerate: (key: SectionKey) => void;
}) {
  return (
    <button
      onClick={() => onRegenerate(sectionKey)}
      disabled={!hasSource || regenerating}
      className="flex items-center gap-1.5 text-sm text-black/70 font-medium hover:text-black hover:underline disabled:opacity-50 disabled:no-underline min-h-[44px]"
    >
      {regenerating ? (
        <>
          <span className="w-3 h-3 border-2 border-black/25 border-t-black rounded-full animate-spin" />
          Régénération...
        </>
      ) : (
        "Régénérer"
      )}
    </button>
  );
}

export function FicheView({ initialData }: { initialData: FishFlowResult }) {
  const [data, setData] = useState<FishFlowResult>(initialData);
  const [settings, setSettings] = useState<Settings>({ difficulty: "moyen", length: "moyen" });
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [template, setTemplate] = useState<Template>("classique");
  const [bestScore, setBestScore] = useState<number | null>(initialData.best_score ?? null);
  const ficheId = initialData.id ?? "";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [studying, setStudying] = useState(false);

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
    try {
      const storedSettings = localStorage.getItem("fishflow_settings");
      if (storedSettings) setSettings(JSON.parse(storedSettings));
      const storedTemplate = localStorage.getItem(TEMPLATE_KEY);
      if (storedTemplate === "classique" || storedTemplate === "memo" || storedTemplate === "cornell") setTemplate(storedTemplate);
      if (sessionStorage.getItem("ff-nudge-hidden") === "1") setNudgeHidden(true);
    } catch {}

    const checkPro = async () => {
      try {
        const res = await fetch("/api/usage");
        const usageData = await res.json();
        setIsPro(!!usageData.isPro);
        setRemaining(typeof usageData.remaining === "number" ? usageData.remaining : null);
      } catch {}
    };
    checkPro();

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const regenerateSection = async (key: SectionKey) => {
    if (!data.sourceText) return;
    setRegeneratingKey(key);
    try {
      const formData = new FormData();
      formData.append("mode", "text");
      formData.append("text", data.sourceText);
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

      if (ficheId) {
        // La section régénérée est enregistrée dans la fiche (sinon elle serait perdue à la réouverture).
        const toStore: Record<string, unknown> = { ...updated };
        delete toStore.id;
        delete toStore.best_score;
        await createClient().from("fiches").update({ data: toStore }).eq("id", ficheId);
        // De nouvelles flashcards = de nouvelles cartes : l'ancien suivi de révision n'a plus de sens.
        if (key === "flashcards") await clearFicheReviews(ficheId);
      } else {
        localStorage.setItem("fishflow_result", JSON.stringify(updated));
      }
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
    // Le PDF est toujours en clair, même si l'écran est en thème sombre.
    setExporting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      // Les outils de PDF sont lourds : on ne les charge qu'au moment du clic.
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
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
      setExporting(false);
      setDownloading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Effacer cette fiche ? Cette action est irréversible.")) return;
    localStorage.removeItem("fishflow_result");
    localStorage.removeItem("fishflow_settings");

    if (ficheId) {
      const { error } = await createClient().from("fiches").delete().eq("id", ficheId);
      if (error) {
        alert("Impossible d'effacer cette fiche pour l'instant. Réessaie.");
        return;
      }
      router.push("/mes-fiches");
      return;
    }

    router.push("/generer");
  };

  const regenProps = (key: SectionKey) => ({
    sectionKey: key,
    hasSource: !!data.sourceText,
    regenerating: regeneratingKey === key,
    onRegenerate: regenerateSection,
  });

  const sectionOpacity = (key: string) =>
    regeneratingKey === key ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity";

  const actionClass = "ff-secondary w-full text-sm";

  const chooseTemplate = (key: Template) => {
    setTemplate(key);
    try {
      localStorage.setItem(TEMPLATE_KEY, key);
    } catch {}
    trackEvent("template_choisi", { template: key });
  };

  const hideNudge = () => {
    setNudgeHidden(true);
    try {
      sessionStorage.setItem("ff-nudge-hidden", "1");
    } catch {}
  };

  // Un petit rappel honnête, seulement quand il reste très peu de fiches gratuites.
  const showNudge = !isPro && !nudgeHidden && remaining !== null && remaining <= 1;

  const sheetWrap = template === "classique" ? "grid gap-2.5 md:grid-cols-2" : "grid gap-0";
  const sheetItem = (i: number, total: number) => {
    if (template === "memo") {
      return `flex gap-3 items-baseline px-4 py-3 bg-surface border border-black/10 -mt-px ${i === 0 ? "rounded-t-2xl mt-0" : ""} ${i === total - 1 ? "rounded-b-2xl" : ""}`;
    }
    if (template === "cornell") {
      return `grid grid-cols-[2.5rem_minmax(0,1fr)] bg-surface border-x border-b border-black/10 ${i === 0 ? "border-t rounded-t-2xl" : ""} ${i === total - 1 ? "rounded-b-2xl" : ""}`;
    }
    return "bg-surface rounded-2xl border border-black/10 p-4 flex gap-3";
  };
  const cardWrap = template === "classique" ? "grid gap-3 md:grid-cols-2" : "grid gap-0";
  const cardItem = (i: number, total: number) => {
    if (template === "memo") {
      return `px-4 py-3 bg-surface border border-black/10 -mt-px ${i === 0 ? "rounded-t-2xl mt-0" : ""} ${i === total - 1 ? "rounded-b-2xl" : ""}`;
    }
    if (template === "cornell") {
      return `grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] bg-surface border-x border-b border-black/10 ${i === 0 ? "border-t rounded-t-2xl" : ""} ${i === total - 1 ? "rounded-b-2xl" : ""}`;
    }
    return "border border-black/10 rounded-2xl p-5 bg-surface";
  };

  return (
    <AppShell size="wide">
      <div className={exporting ? "ff-force-light" : ""}>
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          <aside className="lg:order-2 lg:sticky lg:top-28 grid gap-3" aria-label="Actions sur la fiche">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="ff-primary w-full text-sm ff-btn"
              >
                {downloading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    PDF en cours...
                  </>
                ) : (
                  "Télécharger en PDF"
                )}
              </button>
              <button type="button" onClick={() => router.push("/generer")} className={actionClass}>
                Nouvelle fiche
              </button>
              {data.flashcards !== undefined && data.flashcards.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("flashcards_etude_ouverte");
                    setStudying(true);
                  }}
                  className={actionClass}
                >
                  Étudier les flashcards
                </button>
              )}
              <button type="button" onClick={() => router.push("/mes-fiches")} className={actionClass}>
                Mes fiches
              </button>
              {data.id && <ShareFiche ficheId={data.id} className={actionClass} />}
            </div>
            <button type="button" onClick={handleClear} className="text-sm text-black/50 hover:text-black transition ff-link-underline justify-self-start mt-1 min-h-[44px]">
              Effacer cette fiche
            </button>
          </aside>

          <div className="lg:order-1 min-w-0">
            <div ref={logoRef} className="mb-6">
              <p className="text-sm font-semibold text-[#22C55E] mb-2">Fiche de révision</p>
              <h1 className="ff-title">{data.title || "Ta fiche est prête."}</h1>
              <p className="ff-lead mt-3">Résumé, fiche, flashcards et quiz, générés à partir de ton cours.</p>
            </div>

            {showNudge && (
              <aside className="mb-6 bg-surface border border-black/10 rounded-2xl p-5" aria-label="À propos de Pro">
                <p className="font-semibold mb-1">
                  {remaining === 0 ? "Tu as utilisé tes 3 fiches gratuites ce mois-ci." : "Il te reste 1 fiche gratuite ce mois-ci."}
                </p>
                <p className="text-sm text-black/65 mb-4 max-w-[60ch]">
                  Avec Pro : fiches illimitées, quiz à jouer avec ton meilleur score, 20 questions par jour dans Apprendre, tes
                  cartes difficiles et ta progression sur 30 jours.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => { trackEvent("pro_nudge_clic"); router.push("/pricing"); }} className="ff-primary text-sm ff-btn">
                    Voir Pro
                  </button>
                  <button type="button" onClick={hideNudge} className="ff-secondary text-sm">
                    Plus tard
                  </button>
                </div>
              </aside>
            )}

            <div className="mb-6" role="group" aria-label="Présentation de la fiche">
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => chooseTemplate(t.key)}
                    aria-pressed={template === t.key}
                    className={`min-h-[44px] px-4 rounded-full border text-sm font-semibold transition ${
                      template === t.key ? "bg-black text-white border-black" : "border-black/15 text-black/65 hover:border-black/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-black/50 mt-2">{TEMPLATES.find((t) => t.key === template)?.hint}</p>
            </div>

            {data.summary !== undefined && (
              <div ref={summaryRef} className={`pb-6 ${sectionOpacity("summary")}`}>
                <section className="bg-surface rounded-3xl border border-black/10 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-black">Résumé</h2>
                    <div className="flex items-center gap-4">
                      {isPro && (
                        <button type="button" onClick={toggleSpeak} className="text-sm text-[#22C55E] font-semibold hover:underline min-h-[44px]">
                          {isSpeaking ? "Arrêter" : "Écouter"}
                        </button>
                      )}
                      <RegenButton {...regenProps("summary")} />
                    </div>
                  </div>
                  <p className="text-black/80 leading-relaxed text-base sm:text-lg max-w-[68ch]">{data.summary}</p>
                </section>
              </div>
            )}

            {data.sheet !== undefined && (
              <div className={`pb-6 ${sectionOpacity("sheet")}`}>
                <div ref={sheetHeaderRef} className="px-1 pt-2 pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-black">Fiche de révision</h2>
                    <RegenButton {...regenProps("sheet")} />
                  </div>
                </div>
                <div className={sheetWrap}>
                  {data.sheet.map((point, i) => (
                    <div key={i} ref={(el) => { sheetItemRefs.current[i] = el; }} className={sheetItem(i, data.sheet!.length)}>
                      {template === "classique" && <span className="mt-2 w-2 h-2 rounded-full bg-[#22C55E] shrink-0" aria-hidden="true" />}
                      {template === "memo" && <span className="text-[#22C55E] font-bold tabular-nums shrink-0 w-6" aria-hidden="true">{i + 1}.</span>}
                      {template === "cornell" && (
                        <span className="border-r border-black/10 grid place-items-start justify-items-center pt-3.5 text-[#22C55E] font-bold tabular-nums" aria-hidden="true">{i + 1}</span>
                      )}
                      <span className={`text-black/80 ${template === "cornell" ? "px-4 py-3" : ""}`}>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.flashcards !== undefined && (
              <div className={`pb-6 ${sectionOpacity("flashcards")}`}>
                <div ref={flashcardsHeaderRef} className="px-1 pt-2 pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-black">Flashcards</h2>
                    <RegenButton {...regenProps("flashcards")} />
                  </div>
                </div>
                <div className={cardWrap}>
                  {data.flashcards.map((card, i) => (
                    <div key={i} ref={(el) => { flashcardItemRefs.current[i] = el; }} className={cardItem(i, data.flashcards!.length)}>
                      {template === "cornell" ? (
                        <>
                          <p className="font-semibold text-black px-4 py-3 md:border-r border-black/10">{i + 1}. {card.question}</p>
                          <p className="text-black/70 text-sm px-4 pb-3 md:py-3.5">{card.answer}</p>
                        </>
                      ) : (
                        <>
                          <p className={`font-semibold text-black ${template === "memo" ? "mb-0.5" : "mb-1.5"}`}>{i + 1}. {card.question}</p>
                          <p className="text-black/65 text-sm">{card.answer}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.quiz !== undefined && (
              <div className={`pb-6 ${sectionOpacity("quiz")}`}>
                <div ref={quizHeaderRef} className="px-1 pt-2 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold tracking-tight text-black">Quiz</h2>
                    <RegenButton {...regenProps("quiz")} />
                  </div>
                  {isPro && bestScore !== null && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-black/60">
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
                <div>
                  {isPro ? (
                    <QuizPlayer
                      quiz={data.quiz}
                      ficheId={ficheId}
                      currentBestScore={bestScore}
                      onScoreUpdate={setBestScore}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        {data.quiz.map((q, i) => (
                          <div key={i} ref={(el) => { quizItemRefs.current[i] = el; }} className="border border-black/10 rounded-2xl p-5 bg-surface">
                            <p className="font-semibold text-black mb-3">{i + 1}. {q.question}</p>
                            <ul className="space-y-2">
                              {q.options.map((opt, j) => (
                                <li
                                  key={j}
                                  className={`px-3 py-2 rounded-xl text-sm ${
                                    j === q.correctIndex
                                      ? "bg-black text-white font-semibold"
                                      : "bg-white text-black/70 border border-black/10"
                                  }`}
                                >
                                  {opt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="bg-surface border border-black/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-black/70">Avec Pro, tu joues le quiz et tu suis ta progression.</p>
                        <button type="button" onClick={() => router.push("/pricing")} className="ff-primary text-sm ff-btn">
                          Découvrir Pro
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {studying && data.flashcards && data.flashcards.length > 0 && (
        <FlashcardStudy
          cards={data.flashcards}
          onClose={() => setStudying(false)}
          onComplete={(firstTry) => {
            if (!ficheId) return;
            recordReviewResults(firstTry.map((correct, cardIndex) => ({ ficheId, cardIndex, correct })));
          }}
        />
      )}
    </AppShell>
  );
}