"use client";

import { useState } from "react";
import Link from "next/link";
import { postAuth } from "@/lib/auth-client";
import { AuthLayout } from "@/components/AuthLayout";

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    // Par le serveur : limite d'envois par adresse et par IP, et même réponse que le compte existe ou non.
    const result = await postAuth("reset", { email: email.trim() });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Le lien n'a pas pu être envoyé. Vérifie ton adresse email, puis réessaie.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout>
        <h1 className="ff-h2 mb-2">Email envoyé</h1>
        <p className="ff-muted">
          Si un compte existe avec cette adresse, tu vas recevoir un lien pour choisir un nouveau mot de passe. <strong>Regarde aussi dans tes spams.</strong>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (loading) return;
          const bad = /^S+@S+.S+$/.test(email.trim()) ? null : email.trim() ? "Cette adresse email semble incomplète. Exemple : toi@exemple.com" : "Écris ton adresse email. Exemple : toi@exemple.com";
          setEmailError(bad);
          if (!bad) handleSubmit();
        }}
      >
        <h1 className="ff-h2 mb-2">Mot de passe oublié</h1>
        <p className="ff-muted mb-6">Tape ton adresse email : on t&apos;envoie un lien pour choisir un nouveau mot de passe.</p>

        <label htmlFor="field-1" className="ff-label">Email</label>
        <input id="field-1"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ff-field mb-5"
          placeholder="toi@exemple.com"
          aria-invalid={!!emailError || undefined}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError && <p id="email-error" role="alert" className="ff-error -mt-3 mb-5">{emailError}</p>}

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
          {loading ? "Envoi…" : "Envoyer le lien"}
        </button>
      </form>

        <p className="text-center mt-6">
          <Link href="/login" className="ff-link inline-flex items-center min-h-[44px]">
            Retour à la connexion
          </Link>
        </p>
    </AuthLayout>
  );
}
