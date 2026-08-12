"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
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

export default function Generer() {
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
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const router = useRouter();

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
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
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
        alert(data.error || "Une erreur est survenue.");
        setLoading(false);
        if (data.quotaExceeded) {
          fetch("/api/usage").then((r) => r.json()).then((d) => setUsage(d));
        }
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

      fetch("/api/usage").then((r) => r.json()).then((d) => setUsage(d));

      router.push("/result");
    } catch (err) {
      alert("Erreur de connexion. Vérifie ta connexion internet et réessaie.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2563EB] rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#7C3AED] rounded-full blur-3xl opacity-20 pointer-events-none" />

      {loading && (
        <div className="fixed inset-0 bg-[#0B0F1A]/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-white/10 border-t-[#7C3AED] rounded-full animate-spin mb-4" />
          <p className="text-white font-medium">{LOADING_MESSAGES[loadingStep]}</p>
          <p className="text-white/40 text-sm mt-1">Ça peut prendre jusqu'à 20-30 secondes.</p>
        </div>
      )}

      <div className="relative w-full flex flex-col items-center px-4 py-6">
        {/* Barre du haut */}
        <div className="w-full max-w-lg flex flex-wrap justify-between items-center gap-3 mb-6">
          <Link href="/" className="text-sm text-white/40 hover:text-white transition">
            ← FishFlow
          </Link>
          <div className="flex items-center gap-3">
            {!checkingAuth && (
              user ? (
                <>
                  <button
                    onClick={() => router.push("/mes-fiches")}
                    className="text-sm text-white/60 hover:text-white font-medium transition"
                  >
                    Mes fiches
                  </button>
                  <span className="hidden sm:inline text-sm text-white/40">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-white/40 hover:text-white hover:underline transition"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="text-sm text-white/60 hover:text-white font-medium transition"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => router.push("/signup")}
                    className="text-sm bg-white/10 border border-white/10 px-3 py-1.5 rounded-full font-medium hover:bg-white/20 transition"
                  >
                    Créer un compte
                  </button>
                </>
              )
            )}
          </div>
        </div>

        <div className="w-full max-w-lg flex-1 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
              <Logo size={22} />
            </div>
            <div>
              <Wordmark className="text-xl" />
              <p className="text-white/40 text-sm">Transforme ton cours en fiche de révision.</p>
            </div>
          </div>

          {/* Statut Pro actif */}
          {user && usage?.isPro && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm border border-[#7C3AED]/40 bg-gradient-to-r from-[#2563EB]/20 to-[#EC4899]/20 backdrop-blur-md flex items-center gap-2">
              <span className="text-lg">✨</span>
              <span className="font-medium">FishFlow Pro actif — générations illimitées</span>
            </div>
          )}

          {/* Carte Gratuit vs Pro */}
          {user && usage && !usage.isPro && (
            <div className="mb-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
              <div
                className={`px-5 py-3 text-sm font-medium ${
                  usage.remaining === 0
                    ? "bg-red-500/10 text-red-300"
                    : "bg-white/5 text-white/70"
                }`}
              >
                {usage.remaining === 0
                  ? "Tu as atteint ta limite gratuite de ce mois-ci."
                  : `${usage.remaining} fiche${usage.remaining! > 1 ? "s" : ""} gratuite${usage.remaining! > 1 ? "s" : ""} restante${usage.remaining! > 1 ? "s" : ""} ce mois-ci.`}
              </div>

              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-2">
                    Gratuit
                  </p>
                  <ul className="text-sm text-white/60 space-y-1.5">
                    <li>3 fiches / mois</li>
                    <li>Texte, PDF, photo</li>
                    <li>Export PDF</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold bg-gradient-to-r from-[#2563EB] to-[#EC4899] bg-clip-text text-transparent uppercase tracking-wide mb-2">
                    Pro
                  </p>
                  <ul className="text-sm text-white space-y-1.5">
                    <li className="font-medium">Fiches illimitées</li>
                    <li>Texte, PDF, photo</li>
                    <li>Export PDF</li>
                  </ul>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => router.push("/pricing")}
                  className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition"
                >
                  Passer Pro — 4,99 €/mois
                </button>
              </div>
            </div>
          )}

          {!user && !checkingAuth && (
            <div className="mb-4 px-4 py-2.5 rounded-lg text-sm border border-white/10 bg-white/5 text-white/50">
              Connecte-toi pour générer des fiches (3 gratuites par mois).
            </div>
          )}

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
            {/* Onglets source */}
            <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1">
              {(["text", "pdf", "photo"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setFile(null);
                  }}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${
                    mode === m
                      ? "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white"
                      : "text-white/50 hover:text-white/80"
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
                className="w-full h-40 p-4 border border-white/10 rounded-xl mb-5 text-white placeholder-white/30 bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
              />
            )}

            {(mode === "pdf" || mode === "photo") && (
              <label className="w-full mb-5 p-8 bg-white/5 border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#7C3AED]/50 hover:bg-white/10 transition">
                <span className="text-3xl mb-2">{mode === "pdf" ? "📄" : "🖼️"}</span>
                <span className="text-white font-medium text-sm mb-1">
                  {file ? file.name : `Choisir ${mode === "pdf" ? "un PDF" : "une photo"}`}
                </span>
                <span className="text-white/30 text-xs">
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

            {/* Choix des sorties */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                Sorties
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition ${
                      outputs.includes(opt.key)
                        ? "bg-white/10 border-[#7C3AED]/50 text-white"
                        : "bg-white/5 border-white/10 text-white/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={outputs.includes(opt.key)}
                      onChange={() => toggleOutput(opt.key)}
                      className="accent-[#7C3AED]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulté et longueur */}
            <div className="mb-7 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1">
                  Niveau
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] [&>option]:bg-[#0B0F1A]"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
                <p className="text-xs text-white/30 mt-1.5">Complexité du vocabulaire.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1">
                  Longueur
                </label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as Length)}
                  className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] [&>option]:bg-[#0B0F1A]"
                >
                  <option value="court">Court</option>
                  <option value="moyen">Moyen</option>
                  <option value="detaille">Détaillé</option>
                </select>
                <p className="text-xs text-white/30 mt-1.5">Quantité de contenu généré.</p>
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
              className="w-full py-3 rounded-xl font-display font-semibold bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition disabled:opacity-30 shadow-[0_0_30px_-10px_rgba(124,58,237,0.6)]"
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