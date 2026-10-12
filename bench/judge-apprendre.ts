// Banc d'essai « Apprendre » — un correcteur plus fort note chaque réponse.
//   qualite   : /10 — répond-elle vraiment, clairement et complètement à la question ?
//   erreurs   : affirmations fausses (selon les connaissances établies)
//   sources   : sources affichées, et combien parlent vraiment du sujet
//   renvois   : % des points qui ont au moins un renvoi [n] vers une source
import OpenAI from "openai";

type Answer = {
  found: boolean;
  title?: string;
  summary?: string;
  points?: { text: string; sources: number[] }[];
  sources?: { id: number; title: string; site: string }[];
  images?: unknown[];
  message?: string;
};

const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export async function judgeApprendre(question: string, answer: Answer, cost: { usd: number }) {
  if (!answer.found) {
    return { refus: true, qualite: 0, erreurs: 0, sources: 0, sourcesPertinentes: 0, renvois: 0, images: 0, detail: answer.message ?? "" };
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const text = [
    `Titre : ${answer.title}`,
    `Résumé : ${answer.summary}`,
    ...(answer.points ?? []).map((p, i) => `Point ${i + 1} : ${p.text} ${p.sources.map((s) => `[${s}]`).join("")}`),
    `Sources affichées : ${(answer.sources ?? []).map((s) => `[${s.id}] ${s.title} (${s.site})`).join(" ; ") || "aucune"}`,
  ].join("\n");
  const r = await client.chat.completions.create(
    {
      model: "gpt-5-mini",
      reasoning_effort: "medium",
      messages: [
        { role: "system", content: "Tu es un correcteur exigeant et impartial. Tu évalues la réponse d'un assistant pédagogique à la question d'un étudiant." },
        {
          role: "user",
          content: `Question : ${question}

Réponse :
${text}

Évalue :
- "qualite" (0 à 10) : la réponse répond-elle vraiment à la question, clairement, avec le pourquoi et le comment, pour un étudiant ? 10 = excellente.
- "erreurs" : la liste des affirmations fausses ou trompeuses (selon les connaissances établies). Vide si aucune.
- "sources_pertinentes" : combien des sources affichées parlent vraiment du sujet de la question.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "note", strict: true, schema: obj({ qualite: { type: "integer" }, erreurs: { type: "array", items: { type: "string" } }, sources_pertinentes: { type: "integer" } }) },
      },
    },
    { timeout: 100000 }
  );
  const u = r.usage;
  cost.usd += ((u?.prompt_tokens ?? 0) * 0.25 + (u?.completion_tokens ?? 0) * 2) / 1e6;
  const j = JSON.parse(r.choices[0].message.content || "{}") as { qualite: number; erreurs: string[]; sources_pertinentes: number };
  const points = answer.points ?? [];
  return {
    refus: false,
    qualite: j.qualite,
    erreurs: j.erreurs.length,
    sources: answer.sources?.length ?? 0,
    sourcesPertinentes: Math.min(j.sources_pertinentes, answer.sources?.length ?? 0),
    renvois: points.length ? (100 * points.filter((p) => p.sources.length > 0).length) / points.length : 0,
    images: answer.images?.length ?? 0,
    detail: j.erreurs.join(" | "),
  };
}
