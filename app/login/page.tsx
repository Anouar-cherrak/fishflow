"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";

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

    router.push("/generer");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2563EB] rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#7C3AED] rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">Connexion</h1>
        <p className="text-white/40 text-sm mb-6">Accède à ton compte</p>

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
          placeholder="Ton mot de passe"
        />

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition disabled:opacity-30"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-sm text-white/40 text-center mt-4">
          Pas encore de compte ?{" "}
          <button onClick={() => router.push("/signup")} className="text-white hover:underline">
            Créer un compte
          </button>
        </p>
      </div>
    </main>
  );
}