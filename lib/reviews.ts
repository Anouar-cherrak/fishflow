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

    // Journal des révisions (pour les statistiques et l'objectif du jour). Silencieux si la table n'existe pas encore.
    await supabase.from("review_log").insert(results.map((r) => ({ correct: r.correct })));
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

function startOfDay(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export type DayCount = { date: Date; total: number; correct: number };

// Nombre de cartes révisées par jour sur les N derniers jours (le plus ancien en premier).
export async function getDailyCounts(days: number): Promise<{ counts: DayCount[]; ok: boolean }> {
  const counts: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) counts.push({ date: startOfDay(i), total: 0, correct: 0 });
  try {
    const { data, error } = await createClient()
      .from("review_log")
      .select("reviewed_at, correct")
      .gte("reviewed_at", startOfDay(days - 1).toISOString())
      .limit(10000);
    if (error || !data) return { counts, ok: false };
    for (const row of data as { reviewed_at: string; correct: boolean }[]) {
      const when = new Date(row.reviewed_at);
      const slot = counts.find((c) => c.date.toDateString() === when.toDateString());
      if (slot) {
        slot.total++;
        if (row.correct) slot.correct++;
      }
    }
    return { counts, ok: true };
  } catch {
    return { counts, ok: false };
  }
}

export type HardCard = { ficheId: string; ficheTitle: string; question: string; answer: string; wrong: number };

// Les cartes que la personne rate le plus souvent.
export async function getHardCards(limit = 8): Promise<HardCard[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("card_reviews")
      .select("fiche_id, card_index, times_wrong")
      .gt("times_wrong", 0)
      .order("times_wrong", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return [];

    const ids = Array.from(new Set(data.map((r) => r.fiche_id as string)));
    const { data: fiches } = await supabase.from("fiches").select("id, title, data").in("id", ids);
    const byId = new Map((fiches ?? []).map((f) => [f.id as string, f]));

    const out: HardCard[] = [];
    for (const row of data as { fiche_id: string; card_index: number; times_wrong: number }[]) {
      const fiche = byId.get(row.fiche_id);
      const card = fiche?.data?.flashcards?.[row.card_index];
      if (fiche && card?.question) {
        out.push({ ficheId: row.fiche_id, ficheTitle: fiche.title, question: card.question, answer: card.answer, wrong: row.times_wrong });
      }
    }
    return out;
  } catch {
    return [];
  }
}
