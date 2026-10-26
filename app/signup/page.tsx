"use client";
import { pendingCopyPath } from "@/components/CopyFiche";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { preloadSupabase } from "@/lib/supabase/lazy";
import { postAuth } from "@/lib/auth-client";
import { AuthLayout } from "@/components/AuthLayout";
import { trackEvent } from "@/lib/tracking";
import { track } from "@/lib/track";
import { GoogleButton } from "@/components/GoogleButton";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();
  // Supabase se télécharge en arrière-plan après l'affichage : prêt avant qu'on valide le formulaire.
  useEffect(preloadSupabase, []);

  const handleSignup = async () => {
    setLoading(true);
    setMessage(null);
    // Inscription par le serveur : limite d'emails envoyés, et même réponse que l'email soit déjà inscrit ou non.
    const result = await postAuth("signup", { email, password });

    if (!result.ok) {
      if (result.field) setFieldError({ [result.field]: result.error });
      else setMessage(result.error ?? null);
      setLoading(false);
      return;
    }

    setStep("code");
    setMessage(result.message ?? "Un code vient de t'être envoyé par email.");
    setCooldown(60);
    setLoading(false);
  };

  // Compte à rebours avant de pouvoir redemander un code
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setMessage(null);
    setCooldown(60);
    const result = await postAuth("resend", { email });
    setMessage(result.ok ? "Nouveau code envoyé. Regarde aussi dans tes spams." : result.error ?? null);
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage(null);
    // Vérification par le serveur (blocage progressif après 3 mauvais codes) : il pose lui-même le cookie de session.
    const result = await postAuth("verify", { email, code });

    if (!result.ok) {
      setMessage(result.error ?? null);
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", { send_to: "AW-18394032288/P97kCIqRtegcEKDR-sJE" });
    }
    trackEvent("sign_up", { method: "email" });
    track("signup");

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
          if (step === "form") {
            const next: { email?: string; password?: string } = {};
            if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = email.trim() ? "Cette adresse email semble incomplète. Exemple : toi@exemple.com" : "Écris ton adresse email. Exemple : toi@exemple.com";
            if (password.length < 8) next.password = "Choisis un mot de passe d'au moins 8 caractères.";
            setFieldError(next);
            if (!next.email && !next.password) handleSignup();
          }
          if (step === "code" && code.length >= 6) handleVerify();
        }}
      >
        {step === "form" ? (
          <>
            <h1 className="ff-h2 mb-2">Crée ton compte gratuit</h1>
            <p className="ff-muted mb-6">Sans carte bancaire. Ta première fiche est prête en moins d&apos;une minute.</p>
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
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ff-field mb-5"
              placeholder="8 caractères minimum"
              aria-invalid={!!fieldError.password || undefined}
              aria-describedby={fieldError.password ? "password-error" : "password-help"}
            />
            {fieldError.password ? (
              <p id="password-error" role="alert" className="ff-error -mt-3 mb-5">{fieldError.password}</p>
            ) : (
              <p id="password-help" className="ff-hint -mt-3 mb-4">Au moins 8 caractères. Évite « 12345678 » : il est refusé.</p>
            )}

            <label className="flex items-center gap-3 text-[15px] min-h-[44px] -mt-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} className="w-5 h-5 accent-[var(--ff-accent)]" />
              Afficher le mot de passe
            </label>

            {message && (
              <p role="alert" className="ff-alert mb-4">
                {message}
              </p>
            )}

            <p role="note" className="text-[15px] ff-muted mb-5">
              Tu vas recevoir un code par email. <strong>Regarde aussi dans tes spams</strong> (courrier indésirable).
            </p>

            <button
              type="submit"
              disabled={loading}
              className="ff-primary w-full"
            >
              {loading ? "Envoi du code…" : "Créer mon compte"}
            </button>

          </>
        ) : (
          <>
            <h1 className="ff-h2 mb-2">Vérifie ton email</h1>
            <p className="ff-muted mb-2">Tape le code reçu à l&apos;adresse {email}.</p>
            <p role="note" className="ff-alert mb-6">
              <strong>Pense aux spams.</strong> Le mail avec ton code arrive souvent dans le courrier indésirable. Il vient de FishFlow.
            </p>

            <label htmlFor="signup-code" className="sr-only">Code reçu par email</label>
            <input
              id="signup-code"
              type="text"
              inputMode="numeric"
              maxLength={10}
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="ff-field mb-5 min-h-[56px] text-center text-2xl tracking-[0.3em]"
              placeholder="000000"
            />

            {message && (
              <p role="alert" className="ff-alert mb-4">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="ff-primary w-full"
            >
              {loading ? "Vérification…" : "Confirmer mon compte"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="ff-secondary w-full mt-3 disabled:opacity-40"
            >
              {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("form"); setMessage(null); setCode(""); }}
              className="ff-link w-full mt-3 min-h-[44px]"
            >
              Modifier l'email
            </button>
            <p className="text-[15px] ff-muted text-center mt-2">
              Tu avais déjà un compte avec cet email ? Dans ce cas, aucun code n&apos;est envoyé :{" "}
              <Link href="/login" className="ff-link">connecte-toi</Link>.
            </p>
          </>
        )}
      </form>

        <p className="ff-muted text-center mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="ff-link inline-flex items-center min-h-[44px] px-1">
            Se connecter
          </Link>
        </p>
    </AuthLayout>
  );
}