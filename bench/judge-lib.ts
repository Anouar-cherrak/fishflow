// Banc d'essai — le correcteur. Un modèle plus fort que le moteur note chaque fiche par rapport au cours.
//   couverture  = % des notions clés présentes (citées ou expliquées)
//   profondeur  = % des notions clés bien expliquées (avec leur contenu)
//   complétude  = (0 absente, 1 citée, 2 expliquée) / 2 — score principal
//   faits       = nombre d'informations exactes du cours dans la fiche
//   exactitude  = % des affirmations de la fiche qui sont bien dans le cours
//   cartes / quiz = % de flashcards et de questions justes et bien posées
import OpenAI from "openai";
import { ficheToText, stripMarks, type EngineResult } from "../lib/fiche-engine.ts";

export const JUDGE_MODEL = "gpt-5-mini";

type Json = Record<string, unknown>;
const obj = (properties: Json) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export type JudgeKey = { notions: { notion: string; contenu_attendu: string }[] };

async function ask(client: OpenAI, system: string, user: string, schema: Json, name: string, cost: { usd: number }) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await client.chat.completions.create(
        {
          model: JUDGE_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          reasoning_effort: "medium",
          response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
        },
        { timeout: 100000, maxRetries: 0 }
      );
      const u = r.usage;
      const cached = u?.prompt_tokens_details?.cached_tokens ?? 0;
      cost.usd += (((u?.prompt_tokens ?? 0) - cached) * 0.25 + cached * 0.025 + (u?.completion_tokens ?? 0) * 2) / 1e6;
      return JSON.parse(r.choices[0].message.content || "{}");
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

const SYS = (course: string) => `Tu es un correcteur exigeant et impartial de fiches de révision. Tu juges uniquement par rapport au cours ci-dessous.

=== COURS ===
${course}
=== FIN DU COURS ===`;

export async function makeKey(client: OpenAI, course: string, cost: { usd: number }): Promise<JudgeKey> {
  const n = Math.round(Math.min(45, Math.max(15, course.length / 1000 + 10)));
  return ask(
    client,
    SYS(course),
    `Fais la liste des ${n} notions les plus importantes qu'une excellente fiche de révision COMPLÈTE de ce cours doit contenir, réparties sur tout le cours (début, milieu, fin) et dans l'ordre du cours.
Chaque notion = une idée précise avec son contenu essentiel (définition, mécanisme, date, chiffre, règle, cause/conséquence, exemple clé). Pas de détail anecdotique, pas de référence bibliographique.`,
    obj({ notions: { type: "array", items: obj({ notion: { type: "string" }, contenu_attendu: { type: "string" } }) } }),
    "cle",
    cost
  );
}

// Ce qui compte comme « la fiche » : résumé + points clés (ancien moteur), ou essentiel + fiche structurée (nouveau).
export function ficheAsText(result: EngineResult): string {
  const parts: string[] = [];
  if (result.essentiel?.length) parts.push("L'essentiel :\n" + result.essentiel.map((l) => "- " + stripMarks(l)).join("\n"));
  else if (result.summary) parts.push("Résumé :\n" + result.summary);
  if (result.fiche?.sections) parts.push(stripMarks(ficheToText(result.fiche)));
  else if (Array.isArray(result.sheet)) parts.push("Points clés :\n" + result.sheet.map((p) => "- " + p).join("\n"));
  return parts.join("\n\n");
}

export async function judge(client: OpenAI, course: string, key: JudgeKey, result: EngineResult, cost: { usd: number }) {
  const fiche = ficheAsText(result);
  const system = SYS(course);
  const cards = result.flashcards ?? [];
  const quiz = result.quiz ?? [];

  const [cov, facts, qa] = await Promise.all([
    ask(
      client,
      system,
      `Voici une fiche de révision faite à partir du cours, puis une liste de notions numérotées.
Pour CHAQUE notion, donne une note :
0 = absente de la fiche ;
1 = citée ou effleurée, mais sans son contenu essentiel (ou incomplète) ;
2 = présente avec son contenu essentiel, correctement expliquée.

=== FICHE ===
${fiche}
=== FIN DE LA FICHE ===

Notions :
${key.notions.map((n, i) => `${i}. ${n.notion} — attendu : ${n.contenu_attendu}`).join("\n")}`,
      obj({ notes: { type: "array", items: obj({ index: { type: "integer" }, note: { type: "integer" } }) } }),
      "couverture",
      cost
    ),
    ask(
      client,
      system,
      `Voici une fiche de révision faite à partir du cours.
Découpe la fiche en affirmations factuelles distinctes (une information = une affirmation ; ignore les répétitions, les titres seuls et les phrases sans contenu).
Pour chacune, verdict :
"ok" = dit dans le cours (ou reformulation fidèle, ou déduction immédiate) ;
"hors_cours" = absent du cours (ajout extérieur, même si c'est vrai dans la réalité) ;
"faux" = contredit ou déforme le cours (chiffre, date, nom, relation inversée…).
Ne recopie en entier que les affirmations "hors_cours" et "faux" ; pour les "ok", donne seulement leur nombre.

=== FICHE ===
${fiche}
=== FIN DE LA FICHE ===`,
      obj({
        nb_ok: { type: "integer" },
        problemes: {
          type: "array",
          items: obj({ affirmation: { type: "string" }, verdict: { type: "string", enum: ["hors_cours", "faux"] }, explication: { type: "string" } }),
        },
      }),
      "faits",
      cost
    ),
    ask(
      client,
      system,
      `Voici des flashcards et un quiz faits à partir du cours.
Flashcard : "ok" si la réponse est juste d'après le cours ET répond exactement à une question claire et précise ; sinon "ko".
Question de quiz : "ok" si la réponse marquée juste l'est d'après le cours, qu'elle est la seule juste, et que la question est claire ; sinon "ko".

Flashcards :
${cards.map((f, i) => `${i}. Q : ${f.question} | R : ${f.answer}`).join("\n")}

Quiz :
${quiz.map((q, i) => `${i}. ${q.question} | options : ${q.options.map((o, j) => `[${j}] ${o}`).join(" ; ")} | juste : [${q.correctIndex}]`).join("\n")}`,
      obj({
        flashcards: { type: "array", items: obj({ index: { type: "integer" }, verdict: { type: "string", enum: ["ok", "ko"] }, raison: { type: "string" } }) },
        quiz: { type: "array", items: obj({ index: { type: "integer" }, verdict: { type: "string", enum: ["ok", "ko"] }, raison: { type: "string" } }) },
      }),
      "cartes",
      cost
    ),
  ]);

  const N = key.notions.length;
  const notesList = (cov.notes ?? []) as { index: number; note: number }[];
  const notes = Array.from({ length: N }, (_, i) => Math.max(0, Math.min(2, notesList.find((x) => x.index === i)?.note ?? 0)));
  const sum = notes.reduce((a, b) => a + b, 0);
  const problems = (facts.problemes ?? []) as { affirmation: string; verdict: string; explication: string }[];
  const nbOk = Number(facts.nb_ok) || 0;
  const cardVerdicts = (qa.flashcards ?? []) as { index: number; verdict: string; raison: string }[];
  const quizVerdicts = (qa.quiz ?? []) as { index: number; verdict: string; raison: string }[];
  return {
    couverture: (100 * notes.filter((n) => n >= 1).length) / N,
    profondeur: (100 * notes.filter((n) => n === 2).length) / N,
    completude: (100 * sum) / (2 * N),
    faits: nbOk,
    erreurs: problems.length,
    exactitude: (100 * nbOk) / Math.max(1, nbOk + problems.length),
    mots: fiche.split(/\s+/).length,
    cartes: cards.length,
    cartesOk: cards.length ? (100 * cardVerdicts.filter((x) => x.verdict === "ok").length) / cards.length : 0,
    quiz: quiz.length,
    quizOk: quiz.length ? (100 * quizVerdicts.filter((x) => x.verdict === "ok").length) / quiz.length : 0,
    detail: {
      notes,
      problemes: problems,
      cartesKo: cardVerdicts.filter((x) => x.verdict === "ko"),
      quizKo: quizVerdicts.filter((x) => x.verdict === "ko"),
    },
  };
}
