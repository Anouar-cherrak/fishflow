"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { InstallPWA } from "@/components/InstallPWA";
import { UpgradeModal } from "@/components/UpgradeModal";
import { trackEvent } from "@/lib/tracking";
import { track } from "@/lib/track";
import type { User } from "@supabase/supabase-js";

type Mode = "text" | "pdf" | "photo";
type OutputKey = "summary" | "sheet" | "flashcards" | "quiz";
type Difficulty = "facile" | "moyen" | "difficile";
type Length = "court" | "moyen" | "detaille";

type UsageInfo = {
  isPro: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
};

const OUTPUT_OPTIONS: { key: OutputKey; label: string }[] = [
  { key: "summary", label: "Résumé" },
  { key: "sheet", label: "Fiche de révision" },
  { key: "flashcards", label: "Flashcards" },
  { key: "quiz", label: "Quiz" },
];

const LOADING_MESSAGES = [
  "Lecture du contenu...",
  "Analyse en cours...",
  "Génération de ta fiche...",
  "Presque fini...",
];

const FREE_FICHES_LIMIT = 5;
const MAX_PHOTO_SIDE = 2000;

// Les photos de téléphone dépassent souvent 4 Mo : on les réduit avant l'envoi (plus rapide, et plus de refus).
// Si le navigateur ne sait pas lire l'image, on envoie l'originale.
async function shrinkPhoto(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImage = (f: File) => f.type.startsWith("image/");

function GenererContent() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [outputs, setOutputs] = useState<OutputKey[]>(["summary", "sheet", "flashcards", "quiz"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");
  const [length, setLength] = useState<Length>("moyen");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; message: string; manage?: boolean } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
      if (data.user) {
        fetch("/api/usage").then((r) => r.json()).then((d) => setUsage(d)).catch(() => {});
      }
    });
  }, []);

  // Un texte envoyé depuis Apprendre (« En faire une fiche de révision »)
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("ff-prefill");
      if (prefill) {
        sessionStorage.removeItem("ff-prefill");
        queueMicrotask(() => setText(prefill.slice(0, 20000)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const alreadyTracked = sessionStorage.getItem("ff_achat_tracked") === "1";
      if (!alreadyTracked) {
        trackEvent("achat_premium", { value: 4.99, currency: "EUR" });
        sessionStorage.setItem("ff_achat_tracked", "1");
      }
      router.replace("/generer");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      setProgress(0);
      return;
    }
    const messageInterval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 92 ? prev + (92 - prev) * 0.08 : prev));
    }, 300);
    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  const toggleOutput = (key: OutputKey) => {
    setOutputs((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const handleGenerate = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();

    if (usage && !usage.isPro) {
      const { count } = await supabase.from("fiches").select("*", { count: "exact", head: true });
      if ((count ?? 0) >= FREE_FICHES_LIMIT) {
        trackEvent("historique_plein", { mode });
        setUpgradeModal({
          title: "Ton historique est plein",
          message: `Les comptes gratuits gardent au maximum ${FREE_FICHES_LIMIT} fiches. Supprime une ancienne fiche depuis "Mes fiches", ou passe Pro pour un historique illimité.`,
          manage: true,
        });
        return;
      }
    }

    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("outputs", outputs.join(","));
    formData.append("difficulty", difficulty);
    formData.append("length", length);

    if (mode === "text") {
      formData.append("text", text);
    } else if (mode === "pdf" && usage?.isPro && files.length > 0) {
      files.forEach((f) => formData.append("files", f));
    } else if (file) {
      formData.append("file", mode === "photo" ? await shrinkPhoto(file) : file);
    }

    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        if (data.quotaExceeded) {
          trackEvent("quota_atteint", { mode });
          setUpgradeModal({
            title: "Limite gratuite atteinte",
            message: data.error || "Tu as atteint ta limite de fiches gratuites ce mois-ci. Passe Pro pour continuer à réviser sans limite.",
          });
        } else if (data.requiresPro) {
          trackEvent("pdf_trop_volumineux", { mode });
          setUpgradeModal({
            title: "Fonctionnalité Pro",
            message: data.error,
          });
        } else {
          trackEvent("generation_echouee", { mode, reason: data.error || "erreur" });
          setError(data.error || "Une erreur est survenue. Réessaie.");
        }
        fetch("/api/usage").then((r) => r.json()).then((d) => setUsage(d));
        return;
      }

      const title = data.title || data.summary?.slice(0, 40) || data.sheet?.[0]?.slice(0, 40) || "Fiche sans titre";
      const { data: inserted, error: insertError } = await supabase.from("fiches").insert({ title, data }).select().single();

      // La base refuse une 6e fiche gratuite : on l'explique au lieu de faire comme si tout allait bien.
      if (insertError && String(insertError.message).includes("FREE_LIMIT")) {
        setLoading(false);
        setUpgradeModal({
          title: "Ton historique est plein",
          message: `Les comptes gratuits gardent au maximum ${FREE_FICHES_LIMIT} fiches. Supprime une ancienne fiche depuis "Mes fiches", ou passe Pro pour un historique illimité.`,
          manage: true,
        });
        return;
      }

      // Première fiche de la personne : on compte l'étape (mesure du parcours).
      if (inserted?.id) {
        const { count: mine } = await supabase.from("fiches").select("*", { count: "exact", head: true });
        if (mine === 1) track("first_fiche");
      }

      const dataWithId = { ...data, id: inserted?.id };
      localStorage.setItem("fishflow_result", JSON.stringify(dataWithId));
      localStorage.setItem("fishflow_settings", JSON.stringify({ difficulty, length }));

      trackEvent("generation_reussie", { mode, outputs: outputs.join(",") });

      const updatedUsage = await fetch("/api/usage").then((r) => r.json());
      setUsage(updatedUsage);
      if (!updatedUsage.isPro) {
        trackEvent("quota_utilise", { remaining: updatedUsage.remaining });
      }

      setProgress(100);
      // Une fiche enregistrée a sa propre adresse ; sinon on garde la page de secours.
      const destination = inserted?.id ? `/fiche/${inserted.id}` : "/result";
      setTimeout(() => router.push(destination), 150);
    } catch {
      trackEvent("generation_echouee", { mode, reason: "erreur_reseau" });
      setError("Erreur de connexion. Vérifie ta connexion internet et réessaie.");
      setLoading(false);
    }
  };

  const isMultiPdfPro = mode === "pdf" && usage?.isPro;

  const canGenerate =
    !loading &&
    (mode === "text" ? !!text : mode === "pdf" && isMultiPdfPro ? files.length > 0 : !!file) &&
    outputs.length > 0 &&
    !(!!user && !!usage && !usage.isPro && usage.remaining === 0);

  // Glisser-déposer un fichier sur la zone (ordinateur).
  const dropProps = (accept: (f: File) => boolean, multiple: boolean) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const got = Array.from(e.dataTransfer.files).filter(accept);
      if (got.length === 0) return setError("Ce type de fichier n'est pas accepté ici.");
      setError(null);
      if (multiple) setFiles(got);
      else setFile(got[0]);
    },
  });

  const dropClass =
    (dragging ? "border-[#22C55E] bg-surface " : "") +
    "w-full min-h-[220px] lg:min-h-[320px] p-8 border border-dashed border-black/25 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#22C55E] hover:bg-surface transition";

  return (
    <AppShell size="wide">
      {loading && (
        <div role="status" aria-live="polite" className="fixed inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-[70] px-6 text-center">
          <div className="ff-doc-anim mb-8" aria-hidden="true">
            <span /><span /><span /><span /><span />
            <i />
          </div>
          <p className="text-black font-semibold text-lg mb-4 ff-fade">{LOADING_MESSAGES[loadingStep]}</p>
          <div className="w-full max-w-xs h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full ff-progress-shimmer transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-black/50 text-sm mt-3">Ça peut prendre jusqu&apos;à 30-40 secondes.</p>
        </div>
      )}

      {upgradeModal && (
        <UpgradeModal
          title={upgradeModal.title}
          message={upgradeModal.message}
          onClose={() => setUpgradeModal(null)}
          onUpgrade={() => {
            trackEvent("clic_modal_upgrade");
            router.push("/pricing");
          }}
          secondaryLabel={upgradeModal.manage ? "Gérer mes fiches" : undefined}
          onSecondary={upgradeModal.manage ? () => router.push("/mes-fiches") : undefined}
        />
      )}

      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-3">Génère ta fiche de révision.</h1>
        <p className="ff-lead">Colle un cours, un article ou tes notes, envoie un PDF ou prends-les en photo. Tu reçois un résumé, une fiche, des flashcards et un quiz.</p>
      </div>

      <div className="ff-fade-up" style={{ animationDelay: "0.05s" }}>
        <InstallPWA />
      </div>

      {!user && !checkingAuth && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-surface text-black/70 ff-fade-up">
          Connecte-toi pour générer des fiches (3 gratuites par mois).
        </div>
      )}

      <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* Colonne de gauche : le cours */}
        <section aria-label="Ton cours" className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-7 ff-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex gap-1 mb-5 bg-white border border-black/10 rounded-full p-1" role="group" aria-label="Type de document">
            {(["text", "pdf", "photo"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => { setMode(m); setFile(null); setFiles([]); setError(null); }}
                className={`flex-1 min-h-[44px] px-3 rounded-full font-semibold text-sm transition ${
                  mode === m ? "bg-black text-white" : "text-black/55 hover:text-black"
                }`}
              >
                {m === "text" ? "Texte" : m === "pdf" ? "PDF" : "Photo"}
              </button>
            ))}
          </div>

          {mode === "text" && (
            <>
              <label htmlFor="cours" className="sr-only">Ton cours</label>
              <textarea
                id="cours"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Colle ici un cours, un article, un chapitre ou tes notes..."
                className="w-full h-64 lg:h-[22rem] p-4 border border-black/15 rounded-2xl text-black placeholder-black/35 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent text-base ff-input resize-y"
              />
            </>
          )}

          {mode === "pdf" && isMultiPdfPro && (
            <div>
              <label className={dropClass} {...dropProps(isPdf, true)}>
                <span className="text-black font-semibold mb-1">
                  {files.length > 0 ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}` : "Choisir un ou plusieurs PDF"}
                </span>
                <span className="text-black/50 text-sm">Avec Pro, plusieurs PDF sont fusionnés en une seule fiche</span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                  className="sr-only"
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="text-sm text-black/60 flex items-center justify-between px-1">
                      <span className="truncate">{f.name}</span>
                      <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-black/40 hover:text-black shrink-0 ml-2 w-8 h-8">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {mode === "pdf" && !isMultiPdfPro && (
            <label className={dropClass} {...dropProps(isPdf, false)}>
              <span className="text-black font-semibold mb-1">{file ? file.name : "Choisir un PDF"}</span>
              <span className="text-black/50 text-sm">{file ? "Fichier sélectionné ✓" : <><span className="ff-desk-only">ou glisse-dépose ton fichier ici</span><span className="ff-mobile-only">Touche ici pour choisir</span></>}</span>
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only" />
            </label>
          )}

          {mode === "photo" && (
            <label className={dropClass} {...dropProps(isImage, false)}>
              <span className="text-black font-semibold mb-1">{file ? file.name : "Choisir une photo"}</span>
              <span className="text-black/50 text-sm">{file ? "Fichier sélectionné ✓" : <><span className="ff-desk-only">ou glisse-dépose ton fichier ici</span><span className="ff-mobile-only">Touche ici pour choisir</span></>}</span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only" />
            </label>
          )}
        </section>

        {/* Colonne de droite : ce que tu veux recevoir */}
        <div className="grid gap-6 ff-fade-up" style={{ animationDelay: "0.15s" }}>
          <section aria-label="Options" className="grid gap-6">
            <div className="grid grid-cols-2 gap-4" role="group" aria-label="Réglages de la fiche">
              <div>
                <label htmlFor="niveau" className="text-sm font-semibold text-black/60 block mb-2">Niveau</label>
                <select
                  id="niveau"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full min-h-[48px] px-3 border border-black/15 rounded-2xl bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] ff-input"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
                <p className="text-xs text-black/50 mt-1.5">Des mots simples ou plus techniques.</p>
              </div>
              <div>
                <label htmlFor="longueur" className="text-sm font-semibold text-black/60 block mb-2">Longueur</label>
                <select
                  id="longueur"
                  value={length}
                  onChange={(e) => setLength(e.target.value as Length)}
                  className="w-full min-h-[48px] px-3 border border-black/15 rounded-2xl bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] ff-input"
                >
                  <option value="court">Court</option>
                  <option value="moyen">Moyen</option>
                  <option value="detaille">Détaillé</option>
                </select>
                <p className="text-xs text-black/50 mt-1.5">Court : l'essentiel. Détaillé : plus de cartes.</p>
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-black/60 mb-3">Ce que tu veux recevoir (coche au moins un)</legend>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 min-h-[48px] px-4 rounded-2xl border cursor-pointer text-sm font-medium transition ${
                      outputs.includes(opt.key) ? "bg-surface border-[#22C55E] text-black" : "bg-white border-black/15 text-black/55 hover:border-black/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={outputs.includes(opt.key)}
                      onChange={() => toggleOutput(opt.key)}
                      className="accent-[#22C55E] w-4 h-4"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

          </section>

          {error && (
            <p role="alert" className="px-4 py-3 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 text-sm text-black">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="ff-primary w-full text-base ff-btn"
          >
            {loading ? "Génération..." : !user ? "Se connecter pour générer" : "Générer ma fiche"}
          </button>

          {user && usage && !usage.isPro && (
            <section aria-label="Ton offre" className="bg-surface border border-black/10 rounded-3xl overflow-hidden">
              <p className={`px-5 py-3 text-sm font-semibold ${usage.remaining === 0 ? "text-[#22C55E]" : "text-black/80"}`}>
                {usage.remaining === 0
                  ? "Tu as atteint ta limite gratuite de ce mois-ci."
                  : `${usage.remaining} fiche${usage.remaining! > 1 ? "s" : ""} gratuite${usage.remaining! > 1 ? "s" : ""} restante${usage.remaining! > 1 ? "s" : ""} ce mois-ci.`}
              </p>
              <div className="px-5 pb-5 grid grid-cols-2 gap-4 border-t border-black/10 pt-4">
                <div>
                  <p className="text-xs font-semibold text-black/50 mb-2">Gratuit</p>
                  <p className="text-sm text-black/65">3 fiches par mois</p>
                  <p className="text-sm text-black/65">Documents courts et moyens</p>
                  <p className="text-sm text-black/65">Historique de 5 fiches</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#22C55E] mb-2">Pro</p>
                  <p className="text-sm font-medium">Fiches illimitées</p>
                  <p className="text-sm font-medium">Documents volumineux</p>
                  <p className="text-sm font-medium">Plusieurs PDF à la fois</p>
                  <p className="text-sm font-medium">Quiz de 12 questions + audio</p>
                  <p className="text-sm font-medium">Historique illimité</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button type="button" onClick={() => router.push("/pricing")} className="ff-secondary w-full text-sm">
                  Voir Pro, 4,99 € par mois
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function Generer() {
  return (
    <Suspense fallback={null}>
      <GenererContent />
    </Suspense>
  );
}