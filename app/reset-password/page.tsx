"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });
    setLoading(false);
    if (error) {
      setError("Une erreur est survenue. Réessaie.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Email envoyé</h1>
        <p className="text-black/60">
          Si un compte existe avec cet email, tu vas recevoir un lien pour réinitialiser ton mot de passe. <strong>Regarde aussi dans tes spams.</strong>
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
          if (!loading && email) handleSubmit();
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight mb-1">Mot de passe oublié</h1>
        <p className="text-black/60 mb-6">On t'envoie un lien pour le réinitialiser.</p>

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

        {error && (
          <p role="alert" className="text-sm text-black bg-surface border border-black/20 rounded-2xl p-3 mb-4 font-medium ff-fade">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full min-h-[48px] rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
        >
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

        <p className="text-sm text-black/50 text-center mt-4">
          <Link href="/login" className="text-black hover:underline font-medium ff-link-underline">
            Retour à la connexion
          </Link>
        </p>
    </AuthLayout>
  );
}
