"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { AppShell } from "@/components/AppShell";
import { trackEvent } from "@/lib/tracking";

// Même contenu que le tableau de la page d'accueil : ce qui est gratuit, ce qui est Pro.
const ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Fiches générées", free: "3 par mois", pro: "Illimitées" },
  { label: "Résumé, fiche, flashcards", free: "Oui", pro: "Oui" },
  { label: "Quiz", free: "À lire, avec les bonnes réponses", pro: "À jouer, 12 questions, meilleur score" },
  { label: "Réviser avec rappels", free: "Oui", pro: "Oui" },
  { label: "Apprendre (poser une question)", free: "1 essai", pro: "20 questions par jour" },
  { label: "Documents", free: "Courts et moyens", pro: "Volumineux, plusieurs PDF fusionnés" },
  { label: "Résumé lu à voix haute", free: "Non", pro: "Oui" },
  { label: "Historique de fiches", free: "5 fiches", pro: "Illimité" },
];

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

  if (checkingStatus) {
    return (
      <AppShell size="form">
        <p className="text-black/40 text-sm text-center py-20" role="status">Chargement...</p>
      </AppShell>
    );
  }

  if (isPro) {
    return (
      <AppShell size="form">
        <div className="w-full max-w-sm mx-auto bg-white border border-black/10 rounded-2xl p-8 text-center ff-fade-up ff-card">
          <h1 className="text-xl font-semibold mb-1">Tu es déjà FishFlow Pro</h1>
          <p className="text-black/50 text-sm mb-6">Génération illimitée déjà active sur ton compte.</p>
          <button onClick={() => router.push("/generer")} className="w-full py-3 rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition ff-btn">
            Retour à l'outil
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell size="wide">
      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-2">Gratuit ou Pro.</h1>
        <p className="ff-lead">Ce que tu as vraiment dans chaque formule. Tu peux arrêter Pro quand tu veux.</p>
      </div>

      <div className="grid gap-6 lg:gap-10 grid-cols-[minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)] items-start">
        <div className="bg-white border border-[#22C55E]/60 rounded-3xl p-8 text-center ff-fade-up ff-card lg:sticky lg:top-24">
          <div className="flex items-center justify-center gap-2 mb-5">
            <Logo size={24} />
            <Wordmark />
          </div>

          <h2 className="text-xl font-semibold mb-1">FishFlow Pro</h2>
          <p className="text-black/60 text-sm mb-5">Génération illimitée de fiches de révision.</p>

          <div className="text-4xl font-extrabold mb-1">4,99 €</div>
          <p className="text-black/55 text-sm mb-6">par mois, résiliable à tout moment</p>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition disabled:opacity-50 ff-btn"
          >
            {loading ? "Redirection..." : "Passer Pro"}
          </button>

          <button onClick={() => router.push("/generer")} className="w-full mt-3 text-sm text-black/55 hover:text-black hover:underline transition ff-link-underline min-h-[44px]">
            Retour
          </button>
        </div>

        <div className="ff-fade-up min-w-0">
          <div className="overflow-x-auto rounded-3xl border border-black/10 bg-surface" tabIndex={0} role="region" aria-label="Comparaison Gratuit et Pro">
            <table className="w-full text-sm text-left min-w-[560px]">
              <thead>
                <tr className="border-b border-black/10">
                  <th scope="col" className="p-4"><span className="sr-only">Fonctionnalité</span></th>
                  <th scope="col" className="p-4 font-semibold">Gratuit</th>
                  <th scope="col" className="p-4 font-semibold"><span className="border-b-2 border-[#22C55E] pb-0.5">Pro</span></th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-black/10 last:border-0 align-top">
                    <th scope="row" className="p-4 font-medium">{row.label}</th>
                    <td className="p-4 text-black/65">{row.free}</td>
                    <td className="p-4">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-black/50 mt-4">Paiement sécurisé par Stripe. Tes fiches restent privées.</p>
        </div>
      </div>
    </AppShell>
  );
}
