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
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
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
        <h1 className="text-2xl font-bold tracking-tight mb-2">Mot de passe mis à jour</h1>
        <p className="text-black/60" role="status">Redirection...</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && ready && password && confirmPassword) handleSubmit();
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight mb-1">Nouveau mot de passe</h1>
        <p className="text-black/60 mb-6">Choisis un nouveau mot de passe pour ton compte.</p>

        <label htmlFor="field-1" className="text-sm font-semibold text-black/60 block mb-1.5">Nouveau mot de passe</label>
        <input id="field-1"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
          placeholder="Au moins 6 caractères"
        />

        <label htmlFor="field-2" className="text-sm font-semibold text-black/60 block mb-1.5">Confirme le mot de passe</label>
        <input id="field-2"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full min-h-[48px] px-4 border border-black/15 rounded-2xl mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent ff-input"
          placeholder="Retape le mot de passe"
        />

        {error && (
          <p role="alert" className="text-sm text-black bg-surface border border-black/20 rounded-2xl p-3 mb-4 font-medium ff-fade">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !ready || !password || !confirmPassword}
          className="w-full min-h-[48px] rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
        >
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
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
