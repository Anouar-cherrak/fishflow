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
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message.toLowerCase().includes("not confirmed")
          ? "Ton email n'est pas encore confirmé. Refais l'inscription avec le même email pour recevoir un nouveau code (pense aux spams)."
          : "Email ou mot de passe incorrect. Vérifie les deux, ou utilise « Mot de passe oublié ? »."
      );
      setLoading(false);
      return;
    }

    trackEvent("login", { method: "email" });
    router.push(pendingCopyPath() ?? "/generer");
    router.refresh();
  };

  return (
    <AuthLayout>
      <form
        noValidate
        onSubmit={(e) => {
          // La touche « OK » du clavier du téléphone valide le formulaire.
          e.preventDefault();
          if (loading) return;
          const next: { email?: string; password?: string } = {};
          if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = email.trim() ? "Cette adresse email semble incomplète. Exemple : toi@exemple.com" : "Écris ton adresse email. Exemple : toi@exemple.com";
          if (!password) next.password = "Écris ton mot de passe.";
          setFieldError(next);
          if (next.email || next.password) return;
          handleLogin();
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight mb-1">Connexion</h1>
        <p className="text-black/60 mb-6">Retrouve tes fiches et tes révisions.</p>

        <label htmlFor="field-1" className="text-sm font-semibold text-black/60 block mb-1.5">Email</label>
        <input id="field-1"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ff-input"
          placeholder="toi@exemple.com"
          aria-invalid={!!fieldError.email || undefined}
          aria-describedby={fieldError.email ? "email-error" : undefined}
        />
        {fieldError.email && <p id="email-error" role="alert" className="text-sm text-[var(--quiz-wrong-text)] -mt-3 mb-4">{fieldError.email}</p>}

        <label htmlFor="field-2" className="text-sm font-semibold text-black/60 block mb-1.5">Mot de passe</label>
        <input id="field-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-2 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ff-input"
          placeholder="Ton mot de passe"
          aria-invalid={!!fieldError.password || undefined}
          aria-describedby={fieldError.password ? "password-error" : undefined}
        />
        {fieldError.password && <p id="password-error" role="alert" className="text-sm text-[var(--quiz-wrong-text)] mb-2">{fieldError.password}</p>}

        <p className="text-right mb-4">
          <Link href="/reset-password" className="inline-flex items-center min-h-[44px] text-sm text-black/60 hover:text-black hover:underline transition">
            Mot de passe oublié ?
          </Link>
        </p>

        {error && (
          <p role="alert" className="text-sm text-black bg-surface border border-black/20 rounded-2xl p-3 mb-4 font-medium ff-fade">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] rounded-full font-semibold bg-accent text-on-accent hover:bg-accent-strong transition disabled:opacity-30 ff-btn"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

        <p className="text-sm text-black/50 text-center mt-4">
          Pas encore de compte ?{" "}
          <button type="button" onClick={() => router.push("/signup")} className="inline-flex items-center min-h-[44px] px-1 text-black underline underline-offset-4 font-medium">
            Créer un compte
          </button>
        </p>
    </AuthLayout>
  );
}