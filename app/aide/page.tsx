"use client";

import { AppShell } from "@/components/AppShell";
import { Explainer } from "@/components/Explainer";
import { APPRENDRE, AUJOURDHUI, EXAMENS, GENERER, PARTAGER, REVISER } from "@/components/tutorials";

export default function Aide() {
  return (
    <AppShell size="wide">
      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-2">Aide.</h1>
        <p className="ff-lead max-w-[60ch]">
          Une petite animation de 15 secondes pour chaque fonction. Elles défilent toutes seules : tu peux les mettre en
          pause ou choisir une étape.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("ff-open-tuto"))}
          className="ff-secondary text-sm mt-5"
        >
          Revoir le tutoriel de bienvenue
        </button>
      </div>

      <div className="grid gap-6">
        <Explainer id="generer" title="Créer une fiche" intro="Un cours, un article ou tes notes deviennent un résumé, une fiche, des flashcards et un quiz." scenes={GENERER} href="/generer" cta="Créer une fiche" />
        <Explainer id="reviser" title="Réviser un peu chaque jour" intro="FishFlow te montre les cartes à revoir au bon moment, pour que tu retiennes longtemps." scenes={REVISER} href="/reviser" cta="Réviser" />
        <Explainer id="examens" title="Préparer un examen" intro="Donne la date, choisis tes fiches, et FishFlow répartit les révisions jusqu'au jour J." scenes={EXAMENS} href="/examens" cta="Préparer un examen" />
        <Explainer id="apprendre" title="Poser une question" intro="Pour comprendre un sujet rapidement, même sans avoir de cours." scenes={APPRENDRE} href="/apprendre" cta="Poser une question" />
        <Explainer id="partager" title="Partager une fiche" intro="Envoie une fiche à un ami avec un simple lien. Il la lit, sans pouvoir la modifier." scenes={PARTAGER} href="/mes-fiches" cta="Mes fiches" />
        <Explainer id="aujourdhui" title="Ton espace Aujourd'hui" intro="Un objectif, tes cartes du jour, une question de curiosité et ta progression." scenes={AUJOURDHUI} href="/aujourdhui" cta="Voir Aujourd'hui" />
      </div>
    </AppShell>
  );
}
