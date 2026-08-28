"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { InstallPWA } from "@/components/InstallPWA";
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
  { key: "summary", label: "📝 Résumé" },
  { key: "sheet", label: "📌 Fiche de révision" },
  { key: "flashcards", label: "🎴 Flashcards" },
  { key: "quiz", label: "❓ Quiz" },
];

const LOADING_MESSAGES = [
  "Lecture du contenu...",
  "Analyse en cours...",
  "Génération de ta fiche...",
  "Presque fini...",
];

function GenererContent() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [outputs, setOutputs] = useState<OutputKey[]>([
    "summary",
    "sheet",
    "flashcards",
    "quiz",
  ]);
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");
  const [length, setLength] = useState<Length>("moyen");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
      if (data.user) {
        fetch("/api/usage")
          .then((r) => r.json())
          .then((d) => setUsage(d))
          .catch(() => {});
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

    setLoading(true);
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("outputs", outputs.join(","));
    formData.append("difficulty", difficulty);
    formData.append("length", length);

    if (mode === "text") {
      formData.append("text", text);
    } else if (file) {
      formData.append("file", file);
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        if (data.quotaExceeded) {
          trackEvent("quota_atteint", { mode });
        } else {
          trackEvent("generation_echouee", { mode, reason: data.error || "erreur" });
        }
        alert(data.error || "Une erreur est survenue.");
        fetch("/api/usage").then((r) => r.json()).then((d) => setUsage(d));
        return;
      }

      localStorage.setItem("fishflow_result", JSON.stringify(data));
      localStorage.setItem(
        "fishflow_settings",
        JSON.stringify({ difficulty, length })
      );

      const supabase = createClient();
      const title =
        data.summary?.slice(0, 60) ||
        data.sheet?.[0]?.slice(0, 60) ||
        "Fiche sans titre";
      await supabase.from("fiches").insert({ title, data });

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

  return (
    <main className="min-h-screen bg-[#F7F5FC] text-[#1E1533]">
      {loading && (
        <div className="fixed inset-0 bg-[#F7F5FC]/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 px-6">
          <div className="w-10 h-10 border-4 border-[#6D28D9]/15 border-t-[#6D28D9] rounded-full animate-spin mb-4" />
          <p className="text-[#1E1533] font-medium mb-4">{LOADING_MESSAGES[loadingStep]}</p>
          <div className="w-full max-w-xs h-1.5 bg-[#EFEBF7] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6D28D9] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[#1E1533]/40 text-sm mt-3">Ça peut prendre jusqu'à 20-30 secondes.</p>
        </div>
      )}

      <div className="w-full flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-lg flex flex-wrap justify-between items-center gap-3 mb-6">
          <Link href="/" className="text-sm text-[#1E1533]/50 hover:text-[#1E1533] transition">
            ← FishFlow
          </Link>
          <div className="flex items-center gap-3">
            {!checkingAuth && (
              user ? (
                <>
                  <button
                    onClick={() => router.push("/mes-fiches")}
                    className="text-sm text-[#1E1533]/60 hover:text-[#1E1533] font-medium transition"
                  >
                    Mes fiches
                  </button>
                  <span className="hidden sm:inline text-sm text-[#1E1533]/40">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-[#1E1533]/40 hover:text-[#1E1533] hover:underline transition"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="text-sm text-[#1E1533]/60 hover:text-[#1E1533] font-medium transition"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => router.push("/signup")}
                    className="text-sm bg-white border border-[#6D28D9]/20 shadow-sm px-3 py-1.5 rounded-full font-medium hover:border-[#6D28D9]/40 transition"
                  >
                    Créer un compte
                  </button>
                </>
              )
            )}
          </div>
        </div>

        <div className="w-full max-w-lg flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-white border border-[#6D28D9]/10 shadow-sm rounded-xl flex items-center justify-center shrink-0">
              <Logo size={22} />
            </div>
            <div>
              <Wordmark className="text-xl" />
              <p className="text-[#1E1533]/50 text-sm">Transforme ton cours en fiche de révision.</p>
            </div>
          </div>

          <InstallPWA />

          {user && usage?.isPro && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[#6D28D9] text-white flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <span className="font-medium">FishFlow Pro actif — générations illimitées</span>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-xs font-semibold underline text-white/90 hover:text-white disabled:opacity-50"
              >
                {portalLoading ? "Redirection..." : "Gérer mon abonnement"}
              </button>
            </div>
          )}

          {user && usage && !usage.isPro && (
            <div className="mb-4 bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl overflow-hidden">
              <div
                className={`px-5 py-3 text-sm font-medium ${
                  usage.remaining === 0
                    ? "bg-red-50 text-red-600"
                    : "bg-[#EFEBF7] text-[#1E1533]/70"
                }`}
              >
                {usage.remaining === 0
                  ? "Tu as atteint ta limite gratuite de ce mois-ci."
                  : `${usage.remaining} fiche${usage.remaining! > 1 ? "s" : ""} gratuite${usage.remaining! > 1 ? "s" : ""} restante${usage.remaining! > 1 ? "s" : ""} ce mois-ci.`}
              </div>

              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#1E1533]/30 uppercase tracking-wide mb-2">
                    Gratuit
                  </p>
                  <ul className="text-sm text-[#1E1533]/60 space-y-1.5">
                    <li>3 fiches / mois</li>
                    <li>Texte, PDF, photo</li>
                    <li>Export PDF</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-2">
                    Pro
                  </p>
                  <ul className="text-sm text-[#1E1533] space-y-1.5">
                    <li className="font-medium">Fiches illimitées</li>
                    <li>Texte, PDF, photo</li>
                    <li>Export PDF</li>
                  </ul>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => router.push("/pricing")}
                  className="w-full py-2.5 rounded-lg font-medium bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition"
                >
                  Passer Pro — 4,99 €/mois
                </button>
              </div>
            </div>
          )}

          {!user && !checkingAuth && (
            <div className="mb-4 px-4 py-2.5 rounded-lg text-sm bg-[#EFEBF7] text-[#1E1533]/60">
              Connecte-toi pour générer des fiches (3 gratuites par mois).
            </div>
          )}

          <div className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl p-8">
            <div className="flex gap-1 mb-6 bg-[#EFEBF7] rounded-lg p-1">
              {(["text", "pdf", "photo"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setFile(null);
                  }}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${
                    mode === m
                      ? "bg-[#6D28D9] text-white"
                      : "text-[#1E1533]/50 hover:text-[#1E1533]/80"
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
                className="w-full h-40 p-4 border border-[#6D28D9]/15 rounded-xl mb-5 text-[#1E1533] placeholder-[#1E1533]/30 bg-[#F7F5FC] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-sm"
              />
            )}

            {(mode === "pdf" || mode === "photo") && (
              <label className="w-full mb-5 p-8 bg-[#F7F5FC] border border-dashed border-[#6D28D9]/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#6D28D9]/50 hover:bg-[#EFEBF7] transition">
                <span className="text-3xl mb-2">{mode === "pdf" ? "📄" : "🖼️"}</span>
                <span className="text-[#1E1533] font-medium text-sm mb-1">
                  {file ? file.name : `Choisir ${mode === "pdf" ? "un PDF" : "une photo"}`}
                </span>
                <span className="text-[#1E1533]/40 text-xs">
                  {file ? "Fichier sélectionné ✓" : "ou glisse-dépose ton fichier ici"}
                </span>
                <input
                  type="file"
                  accept={mode === "pdf" ? "application/pdf" : "image/*"}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}

            <div className="mb-5">
              <p className="text-xs font-semibold text-[#1E1533]/40 uppercase tracking-wide mb-2">
                Sorties
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition ${
                      outputs.includes(opt.key)
                        ? "bg-[#EFEBF7] border-[#6D28D9]/40 text-[#1E1533]"
                        : "bg-white border-[#6D28D9]/10 text-[#1E1533]/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={outputs.includes(opt.key)}
                      onChange={() => toggleOutput(opt.key)}
                      className="accent-[#6D28D9]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1E1533]/40 uppercase tracking-wide block mb-1">
                  Niveau
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full p-2.5 border border-[#6D28D9]/15 rounded-lg bg-[#F7F5FC] text-[#1E1533] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
                <p className="text-xs text-[#1E1533]/30 mt-1.5">Complexité du vocabulaire.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1E1533]/40 uppercase tracking-wide block mb-1">
                  Longueur
                </label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as Length)}
                  className="w-full p-2.5 border border-[#6D28D9]/15 rounded-lg bg-[#F7F5FC] text-[#1E1533] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                >
                  <option value="court">Court</option>
                  <option value="moyen">Moyen</option>
                  <option value="detaille">Détaillé</option>
                </select>
                <p className="text-xs text-[#1E1533]/30 mt-1.5">Quantité de contenu généré.</p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                (mode === "text" ? !text : !file) ||
                outputs.length === 0 ||
                (!!user && !!usage && !usage.isPro && usage.remaining === 0)
              }
              className="w-full py-3 rounded-xl font-display font-semibold bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition disabled:opacity-30 shadow-lg shadow-[#6D28D9]/20"
            >
              {loading
                ? "Génération..."
                : !user
                ? "Se connecter pour générer"
                : "Générer ✨"}
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