"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";

function ConfirmContent() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Champ concerné par l'erreur (1 = mot de passe, 2 = confirmation) : l'erreur s'affiche sous ce champ.
  const [bad, setBad] = useState<1 | 2 | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const exchange = async () => {
      const url = window.location.href;
      if (url.includes("code=")) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          setError("Ce lien est invalide ou expiré. Redemande un lien depuis la page de connexion.");
        }
      }
      setReady(true);
    };
    exchange();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setBad(1);
      setError("Choisis un mot de passe d'au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setBad(2);
      setError("Les deux mots de passe ne sont pas pareils. Retape-le à l'identique.");
      return;
    }
    setBad(null);
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Impossible de mettre à jour le mot de passe. Redemande un lien.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/generer"), 1500);
  };

  if (done) {
    return (
      <AuthLayout>
        <h1 className="ff-h2 mb-2">Mot de passe mis à jour</h1>
        <p className="ff-muted" role="status">Redirection…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && ready) handleSubmit();
        }}
      >
        <h1 className="ff-h2 mb-2">Nouveau mot de passe</h1>
        <p className="ff-muted mb-6">Choisis un nouveau mot de passe pour ton compte.</p>

        <label htmlFor="field-1" className="ff-label">Nouveau mot de passe</label>
        <input id="field-1"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ff-field mb-5"
          placeholder="Au moins 8 caractères"
          aria-invalid={bad === 1 || undefined}
          aria-describedby={bad === 1 ? "pwd-error" : undefined}
        />
        {bad === 1 && <p id="pwd-error" role="alert" className="ff-error -mt-3 mb-5">{error}</p>}

        <label htmlFor="field-2" className="ff-label">Confirme le mot de passe</label>
        <input id="field-2"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="ff-field mb-5"
          placeholder="Retape le mot de passe"
          aria-invalid={bad === 2 || undefined}
          aria-describedby={bad === 2 ? "pwd2-error" : undefined}
        />
        {bad === 2 && <p id="pwd2-error" role="alert" className="ff-error -mt-3 mb-5">{error}</p>}

        {error && !bad && (
          <p role="alert" className="ff-alert mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !ready}
          className="ff-primary w-full"
        >
          {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordConfirm() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
