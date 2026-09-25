"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";

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
      <main className="min-h-screen bg-white text-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white border border-black/10 rounded-2xl p-8 text-center ff-fade-up ff-card">
          <h1 className="text-xl font-semibold mb-2">Email envoyé</h1>
          <p className="text-black/50 text-sm">
            Si un compte existe avec cet email, tu vas recevoir un lien pour réinitialiser ton mot de passe.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-2xl p-8 ff-fade-up ff-card">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">Mot de passe oublié</h1>
        <p className="text-black/50 text-sm mb-6">On t'envoie un lien pour le réinitialiser.</p>

        <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
          placeholder="toi@exemple.com"
        />

        {error && (
          <p className="text-sm text-black bg-black/5 border border-black/20 rounded-lg p-3 mb-4 font-medium ff-fade">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          className="w-full py-2.5 rounded-lg font-medium bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
        >
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>

        <p className="text-sm text-black/50 text-center mt-4">
          <Link href="/login" className="text-black hover:underline font-medium ff-link-underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
