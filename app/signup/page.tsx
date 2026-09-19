"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { trackEvent } from "@/lib/tracking";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: undefined },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setStep("code");
    setMessage("Un code vient de t'être envoyé par email.");
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      setMessage("Code incorrect ou expiré. Vérifie et réessaie.");
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", { send_to: "AW-18394032288/P97kCIqRtegcEKDR-sJE" });
    }
    trackEvent("sign_up", { method: "email" });

    router.push("/generer");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-2xl p-8 ff-fade-up ff-card">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        {step === "form" ? (
          <>
            <h1 className="text-xl font-semibold mb-1">Créer un compte</h1>
            <p className="text-black/50 text-sm mb-6">Rejoins FishFlow</p>

            <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
              placeholder="toi@exemple.com"
            />

            <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
              placeholder="6 caractères minimum"
            />

            {message && (
              <p className="text-sm text-black bg-black/5 border border-black/15 rounded-lg p-3 mb-4 ff-fade">
                {message}
              </p>
            )}

            <button
              onClick={handleSignup}
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-lg font-medium bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition disabled:opacity-30 ff-btn"
            >
              {loading ? "Envoi du code..." : "Créer mon compte"}
            </button>

            <p className="text-xs text-black/40 text-center mt-4">
              Tes données restent privées · Résiliable en un clic
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-1">Vérifie ton email</h1>
            <p className="text-black/50 text-sm mb-6">Entre le code reçu à {email}</p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full p-3 border border-black/15 rounded-lg mb-4 bg-white text-black text-center text-2xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-black ff-input"
              placeholder="00000000"
            />

            {message && (
              <p className="text-sm text-black bg-black/5 border border-black/15 rounded-lg p-3 mb-4 ff-fade">
                {message}
              </p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length < 6}
              className="w-full py-2.5 rounded-lg font-medium bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition disabled:opacity-30 ff-btn"
            >
              {loading ? "Vérification..." : "Confirmer mon compte"}
            </button>

            <button
              onClick={() => { setStep("form"); setMessage(null); }}
              className="w-full mt-3 text-sm text-black/40 hover:text-black transition"
            >
              ← Modifier l'email
            </button>
          </>
        )}

        <p className="text-sm text-black/50 text-center mt-4">
          Déjà un compte ?{" "}
          <button onClick={() => router.push("/login")} className="text-black hover:underline font-medium ff-link-underline">
            Se connecter
          </button>
        </p>
      </div>
    </main>
  );
}