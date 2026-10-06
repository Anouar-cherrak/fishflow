"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
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
    <AuthLayout>
        {step === "form" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Créer un compte</h1>
            <p className="text-black/60 mb-6">Rejoins FishFlow</p>

            <label htmlFor="field-1" className="text-sm font-semibold text-black/60 block mb-1.5">Email</label>
            <input id="field-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
              placeholder="toi@exemple.com"
            />

            <label htmlFor="field-2" className="text-sm font-semibold text-black/60 block mb-1.5">Mot de passe</label>
            <input id="field-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
              placeholder="6 caractères minimum"
            />

            {message && (
              <p className="text-sm text-black bg-white border border-black/20 rounded-2xl p-3 mb-4 ff-fade">
                {message}
              </p>
            )}

            <button
              onClick={handleSignup}
              disabled={loading || !email || !password}
              className="w-full min-h-[48px] rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
            >
              {loading ? "Envoi du code..." : "Créer mon compte"}
            </button>

            <p className="text-xs text-black/40 text-center mt-4">
              Tes données restent privées · Résiliable en un clic
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Vérifie ton email</h1>
            <p className="text-black/60 mb-6">Entre le code reçu à {email}</p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full min-h-[56px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-center text-2xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
              placeholder="00000000"
            />

            {message && (
              <p className="text-sm text-black bg-white border border-black/20 rounded-2xl p-3 mb-4 ff-fade">
                {message}
              </p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length < 6}
              className="w-full min-h-[48px] rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
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
    </AuthLayout>
  );
}