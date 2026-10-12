// Copie figée de l'ANCIEN moteur (commit 4ac883d), pour le banc d'essai uniquement.
import OpenAI from "openai";

const DIFFICULTY_TEXT: Record<string, string> = {
  facile: "Utilise un langage très simple, accessible à un débutant, évite tout jargon technique.",
  moyen: "Utilise un niveau standard, adapté à un lycéen ou un étudiant moyen.",
  difficile: "Utilise un niveau avancé, avec un vocabulaire technique précis, adapté à un public expert.",
};

const LENGTH_TEXT: Record<string, string> = {
  court: "Résumé en 3 à 4 phrases maximum. 3 à 4 points clés. 4 à 5 flashcards. 3 questions de quiz.",
  moyen: "Résumé en 5 à 8 phrases maximum. 5 à 7 points clés. 6 à 8 flashcards. 5 questions de quiz.",
  detaille: "Résumé en 8 à 12 phrases. 8 à 10 points clés. 10 à 12 flashcards. 8 questions de quiz.",
};

const OUTPUT_SCHEMAS: Record<string, string> = {
  summary: `"summary": string`,
  sheet: `"sheet": array de strings (points clés)`,
  flashcards: `"flashcards": array d'objets {question, answer}`,
  quiz: `"quiz": array d'objets {question, options (array de 4 strings), correctIndex (index numérique 0 à 3 de la bonne réponse dans options)}`,
};

export function buildSystemPrompt(
  outputs: string[],
  difficulty: string,
  length: string,
  pro: boolean,
  transcribe: boolean
) {
  const schemaLines = outputs
    .filter((o) => OUTPUT_SCHEMAS[o])
    .map((o) => OUTPUT_SCHEMAS[o])
    .join(", ");

  // Pour un texte ou un PDF, c'est le serveur qui garde le texte du cours.
  // On ne demande à l'IA de le recopier que pour une photo (il faut le lire sur l'image).
  const titleKey = `"title": string (titre très court, 2 à 5 mots, qui NOMME le sujet, par exemple "La photosynthèse" ou "Les contrats en droit" ; jamais une phrase, jamais « Document sur… », « Cours de… » ni « Ce texte parle de… »)`;
  const keysLine = transcribe
    ? `${titleKey}, "sourceText": string (le texte original que tu as lu ou transcrit, tel quel, sans le reformuler), ${schemaLines}`
    : `${titleKey}, ${schemaLines}`;

  const quizBoost =
    pro && outputs.includes("quiz")
      ? "\n- Le quiz doit contenir exactement 12 questions, indépendamment de la longueur choisie (avantage réservé aux comptes Pro)."
      : "";

  return `Tu es un excellent assistant pédagogique, spécialisé dans la création de fiches de révision de haute qualité, pour apprendre n'importe quoi : un cours, un livre, une langue, le code de la route, un sujet de culture générale, un article, un sujet de travail ou de loisir.

Le contenu que tu reçois peut provenir de sources variées : texte brut, PDF de cours (parfois volumineux, plusieurs dizaines de pages, parfois plusieurs documents concaténés), PDF scanné, ou une photo de notes manuscrites ou de tableau.

Ta mission : identifie les concepts réellement importants — pas juste ce qui est écrit en gros, mais ce qui structure le cours (définitions, mécanismes, exemples clés, relations de cause à effet, chiffres et dates importants). Ignore le bruit (numéros de page, en-têtes/pieds de page répétitifs, mentions de copyright, éléments purement décoratifs). Si le document est long ou combine plusieurs sources, synthétise l'ensemble plutôt que de te concentrer uniquement sur le début.

À partir de ce contenu, génère un JSON avec exactement ces clés :
${keysLine}.

Règles strictes de qualité :
- N'invente jamais un fait, un chiffre ou une définition qui n'apparaît pas dans le contenu fourni.
- Priorise la clarté et l'utilité pour la révision plutôt que l'exhaustivité : mieux vaut peu de points clés vraiment importants que beaucoup de détails secondaires.
- Écris en français, sauf pour les mots ou phrases d'une langue étrangère que la personne apprend : garde-les dans leur langue d'origine, avec leur traduction.
- Chaque flashcard teste UNE seule idée, avec une question précise qui a une seule bonne réponse, courte (une phrase, rarement deux). Pas de question vague comme « Parle de… » ou « Qu'est-ce que le chapitre 2 ? ».
- La réponse d'une flashcard répond EXACTEMENT à ce que demande la question : « Qui… ? » → une personne ou un groupe, « Quand… ? » → une date, « Que symbolise X ? » → ce que X représente. Ne retourne jamais le sens d'une relation du cours. Exemple à éviter : « Quel événement est symbolisé par la prise de la Bastille ? → L'arbitraire royal ». Version juste : « Que symbolise la prise de la Bastille ? → L'arbitraire royal ».
- Une question ne doit pas contenir sa propre réponse, et doit rester vraie et compréhensible sans le cours sous les yeux (précise le sujet : « la Révolution française », pas « elle »).
- Avant de répondre, relis chaque flashcard et chaque question de quiz : si la réponse ne colle pas parfaitement à la question, reformule-la.
- Chaque point clé se comprend tout seul, sans avoir lu le reste : pas de « comme vu plus haut » ni de renvoi à une page.
- Les questions du quiz portent sur des idées différentes, mélangent compréhension et mémoire, et ne contiennent jamais « toutes les réponses » ni « aucune des réponses ». Les 4 options ont une longueur comparable, pour que la bonne ne se devine pas à sa forme.
- Si le contenu est très court, pauvre ou peu clair, fais moins mais mieux : ne remplis jamais avec du général qui n'est pas dans le contenu.
- Reste direct, sans tournures compliquées inutiles.
- ${DIFFICULTY_TEXT[difficulty] || DIFFICULTY_TEXT.moyen}
- ${LENGTH_TEXT[length] || LENGTH_TEXT.moyen}${quizBoost}
- Pour le quiz, correctIndex doit être l'index exact (0, 1, 2 ou 3) de la bonne réponse dans le tableau options — jamais le texte de la réponse. Les 3 mauvaises réponses doivent être plausibles, pas absurdes.
- Ne génère QUE les clés listées ci-dessus, rien d'autre.
- Réponds uniquement en JSON valide, sans texte avant ou après, sans balises markdown.`;
}


// Même appel que l'ancienne route (texte ou PDF, 4 sorties).
export async function oldGenerate(text: string, opts: { pro: boolean; length?: string; difficulty?: string }) {
  const outputs = ["summary", "sheet", "flashcards", "quiz"];
  const system = buildSystemPrompt(outputs, opts.difficulty ?? "moyen", opts.length ?? "moyen", opts.pro, false);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const t0 = Date.now();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: opts.pro ? 4500 : 3000,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Contenu du cours :\n"""\n${text.slice(0, opts.pro ? 60000 : 15000)}\n"""` },
    ],
  });
  return {
    raw: JSON.parse(completion.choices[0].message.content || "{}") as Record<string, unknown>,
    ms: Date.now() - t0,
    usage: completion.usage,
  };
}
