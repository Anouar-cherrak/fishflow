"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { trackEvent } from "@/lib/tracking";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    trackEvent("login", { method: "email" });

    router.push("/generer");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#F7F5FC] text-[#1E1533] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">Connexion</h1>
        <p className="text-[#1E1533]/50 text-sm mb-6">Accède à ton compte</p>

        <label className="text-xs font-semibold text-[#1E1533]/40 uppercase tracking-wide block mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2.5 border border-[#6D28D9]/15 rounded-lg mb-4 bg-[#F7F5FC] text-[#1E1533] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          placeholder="toi@exemple.com"
        />

        <label className="text-xs font-semibold text-[#1E1533]/40 uppercase tracking-wide block mb-1">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 border border-[#6D28D9]/15 rounded-lg mb-4 bg-[#F7F5FC] text-[#1E1533] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          placeholder="Ton mot de passe"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full py-2.5 rounded-lg font-medium bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition disabled:opacity-30"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-sm text-[#1E1533]/50 text-center mt-4">
          Pas encore de compte ?{" "}
          <button onClick={() => router.push("/signup")} className="text-[#6D28D9] hover:underline">
            Créer un compte
          </button>
        </p>
      </div>
    </main>
  );
}