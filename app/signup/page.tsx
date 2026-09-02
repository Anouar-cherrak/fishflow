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

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", { send_to: "AW-18394032288/P97kCIqRtegcEKDR-sJE" });
    }

    trackEvent("sign_up", { method: "email" });
    setMessage("Compte créé ! Vérifie ta boîte mail pour confirmer ton inscription (pense aussi à regarder tes spams).");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">Créer un compte</h1>
        <p className="text-black/50 text-sm mb-6">Rejoins FishFlow</p>

        <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="toi@exemple.com"
        />

        <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="6 caractères minimum"
        />

        {message && (
          <p className="text-sm text-black bg-[#F4F4F5] border border-black/15 rounded-lg p-3 mb-4">
            {message}
          </p>
        )}

        <button
          onClick={handleSignup}
          disabled={loading || !email || !password}
          className="w-full py-2.5 rounded-lg font-medium bg-black text-white hover:bg-[#1a1a1a] transition disabled:opacity-30"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="text-xs text-black/40 text-center mt-4 flex items-center justify-center gap-1.5">
          🔒 Tes données restent privées · Résiliable en un clic
        </p>

        <p className="text-sm text-black/50 text-center mt-3">
          Déjà un compte ?{" "}
          <button onClick={() => router.push("/login")} className="text-black hover:underline font-medium">
            Se connecter
          </button>
        </p>
      </div>
    </main>
  );
}