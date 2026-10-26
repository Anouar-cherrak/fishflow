"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/lazy";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";
import { AppShell } from "@/components/AppShell";
import { trackEvent } from "@/lib/tracking";
import { TrackView } from "@/components/TrackView";
import { FAQ } from "@/components/landing/content";

// Seulement ce qui change entre Gratuit et Pro. Le reste est identique et résumé en une phrase sous le tableau.
const ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Fiches créées", free: "3 par mois", pro: "100 par mois (10 par jour)" },
  { label: "Quiz", free: "À jouer, avec ton meilleur score", pro: "À jouer, 12 questions par quiz" },
  { label: "Apprendre (poser une question)", free: "1 essai", pro: "20 questions par jour" },
  { label: "Taille d'un cours", free: "Jusqu'à 7 pages environ", pro: "Jusqu'à 15 pages environ, plusieurs PDF dans une seule fiche" },
  { label: "Progression", free: "7 derniers jours", pro: "30 jours, taux de réussite, cartes difficiles" },
  { label: "Résumé lu à voix haute", free: "Non", pro: "Oui" },
  { label: "Historique de fiches", free: "5 fiches", pro: "Toutes tes fiches gardées" },
];

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      // Pas de session : visiteur non connecté, inutile de télécharger Supabase.
      if (!hasAuthCookie()) {
        setCheckingStatus(false);
        return;
      }
      const supabase = await getSupabase();
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
        alert(data.error || "Le paiement n'a pas pu s'ouvrir. Réessaie.");
        setLoading(false);
        return;
      }
      trackEvent("clic_passage_premium");
      window.location.href = data.url;
    } catch {
      alert("La connexion a été coupée. Vérifie ton internet, puis réessaie.");
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <AppShell size="form" publicPage>
        <p className="ff-muted text-center py-20" role="status">Chargement…</p>
      </AppShell>
    );
  }

  if (isPro) {
    return (
      <AppShell size="form" publicPage>
        <h1 className="ff-title mb-3">Tu es déjà FishFlow Pro.</h1>
        <p className="ff-muted mb-8">Tu peux créer jusqu'à 100 fiches par mois (10 par jour).</p>
        <button onClick={() => router.push("/generer")} className="ff-primary">
          Créer une fiche
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell size="form" publicPage>
      <TrackView name="pricing_view" />
      <h1 className="ff-title mb-3">Gratuit ou Pro.</h1>
      <p className="ff-muted ff-measure mb-8">Le gratuit suffit pour essayer. Pro, c'est pour réviser souvent : jusqu'à 100 fiches par mois.</p>

      <p className="ff-price"><span className="ff-h2">4,99 €</span> par mois</p>
      <button onClick={handleUpgrade} disabled={loading} className="ff-primary w-full sm:w-auto mt-4">
        {loading ? "Ouverture du paiement…" : "Passer Pro, 4,99 €/mois"}
      </button>
      <p className="ff-muted text-[15px] mt-3 mb-12">Sans engagement : tu arrêtes en un clic. Paiement sécurisé par Stripe.</p>

      <h2 className="ff-h2 mb-4">Ce qui change</h2>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Comparaison Gratuit et Pro">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-black/15">
              <th scope="col" className="py-3 pr-3 w-[38%]"><span className="sr-only">Fonctionnalité</span></th>
              <th scope="col" className="py-3 pr-3 font-bold">Gratuit</th>
              <th scope="col" className="py-3 font-bold">Pro</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-black/15 align-top">
                <th scope="row" className="py-3 pr-3 font-semibold">{row.label}</th>
                <td className="py-3 pr-3 ff-muted">{row.free}</td>
                <td className="py-3">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ff-muted ff-measure mt-4">Dans les deux formules : la fiche, l'essentiel, les flashcards, le quiz, la révision avec rappels, l'objectif du jour et les 3 présentations (Classique, Mémo, Cornell).</p>

      <section aria-labelledby="t-pricing-faq" className="mt-14">
        <h2 id="t-pricing-faq" className="ff-h2 mb-4">Questions</h2>
        <div className="ff-faq">
          {FAQ.filter((f) => /gratuit|privés/i.test(f.q)).map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
