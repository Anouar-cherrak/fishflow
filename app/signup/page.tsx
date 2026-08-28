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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Conversion Google Ads
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", {
        send_to: "AW-18394032288/P97kCIqRtegcEKDR-sJE",
      });
    }

    // Événement GA4
    trackEvent("sign_up", { method: "email" });

    setMessage("Compte créé ! Vérifie ta boîte mail pour confirmer ton inscription.");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#EC4899] rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2563EB] rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">Créer un compte</h1>
        <p className="text-white/40 text-sm mb-6">Rejoins FishFlow</p>

        <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2.5 border border-white/10 rounded-lg mb-4 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          placeholder="toi@exemple.com"
        />

        <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 border border-white/10 rounded-lg mb-4 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          placeholder="6 caractères minimum"
        />

        {message && (
          <p className="text-sm text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            {message}
          </p>
        )}

        <button
          onClick={handleSignup}
          disabled={loading || !email || !password}
          className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition disabled:opacity-30"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="text-sm text-white/40 text-center mt-4">
          Déjà un compte ?{" "}
          <button onClick={() => router.push("/login")} className="text-white hover:underline">
            Se connecter
          </button>
        </p>
      </div>
    </main>
  );
}