"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { InstallPWA } from "@/components/InstallPWA";
import { UpgradeModal } from "@/components/UpgradeModal";
import { trackEvent } from "@/lib/tracking";
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
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; message: string } | null>(null);
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur, réessaie.");
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      alert("Erreur de connexion. Réessaie.");
      setPortalLoading(false);
    }
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
        });
        return;
      }
    }

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
      formData.append("file", file);
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
          alert(data.error || "Une erreur est survenue.");
        }
        fetch("/api/usage").then((r) => r.json()).then((d) => setUsage(d));
        return;
      }

      const title = data.summary?.slice(0, 60) || data.sheet?.[0]?.slice(0, 60) || "Fiche sans titre";
      const { data: inserted } = await supabase.from("fiches").insert({ title, data }).select().single();

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
      setTimeout(() => router.push("/result"), 150);
    } catch (err) {
      trackEvent("generation_echouee", { mode, reason: "erreur_reseau" });
      alert("Erreur de connexion. Vérifie ta connexion internet et réessaie.");
      setLoading(false);
    }
  };

  const isMultiPdfPro = mode === "pdf" && usage?.isPro;

  return (
    <main className="min-h-screen bg-white text-black">
      {loading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 px-6">
          <div className="w-10 h-10 border-4 border-black/10 border-t-[#22C55E] rounded-full animate-spin mb-4" />
          <p className="text-black font-medium mb-4 ff-fade">{LOADING_MESSAGES[loadingStep]}</p>
          <div className="w-full max-w-xs h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full ff-progress-shimmer transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-black/40 text-sm mt-3">Ça peut prendre jusqu'à 30-40 secondes.</p>
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
        />
      )}

      <div className="w-full flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-lg flex flex-wrap justify-between items-center gap-3 mb-6 ff-fade">
          <Link href="/" className="text-sm text-black/50 hover:text-black transition ff-link-underline">← FishFlow</Link>
          <div className="flex items-center gap-3">
            {!checkingAuth && (
              user ? (
                <>
                  <button onClick={() => router.push("/mes-fiches")} className="text-sm text-black/60 hover:text-black font-medium transition ff-link-underline">
                    Mes fiches
                  </button>
                  <span className="hidden sm:inline text-sm text-black/40">{user.email}</span>
                  <button onClick={handleLogout} className="text-sm text-black/40 hover:text-black hover:underline transition">
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => router.push("/login")} className="text-sm text-black/60 hover:text-black font-medium transition ff-link-underline">
                    Connexion
                  </button>
                  <button onClick={() => router.push("/signup")} className="text-sm bg-[#22C55E] text-white px-3 py-1.5 rounded-full font-medium hover:bg-[#16A34A] transition ff-btn">
                    Créer un compte
                  </button>
                </>
              )
            )}
          </div>
        </div>

        <div className="w-full max-w-lg flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4 ff-fade-up" style={{ animationDelay: "0.05s" }}>
            <div className="w-11 h-11 bg-white border border-black/10 rounded-xl flex items-center justify-center shrink-0">
              <Logo size={22} />
            </div>
            <div>
              <Wordmark className="text-xl" />
              <p className="text-black/50 text-sm">Transforme ton cours en fiche de révision.</p>
            </div>
          </div>

          <div className="ff-fade-up" style={{ animationDelay: "0.1s" }}>
            <InstallPWA />
          </div>

          {user && usage?.isPro && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-black text-white flex items-center justify-between gap-3 flex-wrap ff-fade-up" style={{ animationDelay: "0.15s" }}>
              <span className="font-medium">FishFlow Pro actif — générations illimitées</span>
              <button onClick={handleManageSubscription} disabled={portalLoading} className="text-xs font-semibold underline text-white/90 hover:text-white disabled:opacity-50">
                {portalLoading ? "Redirection..." : "Gérer mon abonnement"}
              </button>
            </div>
          )}

          {user && usage && !usage.isPro && (
            <div className="mb-4 bg-white border border-black/10 rounded-2xl overflow-hidden ff-fade-up ff-card" style={{ animationDelay: "0.15s" }}>
              <div className={`px-5 py-3 text-sm font-medium ${usage.remaining === 0 ? "bg-black/5 text-black" : "bg-[#F4F4F5] text-black/70"}`}>
                {usage.remaining === 0
                  ? "Tu as atteint ta limite gratuite de ce mois-ci."
                  : `${usage.remaining} fiche${usage.remaining! > 1 ? "s" : ""} gratuite${usage.remaining! > 1 ? "s" : ""} restante${usage.remaining! > 1 ? "s" : ""} ce mois-ci.`}
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-black/30 uppercase tracking-wide mb-2">Gratuit</p>
                    <p className="text-sm text-black/60">3 fiches / mois</p>
                    <p className="text-sm text-black/60">Documents courts et moyens</p>
                    <p className="text-sm text-black/60">Historique limité à 5 fiches</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">Pro</p>
                    <p className="text-sm text-black font-medium">Fiches illimitées</p>
                    <p className="text-sm text-black font-medium">Documents volumineux</p>
                    <p className="text-sm text-black font-medium">Plusieurs PDF à la fois</p>
                    <p className="text-sm text-black font-medium">Quiz de 12 questions + audio</p>
                    <p className="text-sm text-black font-medium">Historique illimité</p>
                  </div>
                </div>
                <p className="text-xs text-black/30 pt-2 border-t border-black/10">
                  Inclus dans les deux : texte, PDF, photo, export PDF
                </p>
              </div>

              <div className="px-5 pb-5">
                <button onClick={() => router.push("/pricing")} className="w-full py-2.5 rounded-lg font-medium bg-[#22C55E] text-white hover:bg-[#16A34A] transition ff-btn">
                  Passer Pro — 4,99 €/mois
                </button>
              </div>
            </div>
          )}

          {!user && !checkingAuth && (
            <div className="mb-4 px-4 py-2.5 rounded-lg text-sm bg-[#F4F4F5] text-black/60 ff-fade-up" style={{ animationDelay: "0.15s" }}>
              Connecte-toi pour générer des fiches (3 gratuites par mois).
            </div>
          )}

          <div className="bg-white border border-black/10 rounded-2xl p-8 ff-fade-up ff-card" style={{ animationDelay: "0.2s" }}>
            <div className="flex gap-1 mb-6 bg-[#F4F4F5] rounded-lg p-1">
              {(["text", "pdf", "photo"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setFile(null); setFiles([]); }}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${
                    mode === m ? "bg-black text-white" : "text-black/50 hover:text-black/80"
                  }`}
                >
                  {m === "text" ? "Texte" : m === "pdf" ? "PDF" : "Photo"}
                </button>
              ))}
            </div>

            {mode === "text" && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Colle ton texte ici..."
                className="w-full h-40 p-4 border border-black/15 rounded-xl mb-5 text-black placeholder-black/30 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm ff-input"
              />
            )}

            {mode === "pdf" && isMultiPdfPro && (
              <div className="mb-5">
                <label className="w-full p-8 bg-white border border-dashed border-black/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-black/50 hover:bg-[#F4F4F5] transition">
                  <span className="text-black font-medium text-sm mb-1">
                    {files.length > 0 ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}` : "Choisir un ou plusieurs PDF"}
                  </span>
                  <span className="text-black/40 text-xs">Fonctionnalité Pro : combine plusieurs PDF en une seule fiche</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                    className="hidden"
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="text-xs text-black/50 flex items-center justify-between px-1">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-black/30 hover:text-black shrink-0 ml-2">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {mode === "pdf" && !isMultiPdfPro && (
              <label className="w-full mb-5 p-8 bg-white border border-dashed border-black/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-black/50 hover:bg-[#F4F4F5] transition">
                <span className="text-black font-medium text-sm mb-1">
                  {file ? file.name : "Choisir un PDF"}
                </span>
                <span className="text-black/40 text-xs">
                  {file ? "Fichier sélectionné ✓" : "ou glisse-dépose ton fichier ici"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}

            {mode === "photo" && (
              <label className="w-full mb-5 p-8 bg-white border border-dashed border-black/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-black/50 hover:bg-[#F4F4F5] transition">
                <span className="text-black font-medium text-sm mb-1">
                  {file ? file.name : "Choisir une photo"}
                </span>
                <span className="text-black/40 text-xs">
                  {file ? "Fichier sélectionné ✓" : "ou glisse-dépose ton fichier ici"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}

            <div className="mb-5">
              <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-2">Sorties</p>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition ${
                      outputs.includes(opt.key) ? "bg-[#F4F4F5] border-black/40 text-black" : "bg-white border-black/10 text-black/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={outputs.includes(opt.key)}
                      onChange={() => toggleOutput(opt.key)}
                      className="accent-[#22C55E]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Niveau</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full p-2.5 border border-black/15 rounded-lg bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
                <p className="text-xs text-black/30 mt-1.5">Complexité du vocabulaire.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Longueur</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as Length)}
                  className="w-full p-2.5 border border-black/15 rounded-lg bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
                >
                  <option value="court">Court</option>
                  <option value="moyen">Moyen</option>
                  <option value="detaille">Détaillé</option>
                </select>
                <p className="text-xs text-black/30 mt-1.5">Quantité de contenu généré.</p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                (mode === "text" ? !text : mode === "pdf" && isMultiPdfPro ? files.length === 0 : !file) ||
                outputs.length === 0 ||
                (!!user && !!usage && !usage.isPro && usage.remaining === 0)
              }
              className="w-full py-3 rounded-xl font-display font-semibold bg-[#22C55E] text-white hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
            >
              {loading ? "Génération..." : !user ? "Se connecter pour générer" : "Générer"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Generer() {
  return (
    <Suspense fallback={null}>
      <GenererContent />
    </Suspense>
  );
}