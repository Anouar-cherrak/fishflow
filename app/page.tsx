import type { Metadata } from "next";
import { TrackView } from "@/components/TrackView";
import { Landing as LandingView } from "@/components/landing/Landing";
import { FAQ } from "@/components/landing/content";
import { AskShow, CardsShow, DailyShow, FicheShow, HeroStage, QuizShow, StepPaste, StepRead, StepReady } from "@/components/landing/Objects";
import { DeepDefs, Jellies, MantaPass, School, Surface } from "@/components/landing/Deep";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "FishFlow — Fiches de révision, résumés et quiz par IA | Essai gratuit" },
  description:
    "Transforme ton cours, PDF ou photo en fiche de révision, résumé, flashcards et quiz en quelques secondes grâce à l'IA, et pose n'importe quelle question pour une réponse claire avec images. 3 fiches gratuites par mois, sans carte bancaire.",
  alternates: { canonical: "/" },
};

export default function Landing() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            // Organisation (nom + logo pour Google), site, et l'application elle-même.
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://fishflow.fr/#organisation",
                name: "FishFlow",
                url: "https://fishflow.fr/",
                logo: "https://fishflow.fr/icons/icon-512.png",
              },
              {
                "@type": "WebSite",
                "@id": "https://fishflow.fr/#site",
                name: "FishFlow",
                url: "https://fishflow.fr/",
                inLanguage: "fr-FR",
                publisher: { "@id": "https://fishflow.fr/#organisation" },
              },
              {
                "@type": "SoftwareApplication",
                name: "FishFlow",
                url: "https://fishflow.fr/",
                applicationCategory: "EducationalApplication",
                operatingSystem: "Web",
                inLanguage: "fr-FR",
                publisher: { "@id": "https://fishflow.fr/#organisation" },
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "EUR",
                  description: "3 fiches de révision gratuites par mois",
                },
                description:
                  "Transforme un cours, un PDF ou une photo en fiche de révision, résumé, flashcards et quiz grâce à l'IA.",
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
              },
            ],
          }),
        }}
      />
      <TrackView name="visit" />
      <LandingView deep={{ defs: <DeepDefs />, surface: <Surface />, manta: <MantaPass />, school: <School />, jellies: <Jellies />,
          hero: <HeroStage />,
          steps: [<StepPaste key="p" />, <StepRead key="r" />, <StepReady key="o" />],
          // Même ordre que FEATURES dans Landing.tsx : fiche, cartes, quiz, jour, apprendre.
          shows: [<FicheShow key="f" />, <CardsShow key="c" />, <QuizShow key="q" />, <DailyShow key="d" />, <AskShow key="a" />] }} />
    </>
  );
}
