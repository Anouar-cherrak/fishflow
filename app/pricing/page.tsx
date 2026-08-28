"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { trackEvent } from "@/lib/tracking";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        const res = await fetch("/api/usage");
        const data = await res.json();
        setIsPro(!!data.isPro);
      } catch {
        // en cas d'échec, on laisse la page normale s'afficher
      } finally {
        setCheckingStatus(false);
      }
    };

    check();
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur, réessaie.");
        setLoading(false);
        return;
      }

      trackEvent("clic_passage_premium");
      window.location.href = data.url;
    } catch {
      alert("Erreur de connexion. Réessaie.");
      setLoading(false);
    }
  };

  const Background = () => (
    <>
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2563EB] rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#EC4899] rounded-full blur-3xl opacity-20 pointer-events-none" />
    </>
  );

  if (checkingStatus) {
    return (
      <main className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <p className="text-white/30 text-sm">Chargement...</p>
      </main>
    );
  }

  if (isPro) {
    return (
      <main className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4 relative overflow-hidden">
        <Background />
        <div className="relative w-full max-w-sm bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">✨</div>
          <h1 className="text-xl font-semibold mb-1">Tu es déjà FishFlow Pro</h1>
          <p className="text-white/40 text-sm mb-6">
            Génération illimitée déjà active sur ton compte.
          </p>
          <button
            onClick={() => router.push("/generer")}
            className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition"
          >
            Retour à l'outil
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4 relative overflow-hidden">
      <Background />
      <div className="relative w-full max-w-sm bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size={24} />
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold mb-1">FishFlow Pro</h1>
        <p className="text-white/40 text-sm mb-6">Génération illimitée de fiches de révision.</p>

        <div className="text-3xl font-bold mb-1">4,99 €</div>
        <p className="text-white/30 text-sm mb-6">par mois, résiliable à tout moment</p>

        <ul className="text-left text-sm text-white/60 space-y-2 mb-6">
          <li>✓ Fiches illimitées</li>
          <li>✓ Texte, PDF et photo</li>
          <li>✓ Résumé, fiche, flashcards, quiz</li>
          <li>✓ Export PDF</li>
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Redirection..." : "Passer Pro"}
        </button>

        <button
          onClick={() => router.push("/generer")}
          className="w-full mt-3 text-sm text-white/40 hover:text-white hover:underline transition"
        >
          Retour
        </button>
      </div>
    </main>
  );
}