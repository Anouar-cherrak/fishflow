"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/lazy";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";
import { Logo, Wordmark } from "@/components/Logo";
import { AppShell } from "@/components/AppShell";
import { SeaDecor } from "@/components/Ocean";
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
      <AppShell size="form">
        <p className="text-black/60 text-sm text-center py-20" role="status">Chargement…</p>
      </AppShell>
    );
  }

  if (isPro) {
    return (
      <AppShell size="form">
        <div className="w-full max-w-sm mx-auto bg-white border border-black/10 rounded-2xl p-8 text-center ff-fade-up ff-card">
          <h1 className="text-xl font-semibold mb-1">Tu es déjà FishFlow Pro</h1>
          <p className="text-black/60 text-sm mb-6">Tu peux créer jusqu'à 100 fiches par mois (10 par jour).</p>
          <button onClick={() => router.push("/generer")} className="w-full py-3 rounded-full font-semibold bg-accent text-on-accent hover:bg-accent-strong transition ff-btn">
            Créer une fiche
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell size="wide">
      <TrackView name="pricing_view" />
      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-2">Gratuit ou Pro.</h1>
        <p className="ff-lead">Le gratuit suffit pour essayer. Pro te donne bien plus : jusqu'à 100 fiches par mois et des outils en plus. Tu peux arrêter quand tu veux.</p>
      </div>

      <div className="grid gap-6 lg:gap-10 grid-cols-[minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)] items-start">
        <div className="ff-deco-host bg-white border border-accent/60 rounded-3xl p-8 text-center ff-fade-up ff-card lg:sticky lg:top-24">
          <SeaDecor y="88%" />
          <div className="flex items-center justify-center gap-2 mb-5">
            <Logo size={24} />
            <Wordmark />
          </div>

          <h2 className="text-xl font-semibold mb-1">FishFlow Pro</h2>
          <ul className="text-left text-sm grid gap-2 mb-6" aria-label="Ce que tu gagnes avec Pro">
            {["100 fiches par mois", "Cours jusqu'à 15 pages, plusieurs PDF d'un coup", "Quiz de 12 questions", "20 questions par jour dans Apprendre", "Toutes tes fiches gardées", "Résumé lu à voix haute", "Tes cartes difficiles et ta progression sur 30 jours"].map((b) => (
              <li key={b} className="flex gap-2"><span className="text-accent font-bold" aria-hidden="true">✓</span><span>{b}</span></li>
            ))}
          </ul>

          <div className="text-4xl font-extrabold mb-1">4,99 €</div>
          <p className="text-black/55 text-sm mb-6">par mois. Sans engagement : tu arrêtes en un clic.</p>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold bg-accent text-on-accent hover:bg-accent-strong transition disabled:opacity-50 ff-btn"
          >
            {loading ? "Ouverture du paiement…" : "Passer Pro, 4,99 €/mois"}
          </button>

          <button onClick={() => router.push("/generer")} className="w-full mt-3 text-sm text-black/55 hover:text-black hover:underline transition ff-link-underline min-h-[44px]">
            Retour
          </button>
        </div>

        <div className="ff-fade-up min-w-0">
          <div className="overflow-x-auto rounded-3xl border border-black/10 bg-surface" tabIndex={0} role="region" aria-label="Comparaison Gratuit et Pro">
            <table className="w-full text-sm text-left sm:min-w-[560px]">
              <thead>
                <tr className="border-b border-black/10">
                  <th scope="col" className="p-3 sm:p-4 w-[34%] sm:w-auto"><span className="sr-only">Fonctionnalité</span></th>
                  <th scope="col" className="p-3 sm:p-4 font-semibold">Gratuit</th>
                  <th scope="col" className="p-3 sm:p-4 font-semibold"><span className="border-b-2 border-accent pb-0.5">Pro</span></th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-black/10 last:border-0 align-top">
                    <th scope="row" className="p-3 sm:p-4 font-medium">{row.label}</th>
                    <td className="p-3 sm:p-4 text-black/65">{row.free}</td>
                    <td className="p-3 sm:p-4">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-black/65 mt-4">Dans les deux formules : la fiche, l'essentiel, les flashcards, le quiz, la révision avec rappels, l'objectif du jour et les 3 présentations (Classique, Mémo, Cornell).</p>
          <p className="text-xs text-black/50 mt-2">Paiement sécurisé par Stripe. Tes fiches restent privées.</p>

          <section aria-labelledby="t-pricing-faq" className="mt-8">
            <h2 id="t-pricing-faq" className="text-xl font-bold tracking-tight mb-3">Questions sur Pro</h2>
            <div className="bg-surface border border-black/10 rounded-3xl divide-y divide-black/10">
              {FAQ.filter((f) => /gratuit|arrêter|données|mes cours/i.test(f.q)).map(({ q, a }) => (
                <details key={q} className="group px-5">
                  <summary className="flex items-center justify-between gap-4 min-h-[56px] cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-black/50 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">⌄</span>
                  </summary>
                  <p className="pb-5 text-sm text-black/70 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
