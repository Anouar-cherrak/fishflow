"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/lazy";
import { pendingCopyPath } from "@/components/CopyFiche";

const ERRORS: Record<string, string> = {
  "google-annule": "Connexion avec Google annulée. Tu peux réessayer, ou utiliser ton email.",
  google: "La connexion avec Google n'a pas marché. Réessaie, ou utilise ton email et ton mot de passe.",
};

// Bouton « Continuer avec Google » : affiché seulement si NEXT_PUBLIC_GOOGLE_LOGIN vaut « oui ».
export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message renvoyé par /auth/callback (?erreur=…) quand la connexion Google a échoué ou a été annulée.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("erreur");
    if (code && ERRORS[code]) setError(ERRORS[code]);
  }, []);

  if (process.env.NEXT_PUBLIC_GOOGLE_LOGIN !== "oui") return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const next = encodeURIComponent(pendingCopyPath() ?? "/generer");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
      });
      if (error) throw error;
    } catch {
      setError("Pas de connexion à Internet, ou Google ne répond pas. Vérifie ton réseau, puis réessaie.");
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full min-h-[48px] rounded-full font-semibold bg-white text-black border border-black/15 hover:border-black/40 transition disabled:opacity-30 inline-flex items-center justify-center gap-3 ff-btn"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {loading ? "Ouverture de Google…" : "Continuer avec Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-black bg-white border border-black/20 rounded-2xl p-3 mt-3 ff-fade">
          {error}
        </p>
      )}
      <p className="flex items-center gap-3 text-xs text-black/60 mt-6" aria-hidden="true">
        <span className="h-px flex-1 bg-black/15" />
        ou avec ton email
        <span className="h-px flex-1 bg-black/15" />
      </p>
    </div>
  );
}
