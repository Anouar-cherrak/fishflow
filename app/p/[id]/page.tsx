import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

type Shared = {
  title: string;
  created_at: string;
  data: { summary?: string; sheet?: string[]; flashcards?: { question: string; answer: string }[]; quiz?: unknown[] };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<Shared | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_fiche", { p_share: id });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as Shared;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fiche = await load(id);
  if (!fiche) return { title: "Fiche introuvable", robots: { index: false } };
  const title = fiche.title || "Fiche de révision";
  const description = (fiche.data.summary ?? "Une fiche de révision créée avec FishFlow.").slice(0, 155);
  return {
    title: `${title} — fiche FishFlow`,
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

  const { summary, sheet, flashcards, quiz } = fiche.data;

  return (
    <AppShell size="normal">
      <article className="grid gap-8">
        <header>
          <p className="text-sm font-semibold text-[#22C55E] mb-2">Fiche de révision partagée</p>
          <h1 className="ff-title">{fiche.title || "Fiche de révision"}</h1>
        </header>

        {summary && (
          <section className="bg-surface rounded-3xl border border-black/10 p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight mb-3">Résumé</h2>
            <p className="text-black/80 leading-relaxed text-base sm:text-lg max-w-[68ch]">{summary}</p>
          </section>
        )}

        {sheet && sheet.length > 0 && (
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-3 px-1">À retenir</h2>
            <ul className="grid gap-2.5 md:grid-cols-2">
              {sheet.map((point, i) => (
                <li key={i} className="bg-surface rounded-2xl border border-black/10 p-4 flex gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-[#22C55E] shrink-0" aria-hidden="true" />
                  <span className="text-black/80">{point}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {flashcards && flashcards.length > 0 && (
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-3 px-1">Flashcards ({flashcards.length})</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {flashcards.map((card, i) => (
                <li key={i} className="bg-surface rounded-2xl border border-black/10 p-4">
                  <details>
                    <summary className="cursor-pointer font-semibold min-h-[44px] flex items-center">{card.question}</summary>
                    <p className="text-black/70 mt-2">{card.answer}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-3xl border border-[#22C55E]/60 bg-surface p-6 sm:p-8 grid gap-4 justify-items-start">
          <h2 className="text-2xl font-extrabold tracking-tight">Fais la même chose avec ton cours.</h2>
          <p className="text-black/70 max-w-[52ch]">
            Colle ton cours, envoie un PDF ou prends-le en photo. FishFlow en fait une fiche, des flashcards{quiz && quiz.length > 0 ? " et un quiz" : ""}, en quelques secondes. 3 fiches gratuites par mois.
          </p>
          <Link href="/signup" className="ff-primary ff-btn">Essayer gratuitement</Link>
        </section>
      </article>
    </AppShell>
  );
}
