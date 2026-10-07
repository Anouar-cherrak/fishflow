import type { Metadata } from "next";
import { TrackView } from "@/components/TrackView";
import { Landing as LandingView } from "@/components/landing/Landing";
import "./landing.css";

export const metadata: Metadata = {
  title: "FishFlow — Fiches de révision, résumés et quiz par IA | Essai gratuit",
  description:
    "Transforme ton cours, PDF ou photo en fiche de révision, résumé, flashcards et quiz en quelques secondes grâce à l'IA, et pose n'importe quelle question pour une réponse claire avec images. 3 fiches gratuites par mois, sans carte bancaire.",
};

export default function Landing() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "FishFlow",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              description: "3 fiches de révision gratuites par mois",
            },
            description:
              "Transforme un cours, un PDF ou une photo en fiche de révision, résumé, flashcards et quiz grâce à l'IA.",
          }),
        }}
      />
      <TrackView name="visit" />
      <LandingView />
    </>
  );
}
