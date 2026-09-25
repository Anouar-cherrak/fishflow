"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";

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
      <main className="min-h-screen bg-white text-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white border border-black/10 rounded-2xl p-8 text-center ff-fade-up ff-card">
          <h1 className="text-xl font-semibold mb-2">Mot de passe mis à jour</h1>
          <p className="text-black/50 text-sm">Redirection...</p>
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

        <h1 className="text-xl font-semibold mb-1">Nouveau mot de passe</h1>
        <p className="text-black/50 text-sm mb-6">Choisis un nouveau mot de passe pour ton compte.</p>

        <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Nouveau mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
          placeholder="Au moins 6 caractères"
        />

        <label className="text-xs font-semibold text-black/40 uppercase tracking-wide block mb-1">Confirme le mot de passe</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-2.5 border border-black/15 rounded-lg mb-4 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
          placeholder="Retape le mot de passe"
        />

        {error && (
          <p className="text-sm text-black bg-black/5 border border-black/20 rounded-lg p-3 mb-4 font-medium ff-fade">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !ready || !password || !confirmPassword}
          className="w-full py-2.5 rounded-lg font-medium bg-[#22C55E] text-[#ffffff] hover:bg-[#16A34A] transition disabled:opacity-30 ff-btn"
        >
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </div>
    </main>
  );
}

export default function ResetPasswordConfirm() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
