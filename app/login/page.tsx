"use client";
import { pendingCopyPath } from "@/components/CopyFiche";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { preloadSupabase } from "@/lib/supabase/lazy";
import { postAuth } from "@/lib/auth-client";
import { AuthLayout } from "@/components/AuthLayout";
import { trackEvent } from "@/lib/tracking";
import { GoogleButton } from "@/components/GoogleButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();
  // Supabase se télécharge en arrière-plan après l'affichage : prêt avant qu'on clique sur « Se connecter ».
  useEffect(preloadSupabase, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    // Connexion par le serveur (blocage progressif après 3 erreurs) : il pose lui-même le cookie de session.
    const result = await postAuth("login", { email, password });

    if (!result.ok) {
      setError(result.error ?? null);
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
        <h1 className="ff-h2 mb-2">Connexion</h1>
        <p className="ff-muted mb-6">Retrouve tes fiches et tes révisions.</p>
        <GoogleButton />

        <label htmlFor="field-1" className="ff-label">Email</label>
        <input id="field-1"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ff-field mb-5"
          placeholder="toi@exemple.com"
          aria-invalid={!!fieldError.email || undefined}
          aria-describedby={fieldError.email ? "email-error" : undefined}
        />
        {fieldError.email && <p id="email-error" role="alert" className="ff-error -mt-3 mb-5">{fieldError.email}</p>}

        <label htmlFor="field-2" className="ff-label">Mot de passe</label>
        <input id="field-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ff-field mb-2"
          placeholder="Ton mot de passe"
          aria-invalid={!!fieldError.password || undefined}
          aria-describedby={fieldError.password ? "password-error" : undefined}
        />
        {fieldError.password && <p id="password-error" role="alert" className="ff-error mb-2">{fieldError.password}</p>}

        <p className="text-right mb-4">
          <Link href="/reset-password" className="ff-link inline-flex items-center min-h-[44px] text-[15px]">
            Mot de passe oublié ?
          </Link>
        </p>

        {error && (
          <p role="alert" className="ff-alert mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="ff-primary w-full"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

        <p className="ff-muted text-center mt-6">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="ff-link inline-flex items-center min-h-[44px] px-1">
            Créer un compte
          </Link>
        </p>
    </AuthLayout>
  );
}