"use client";
import { pendingCopyPath } from "@/components/CopyFiche";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
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
    router.push(pendingCopyPath() ?? "/aujourdhui");
    router.refresh();
  };

  return (
    <AuthLayout>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Connexion</h1>
        <p className="text-black/60 mb-6">Accède à ton compte</p>

        <label htmlFor="field-1" className="text-sm font-semibold text-black/60 block mb-1.5">Email</label>
        <input id="field-1"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
          placeholder="toi@exemple.com"
        />

        <label htmlFor="field-2" className="text-sm font-semibold text-black/60 block mb-1.5">Mot de passe</label>
        <input id="field-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-2 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
          placeholder="Ton mot de passe"
        />

        <p className="text-right mb-4">
          <Link href="/reset-password" className="text-xs text-black/40 hover:text-black hover:underline transition">
            Mot de passe oublié ?
          </Link>
        </p>

        {error && (
          <p className="text-sm text-black bg-surface border border-black/20 rounded-2xl p-3 mb-4 font-medium ff-fade">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full min-h-[48px] rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-sm text-black/50 text-center mt-4">
          Pas encore de compte ?{" "}
          <button onClick={() => router.push("/signup")} className="text-black hover:underline font-medium ff-link-underline">
            Créer un compte
          </button>
        </p>
    </AuthLayout>
  );
}