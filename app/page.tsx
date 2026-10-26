import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { TrackView } from "@/components/TrackView";
import { TrackedLink } from "@/components/TrackedLink";
import { EssentielList, FicheSectionBody } from "@/components/FicheContent";
import { StartLink } from "@/components/landing/StartLink";
import { EXAMPLE, FAQ } from "@/components/landing/content";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "FishFlow — Fiches de révision, résumés et quiz par IA | Essai gratuit" },
  description:
    "Transforme ton cours, PDF ou photo en fiche de révision, résumé, flashcards et quiz en quelques secondes grâce à l'IA, et pose n'importe quelle question pour une réponse claire avec images. 3 fiches gratuites par mois, sans carte bancaire.",
  alternates: { canonical: "/" },
};

// Espace insécable avant « ? », « : » et « ; » (typographie française).
const fr = (t: string) => t.replace(/ ([?:;])/g, " $1");

const STEPS = [
  { title: "Colle ton cours", text: "Un texte, un PDF ou une photo de tes notes." },
  { title: "FishFlow prépare tout", text: "Une fiche, des flashcards et un quiz, tirés de ton cours." },
  { title: "Tu révises", text: "Chaque jour, FishFlow te dit quelles cartes revoir." },
];

export default function Landing() {
  return (
    <AppShell publicPage>
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

      {/* 1. Ce que fait FishFlow, pour qui, et quoi faire. */}
      <section className="lp-hero" aria-labelledby="t-hero">
        <div>
          <h1 id="t-hero" className="ff-title">Ton cours devient une fiche de révision.</h1>
          <p className="lp-lead">
            Colle ton cours, envoie un PDF ou une photo&nbsp;: FishFlow en fait une fiche, des flashcards et un quiz. Pour les lycéens et les étudiants.
          </p>
          <StartLink event="cta_click_hero" />
          <p className="lp-note">Gratuit pour commencer, sans carte bancaire.</p>
        </div>

        <figure className="lp-example">
          <div className="lp-sheet">
            <p className="lp-sheet-title">{EXAMPLE.title}</p>
            <p className="lp-sheet-k">L&apos;essentiel</p>
            <EssentielList lines={EXAMPLE.essentiel} />
            <div className="lp-sheet-part">
              <FicheSectionBody blocks={[EXAMPLE.piege]} />
            </div>
          </div>
          <figcaption>Exemple de fiche, à partir d&apos;un cours de SVT sur la photosynthèse.</figcaption>
        </figure>
      </section>

      {/* 2. Comment ça marche */}
      <section className="lp-section" aria-labelledby="t-steps">
        <h2 id="t-steps" className="ff-h2">Comment ça marche</h2>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="lp-step-n" aria-hidden="true">{i + 1}</span>
              <h3 className="ff-h3">{s.title}</h3>
              <p className="ff-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 3. Le prix */}
      <section className="lp-section" aria-labelledby="t-price">
        <h2 id="t-price" className="ff-h2">Combien ça coûte</h2>
        <div className="lp-plans">
          <div>
            <h3 className="ff-h3">Gratuit</h3>
            <p className="lp-amount">0&nbsp;€</p>
            <ul className="ff-list">
              <li>3 fiches par mois</li>
              <li>Flashcards, quiz et révision chaque jour</li>
              <li>Tes 5 dernières fiches gardées</li>
            </ul>
          </div>
          <div>
            <h3 className="ff-h3">Pro</h3>
            <p className="lp-amount">4,99&nbsp;€ <span className="ff-muted">par mois</span></p>
            <ul className="ff-list">
              <li>100 fiches par mois</li>
              <li>Toutes tes fiches gardées</li>
              <li>Des cours plus longs (environ 15 pages)</li>
            </ul>
            <TrackedLink href="/pricing" event="cta_click_offer_premium" className="ff-link lp-more">Tout comparer</TrackedLink>
          </div>
        </div>
        <p className="lp-note">Pro s&apos;arrête quand tu veux, en un clic. Paiement sécurisé par Stripe.</p>
      </section>

      {/* 4. Questions */}
      <section className="lp-section" aria-labelledby="t-faq">
        <h2 id="t-faq" className="ff-h2">Questions</h2>
        <div className="ff-faq">
          {/* La première question (ChatGPT) est l'objection de tout le monde : sa réponse est ouverte d'office. */}
          {FAQ.map(({ q, a }, i) => (
            <details key={q} open={i === 0}>
              <summary>{fr(q)}</summary>
              <p>{fr(a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 5. Le même bouton */}
      <section className="lp-section lp-end" aria-labelledby="t-end">
        <span className="lp-manta" aria-hidden="true" />
        <h2 id="t-end" className="ff-h2">Essaie avec ton prochain cours.</h2>
        <StartLink event="cta_click_final" />
        <p className="lp-note">Gratuit pour commencer, sans carte bancaire.</p>
      </section>
    </AppShell>
  );
}
