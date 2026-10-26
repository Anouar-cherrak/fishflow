import { publicFicheData } from "@/lib/public-fiche";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { CopyFiche } from "@/components/CopyFiche";
import { EssentielList, FicheContent } from "@/components/FicheContent";
import type { Fiche } from "@/lib/fiche-engine";

type Shared = {
  title: string;
  created_at: string;
  data: { summary?: string; sheet?: string[]; fiche?: Fiche; essentiel?: string[]; flashcards?: { question: string; answer: string }[]; quiz?: unknown[] };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<Shared | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_fiche", { p_share: id });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const shared = data[0] as Shared;
  // Le cours d'origine ne quitte jamais le compte de son auteur (ni à l'écran, ni dans le code de la page, ni dans la copie).
  return { ...shared, data: publicFicheData(shared.data) } as Shared;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fiche = await load(id);
  if (!fiche) return { title: "Fiche introuvable", robots: { index: false } };
  const title = fiche.title || "Fiche de révision";
  const description = (fiche.data.summary ?? "Une fiche de révision créée avec FishFlow.").slice(0, 155);
  return {
    title: { absolute: `${title} — fiche FishFlow` },
    description,
    // Un lien partagé reste entre les mains de la personne qui l'envoie : pas d'indexation par les moteurs.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article", siteName: "FishFlow" },
  };
}

export default async function SharedFichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await load(id);
  if (!fiche) notFound();

  const { summary, sheet, flashcards, quiz, essentiel } = fiche.data;
  const structured = fiche.data.fiche?.sections?.length ? fiche.data.fiche : null;

  const summaryCard = summary && (
    <section>
      <h2 className="ff-h2 mb-4">{essentiel?.length ? "L'essentiel en 5 lignes" : "Résumé"}</h2>
      {essentiel?.length ? (
        <EssentielList lines={essentiel} />
      ) : (
        <p className="text-black/80 ff-measure">{summary}</p>
      )}
    </section>
  );

  return (
    <AppShell size="form" publicPage>
      <article className="grid gap-12">
        <header>
          <h1 className="ff-title">{fiche.title || "Fiche de révision"}</h1>
          <p className="ff-muted mt-2 mb-6">Une fiche de révision partagée avec FishFlow.</p>
          <CopyFiche shareId={id} title={fiche.title} data={fiche.data as Record<string, unknown>} className="ff-primary" />
        </header>

        {structured ? (
          <>
            <section>
              <h2 className="ff-h2 mb-2">Fiche de révision</h2>
              <FicheContent fiche={structured} />
            </section>
            {summaryCard}
          </>
        ) : (
          summaryCard
        )}

        {!structured && sheet && sheet.length > 0 && (
          <section>
            <h2 className="ff-h2 mb-4">À retenir</h2>
            <ul className="ff-list ff-measure text-black/80">
              {sheet.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
        )}

        {flashcards && flashcards.length > 0 && (
          <section>
            <h2 className="ff-h2 mb-4">Flashcards ({flashcards.length})</h2>
            <p className="ff-muted mb-4">Touche une question pour voir la réponse.</p>
            <div className="ff-faq">
              {flashcards.map((card, i) => (
                <details key={i}>
                  <summary>{card.question}</summary>
                  <p>{card.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="pt-10 border-t border-black/15 grid gap-4 justify-items-start">
          <h2 className="ff-h2">Fais la même chose avec ton cours.</h2>
          <p className="ff-muted ff-measure">
            Colle ton cours, envoie un PDF ou prends-le en photo. FishFlow en fait une fiche, des flashcards{quiz && quiz.length > 0 ? " et un quiz" : ""}, en quelques secondes. 3 fiches gratuites par mois.
          </p>
          <Link href="/signup" className="ff-secondary">Essayer gratuitement</Link>
        </section>
      </article>
    </AppShell>
  );
}
