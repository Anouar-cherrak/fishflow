import { createClient } from "@/lib/supabase/client";

// Révision espacée par « boîtes » (méthode de Leitner) :
// plus on sait une carte, plus elle revient tard. Si on la rate, elle repart de la boîte 1.
const INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
const MAX_BOX = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewResult = { ficheId: string; cardIndex: number; correct: boolean };

type ExistingRow = {
  fiche_id: string;
  card_index: number;
  box: number;
  times_correct: number;
  times_wrong: number;
};

// Enregistre le résultat « du premier coup » de chaque carte étudiée.
// Ne casse jamais l'écran : si la table n'existe pas encore ou si la requête échoue, on ignore.
export async function recordReviewResults(results: ReviewResult[]): Promise<void> {
  if (results.length === 0) return;

  try {
    const supabase = createClient();
    const ficheIds = Array.from(new Set(results.map((r) => r.ficheId)));

    const { data: existing, error } = await supabase
      .from("card_reviews")
      .select("fiche_id, card_index, box, times_correct, times_wrong")
      .in("fiche_id", ficheIds);

    if (error) return;

    const previous = new Map<string, ExistingRow>();
    for (const row of (existing ?? []) as ExistingRow[]) {
      previous.set(`${row.fiche_id}:${row.card_index}`, row);
    }

    const now = new Date();
    const rows = results.map((r) => {
      const prev = previous.get(`${r.ficheId}:${r.cardIndex}`);
      const box = r.correct ? Math.min(MAX_BOX, (prev?.box ?? 1) + 1) : 1;
      const due = new Date(now.getTime() + INTERVAL_DAYS[box] * DAY_MS);
      return {
        fiche_id: r.ficheId,
        card_index: r.cardIndex,
        box,
        due_at: due.toISOString(),
        last_reviewed_at: now.toISOString(),
        times_correct: (prev?.times_correct ?? 0) + (r.correct ? 1 : 0),
        times_wrong: (prev?.times_wrong ?? 0) + (r.correct ? 0 : 1),
      };
    });

    await supabase.from("card_reviews").upsert(rows, { onConflict: "fiche_id,card_index" });
  } catch {
    // On ignore : la révision espacée est un bonus, elle ne doit jamais bloquer l'étude.
  }
}

// Nombre de cartes à réviser maintenant (0 si la table n'existe pas encore).
export async function countDueCards(): Promise<number> {
  try {
    const { count, error } = await createClient()
      .from("card_reviews")
      .select("id", { count: "exact", head: true })
      .lte("due_at", new Date().toISOString());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Efface les suivis d'une fiche (quand ses flashcards sont régénérées, les numéros de cartes changent).
export async function clearFicheReviews(ficheId: string): Promise<void> {
  try {
    await createClient().from("card_reviews").delete().eq("fiche_id", ficheId);
  } catch {}
}

export type Progress = { tracked: number; mastered: number; streak: number };

// Progression : cartes suivies, cartes « maîtrisées » (boîte 4 ou 5) et série de jours de révision.
// La série est calculée avec la dernière révision de chaque carte (suffisant pour un premier niveau).
export async function getProgress(): Promise<Progress> {
  const empty = { tracked: 0, mastered: 0, streak: 0 };
  try {
    const { data, error } = await createClient()
      .from("card_reviews")
      .select("box, last_reviewed_at")
      .limit(5000);
    if (error || !data) return empty;

    const days = new Set<string>();
    let mastered = 0;
    for (const row of data as { box: number; last_reviewed_at: string | null }[]) {
      if (row.box >= 4) mastered++;
      if (row.last_reviewed_at) days.add(new Date(row.last_reviewed_at).toDateString());
    }

    let streak = 0;
    const cursor = new Date();
    // Si on n'a pas encore révisé aujourd'hui, la série d'hier compte encore.
    if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { tracked: data.length, mastered, streak };
  } catch {
    return empty;
  }
}
