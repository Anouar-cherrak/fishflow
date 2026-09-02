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
    <main className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">Connexion</h1>
        <p className="text-black/50 text-sm mb-6">Accède à ton compte</p>

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
          placeholder="Ton mot de passe"
        />

        {error && (
          <p className="text-sm text-black bg-black/5 border border-black/20 rounded-lg p-3 mb-4 font-medium">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full py-2.5 rounded-lg font-medium bg-black text-white hover:bg-[#1a1a1a] transition disabled:opacity-30"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-sm text-black/50 text-center mt-4">
          Pas encore de compte ?{" "}
          <button onClick={() => router.push("/signup")} className="text-black hover:underline font-medium">
            Créer un compte
          </button>
        </p>
      </div>
    </main>
  );
}