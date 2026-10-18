"use client";
import { pendingCopyPath } from "@/components/CopyFiche";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, preloadSupabase } from "@/lib/supabase/lazy";
import { AuthLayout } from "@/components/AuthLayout";
import { trackEvent } from "@/lib/tracking";
import { track } from "@/lib/track";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Messages de Supabase traduits en français simple.
function frenchAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return "Un compte existe déjà avec cet email. Connecte-toi plutôt.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("leaked")) return "Ce mot de passe est trop facile à deviner. Choisis-en un autre.";
  if (m.includes("password")) return "Ton mot de passe doit faire au moins 6 caractères.";
  if (m.includes("email") && (m.includes("invalid") || m.includes("valid"))) return "Cette adresse email n'est pas valide. Vérifie-la.";
  if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) return "Trop d'essais d'un coup. Attends une minute puis réessaie.";
  return "Le compte n'a pas pu être créé. Vérifie ton adresse email, puis réessaie.";
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
    const supabase = await getSupabase();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: undefined },
    });

    if (error) {
      setMessage(frenchAuthError(error.message));
      setLoading(false);
      return;
    }

    setStep("code");
    setMessage("Un code vient de t'être envoyé par email.");
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
    const { error } = await (await getSupabase()).auth.resend({ type: "signup", email });
    setMessage(error ? "Impossible de renvoyer le code pour l'instant. Réessaie dans une minute." : "Nouveau code envoyé. Regarde aussi dans tes spams.");
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = await getSupabase();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      setMessage("Ce code ne marche pas : il est faux ou trop ancien. Vérifie-le, ou demande un nouveau code.");
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
            if (password.length < 6) next.password = "Choisis un mot de passe d'au moins 6 caractères.";
            setFieldError(next);
            if (!next.email && !next.password) handleSignup();
          }
          if (step === "code" && code.length >= 6) handleVerify();
        }}
      >
        {step === "form" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Crée ton compte gratuit</h1>
            <p className="text-black/60 mb-6">Sans carte bancaire. Ta première fiche est prête en moins d&apos;une minute.</p>

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
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ff-input"
              placeholder="6 caractères minimum"
              aria-invalid={!!fieldError.password || undefined}
              aria-describedby={fieldError.password ? "password-error" : "password-help"}
            />
            {fieldError.password ? (
              <p id="password-error" role="alert" className="text-sm text-[var(--quiz-wrong-text)] -mt-3 mb-4">{fieldError.password}</p>
            ) : (
              <p id="password-help" className="text-xs text-black/60 -mt-3 mb-4">Au moins 6 caractères. Évite « 123456 » : il est refusé.</p>
            )}

            <label className="flex items-center gap-2 text-sm text-black/70 min-h-[44px] -mt-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} className="w-4 h-4 accent-[var(--ff-accent)]" />
              Afficher le mot de passe
            </label>

            {message && (
              <p role="alert" className="text-sm text-black bg-white border border-black/20 rounded-2xl p-3 mb-4 ff-fade">
                {message}
              </p>
            )}

            <p role="note" className="text-sm text-black/80 mb-4">
              Tu vas recevoir un code par email. <strong>Regarde aussi dans tes spams</strong> (courrier indésirable).
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-full font-semibold bg-accent text-on-accent hover:bg-accent-strong transition disabled:opacity-30 ff-btn"
            >
              {loading ? "Envoi du code…" : "Créer mon compte"}
            </button>

            <p className="text-xs text-black/40 text-center mt-4">
              Tes données restent privées. Aucune carte bancaire demandée.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Vérifie ton email</h1>
            <p className="text-black/60 mb-2">Tape le code reçu à l&apos;adresse {email}.</p>
            <p role="note" className="text-sm text-black bg-white border border-accent rounded-2xl p-3 mb-6">
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
              className="w-full min-h-[56px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-center text-2xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ff-input"
              placeholder="000000"
            />

            {message && (
              <p role="alert" className="text-sm text-black bg-white border border-black/20 rounded-2xl p-3 mb-4 ff-fade">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full min-h-[48px] rounded-full font-semibold bg-accent text-on-accent hover:bg-accent-strong transition disabled:opacity-30 ff-btn"
            >
              {loading ? "Vérification…" : "Confirmer mon compte"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="w-full mt-3 text-sm text-black/70 hover:text-black transition disabled:opacity-50 min-h-[44px]"
            >
              {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("form"); setMessage(null); setCode(""); }}
              className="w-full mt-3 text-sm text-black/60 hover:text-black transition min-h-[44px]"
            >
              ← Modifier l'email
            </button>
            <p className="text-xs text-black/60 text-center mt-2">
              Tu avais déjà un compte avec cet email ? Dans ce cas, aucun code n&apos;est envoyé :{" "}
              <button type="button" onClick={() => router.push("/login")} className="underline">connecte-toi</button>.
            </p>
          </>
        )}
      </form>

        <p className="text-sm text-black/50 text-center mt-4">
          Déjà un compte ?{" "}
          <button type="button" onClick={() => router.push("/login")} className="inline-flex items-center min-h-[44px] px-1 text-black underline underline-offset-4 font-medium">
            Se connecter
          </button>
        </p>
    </AuthLayout>
  );
}