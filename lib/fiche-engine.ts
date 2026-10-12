// Moteur de fiches FishFlow, en plusieurs étapes :
//   1. plan du cours (toutes les notions, rangées en parties) ;
//   2. rédaction de chaque partie, en parallèle ;
//   3. contrôle de chaque partie contre le cours (oublis et inventions), corrigée si besoin ;
//   4. « L'essentiel en 5 lignes », flashcards et quiz écrits à partir de la fiche finale.
// Ce fichier ne dépend que d'openai : il sert à la fois à la route /api/generate et au banc d'essai (bench/).

import OpenAI from "openai";

export type BlockKind = "texte" | "liste" | "retenir" | "piege" | "exemple";
export type FicheBlock = { type: BlockKind; text: string; items?: string[] };
export type FicheSection = { title: string; blocks: FicheBlock[] };
export type Fiche = { sections: FicheSection[] };
export type Flashcard = { question: string; answer: string };
export type QuizQuestion = { question: string; options: string[]; correctIndex: number };

export type OutputKey = "summary" | "sheet" | "flashcards" | "quiz";

export type EngineModels = { plan: string; write: string; check: string; cards: string; vision: string };

// Choix retenu après le banc d'essai (voir bench/RESULTATS.md).
export const DEFAULT_MODELS: EngineModels = {
  plan: "gpt-4.1-mini",
  write: "gpt-4.1-mini",
  check: "gpt-4.1-mini",
  cards: "gpt-4.1-mini",
  vision: "gpt-4.1-mini",
};

export type EngineOptions = {
  outputs: OutputKey[];
  difficulty: string;
  length: string;
  pro: boolean;
  models?: Partial<EngineModels>;
  // Heure limite (Date.now()) : passé un certain point, on saute le contrôle pour rendre la fiche à temps.
  deadline?: number;
  // Fiche déjà faite (régénération des flashcards, du quiz ou de l'essentiel) : on ne la refait pas.
  existingFiche?: Fiche;
  apiKey?: string;
};

export type EngineUsage = { model: string; step: string; input: number; cached: number; output: number; ms: number };

export type EngineResult = {
  title?: string;
  sourceText?: string;
  fiche?: Fiche;
  essentiel?: string[];
  summary?: string;
  sheet?: string[];
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  version?: number;
};

export class EngineError extends Error {
  code: "TIMEOUT" | "EMPTY" | "API";
  status?: number;
  constructor(code: "TIMEOUT" | "EMPTY" | "API", message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ---------- Petits outils ----------

const asText = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Retire le balisage (**gras**, ==surligné==) : pour les textes simples (résumé lu à voix haute, anciens affichages).
export function stripMarks(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/==(.+?)==/g, "$1").replace(/\*\*|==/g, "");
}

// Un balisage mal fermé ne doit jamais s'afficher tel quel.
function balanceMarks(s: string): string {
  let out = s;
  if ((out.match(/\*\*/g) || []).length % 2 === 1) out = out.replace(/\*\*(?!.*\*\*)/, "");
  if ((out.match(/==/g) || []).length % 2 === 1) out = out.replace(/==(?!.*==)/, "");
  return out;
}

export function cleanTitle(value: unknown): string {
  let t = asText(value).replace(/^["«“'\s]+|["»”'\s.]+$/g, "");
  t = t.replace(/^(le |la |l'|un |une )?(document|texte|cours|pdf|fichier|extrait)\s+(qui\s+)?(parle|traite|porte|présente|explique|décrit)\s+(de |du |des |d'|sur |à propos (de |du |des |d')?)?/i, "");
  t = t.replace(/^(cours|fiche|résumé)\s+(de |du |des |d'|sur )/i, "");
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const words = t.split(" ");
  if (words.length > 6) t = words.slice(0, 6).join(" ");
  t = t.slice(0, 48).trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const KINDS: BlockKind[] = ["texte", "liste", "retenir", "piege", "exemple"];

export function normalizeFiche(raw: unknown): Fiche | null {
  const sections: FicheSection[] = [];
  for (const s of asArray((raw as { sections?: unknown })?.sections).slice(0, 12)) {
    const sec = (s ?? {}) as Record<string, unknown>;
    const title = stripMarks(asText(sec.title)).slice(0, 120);
    const blocks = normalizeBlocks(sec.blocks);
    if (title && blocks.length > 0) sections.push({ title, blocks });
  }
  return sections.length > 0 ? { sections } : null;
}

function normalizeBlocks(raw: unknown): FicheBlock[] {
  const blocks: FicheBlock[] = [];
  for (const b of asArray(raw).slice(0, 40)) {
    const block = (b ?? {}) as Record<string, unknown>;
    const type = KINDS.includes(block.type as BlockKind) ? (block.type as BlockKind) : "texte";
    const text = balanceMarks(asText(block.text)).slice(0, 2000);
    const items = asArray(block.items).map((i) => balanceMarks(asText(i)).slice(0, 600)).filter(Boolean).slice(0, 20);
    if (type === "liste") {
      if (items.length > 0) blocks.push({ type, text, items });
      else if (text) blocks.push({ type: "texte", text });
    } else if (text || items.length > 0) {
      blocks.push(items.length > 0 ? { type, text, items } : { type, text });
    }
  }
  return blocks;
}

function normalizeCards(raw: unknown): Flashcard[] {
  const cards: Flashcard[] = [];
  const seen = new Set<string>();
  for (const item of asArray(raw)) {
    const card = (item ?? {}) as Record<string, unknown>;
    const question = stripMarks(asText(card.question));
    const answer = stripMarks(asText(card.answer));
    const key = question.toLowerCase();
    if (question && answer && !seen.has(key)) {
      seen.add(key);
      cards.push({ question, answer });
    }
  }
  return cards;
}

function normalizeQuiz(raw: unknown): QuizQuestion[] {
  const quiz: QuizQuestion[] = [];
  for (const item of asArray(raw)) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const question = stripMarks(asText(entry.question));
    const rawOptions = asArray(entry.options).map((o) => stripMarks(asText(o)));
    const rawIndex = Number(entry.correctIndex);
    const right = Number.isInteger(rawIndex) ? rawOptions[rawIndex] : "";
    // On retire les réponses vides ou en double, puis on les mélange : l'IA met trop souvent la bonne réponse au même endroit.
    const options = shuffle(Array.from(new Set(rawOptions.filter(Boolean))));
    const correctIndex = right ? options.indexOf(right) : -1;
    if (question && options.length >= 2 && correctIndex >= 0) quiz.push({ question, options, correctIndex });
  }
  return quiz;
}

// La fiche en texte simple (pour l'envoyer à l'IA, ou pour la compatibilité avec les anciens affichages).
export function ficheToText(fiche: Fiche): string {
  const label: Record<BlockKind, string> = { texte: "", liste: "", retenir: "À retenir : ", piege: "Piège : ", exemple: "Exemple : " };
  return fiche.sections
    .map((s, i) => {
      const body = s.blocks
        .map((b) => {
          const items = (b.items ?? []).map((it) => `- ${it}`).join("\n");
          return [label[b.type] + b.text, items].filter((x) => x.trim()).join("\n");
        })
        .join("\n");
      return `## ${i + 1}. ${s.title}\n${body}`;
    })
    .join("\n\n");
}

// Ancien format « sheet » (liste de points) : les encadrés « À retenir », sinon la première phrase de chaque partie.
function ficheToSheet(fiche: Fiche): string[] {
  const points: string[] = [];
  for (const s of fiche.sections) {
    const keep = s.blocks.filter((b) => b.type === "retenir");
    if (keep.length > 0) keep.forEach((b) => points.push(stripMarks([b.text, ...(b.items ?? [])].filter(Boolean).join(" "))));
    else {
      const first = s.blocks.find((b) => b.text);
      if (first) points.push(`${s.title} : ${stripMarks(first.text)}`);
    }
  }
  return points.filter(Boolean);
}

// ---------- Réglages selon la longueur choisie ----------

function sizing(sourceChars: number, length: string, pro: boolean) {
  // Le nombre de parties suit la taille du cours ; la longueur choisie règle le niveau de détail.
  const base = sourceChars < 2500 ? 1 : sourceChars < 6000 ? 2 : sourceChars < 12000 ? 3 : sourceChars < 20000 ? 4 : sourceChars < 35000 ? 6 : 8;
  const parts = length === "court" ? Math.max(1, Math.min(base, 4)) : base;
  const cardsByLength: Record<string, number> = { court: 8, moyen: 14, detaille: 22 };
  const quizByLength: Record<string, number> = { court: 5, moyen: 8, detaille: 10 };
  const sizeBonus = sourceChars > 20000 ? 1.4 : sourceChars < 3000 ? 0.6 : 1;
  const cards = Math.max(4, Math.round((cardsByLength[length] ?? 14) * sizeBonus));
  // Avantage Pro annoncé : un quiz de 12 questions.
  const quiz = pro ? 12 : Math.max(3, Math.round((quizByLength[length] ?? 8) * Math.min(1, sizeBonus)));
  return { parts, cards: Math.min(cards, 30), quiz };
}

const DIFFICULTY_TEXT: Record<string, string> = {
  facile: "Niveau débutant : phrases courtes, mots simples ; chaque terme technique du cours est gardé mais expliqué simplement.",
  moyen: "Niveau lycée / début d'études : clair, précis, sans jargon inutile.",
  difficile: "Niveau avancé : vocabulaire technique précis du cours, nuances et détails conservés.",
};

const DETAIL_TEXT: Record<string, string> = {
  court: "Version courte : va droit au but, une ou deux phrases par notion, mais n'en saute aucune.",
  moyen: "Version normale : explique chaque notion clairement (définition, comment, pourquoi), avec les chiffres et exemples du cours.",
  detaille: "Version détaillée : explique chaque notion à fond, avec tous les chiffres, étapes, nuances et exemples que donne le cours.",
};

// ---------- Appels à l'IA ----------

type Ctx = {
  client: OpenAI;
  models: EngineModels;
  usage: EngineUsage[];
  deadline: number;
};

type JsonSchema = Record<string, unknown>;

const S = {
  str: { type: "string" },
  strArr: { type: "array", items: { type: "string" } },
};
const obj = (properties: Record<string, unknown>): JsonSchema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const BLOCK_SCHEMA = obj({
  type: { type: "string", enum: KINDS },
  text: S.str,
  items: S.strArr,
});

const isReasoning = (model: string) => /^(gpt-5|o\d)/.test(model);

async function callJson(
  ctx: Ctx,
  step: string,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  schemaName: string,
  schema: JsonSchema,
  maxTokens: number
): Promise<Record<string, unknown>> {
  const remaining = ctx.deadline - Date.now();
  if (remaining < 2000) throw new EngineError("TIMEOUT", "Plus de temps");
  const t0 = Date.now();
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    max_completion_tokens: isReasoning(model) ? maxTokens + 4000 : maxTokens,
  };
  if (isReasoning(model)) params.reasoning_effort = "minimal";
  else params.temperature = 0.2;

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await ctx.client.chat.completions.create(params, { timeout: remaining, maxRetries: 1 });
  } catch (e) {
    const err = e as { status?: number; message?: string; name?: string };
    if (err?.name === "APIConnectionTimeoutError" || /timed? ?out/i.test(err?.message ?? "")) throw new EngineError("TIMEOUT", "Délai dépassé");
    throw new EngineError("API", err?.message || "Erreur IA", err?.status);
  }
  const u = completion.usage;
  ctx.usage.push({
    model,
    step,
    input: u?.prompt_tokens ?? 0,
    cached: u?.prompt_tokens_details?.cached_tokens ?? 0,
    output: u?.completion_tokens ?? 0,
    ms: Date.now() - t0,
  });
  const choice = completion.choices[0];
  if (choice.finish_reason === "length") throw new EngineError("EMPTY", `Réponse coupée (${step})`);
  try {
    return JSON.parse(choice.message.content || "{}");
  } catch {
    throw new EngineError("EMPTY", `JSON invalide (${step})`);
  }
}

// Le début de conversation est identique pour toutes les étapes qui lisent le cours :
// OpenAI le garde alors en cache (le cours n'est payé plein tarif qu'une fois).
function courseSystem(source: string, difficulty: string) {
  return `Tu es un professeur qui fait des fiches de révision excellentes, fidèles et complètes, en français.

Règles absolues :
- Tu n'utilises QUE le contenu du cours ci-dessous. Tu n'ajoutes aucun fait, chiffre, date, nom, définition ou exemple qui n'y est pas, même si tu le connais.
- Tu ne modifies jamais un chiffre, une date, un nom ou une formule du cours.
- Le cours fait foi : même si une affirmation du cours te semble fausse, dépassée ou différente de ce que tu sais, tu rapportes ce que dit le cours, sans le « corriger ».
- Tu ignores le bruit : numéros de page, en-têtes et pieds de page répétés, références bibliographiques, liens, mentions de copyright.
- Pour une langue étrangère étudiée, garde les mots et phrases dans leur langue d'origine avec leur traduction.
- ${DIFFICULTY_TEXT[difficulty] || DIFFICULTY_TEXT.moyen}

=== COURS ===
${source}
=== FIN DU COURS ===`;
}

const PLAN_SCHEMA = obj({
  title: S.str,
  parts: { type: "array", items: obj({ title: S.str, notions: S.strArr }) },
});

type Part = { title: string; notions: string[] };

async function makePlan(ctx: Ctx, system: string, partsTarget: number, notionsTarget: number) {
  const raw = await callJson(
    ctx,
    "plan",
    ctx.models.plan,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Étape 1 : le plan de la fiche.

Lis TOUT le cours, du début à la fin, et fais :
- "title" : le sujet en 2 à 5 mots (par exemple « La photosynthèse »), jamais une phrase ni « Cours de… ».
- "parts" : environ ${partsTarget} partie${partsTarget > 1 ? "s" : ""} qui suivent l'ordre et la logique du cours (regroupe les petits passages, coupe les très longs). Chaque partie a un titre court et clair.
- Pour chaque partie, "notions" : la liste COMPLÈTE (au moins ${notionsTarget} notions au total pour tout le cours) de ce qu'un élève doit savoir sur ce passage. Une notion par élément, écrite comme un mini-rappel précis avec son contenu : définitions, mécanismes et étapes, causes et conséquences, dates, chiffres, personnes, lieux, formules, règles et leurs exceptions, oppositions, exemples donnés par le cours.
  Bon : « 14 juillet 1789 : prise de la Bastille, symbole de l'arbitraire royal ». Mauvais : « La Bastille ».

Rien d'important ne doit manquer, y compris à la fin du cours. Pas de notion inventée.`,
      },
    ],
    "plan",
    PLAN_SCHEMA,
    6000
  );
  const parts: Part[] = asArray(raw.parts)
    .map((p) => {
      const part = (p ?? {}) as Record<string, unknown>;
      return { title: stripMarks(asText(part.title)), notions: asArray(part.notions).map(asText).filter(Boolean) };
    })
    .filter((p) => p.title && p.notions.length > 0)
    .slice(0, 10);
  if (parts.length === 0) throw new EngineError("EMPTY", "Plan vide");
  return { title: cleanTitle(raw.title), parts };
}

const SECTION_SCHEMA = obj({ blocks: { type: "array", items: BLOCK_SCHEMA } });

const WRITING_RULES = `Format : une liste de "blocks", dans l'ordre de lecture. Chaque bloc a "type", "text" et "items" (liste vide si inutile).
- "texte" : un paragraphe de 1 à 4 phrases qui explique.
- "liste" : "text" = phrase d'introduction courte (ou vide), "items" = les éléments (étapes, causes, caractéristiques…).
- "exemple" : un exemple, un cas ou une application QUI EST DANS LE COURS (sinon, pas de bloc exemple).
- "piege" : deux notions proches à ne pas confondre, une exception à une règle, une nuance ou une erreur à éviter, tirée du cours. Dès que le cours distingue ou oppose deux choses voisines, ou donne une exception, fais-en un piège. Pas de piège inventé.
- "retenir" : exactement UN par partie, en dernier : l'idée essentielle de la partie en 1 à 3 phrases, ou en "items" courts.

Mise en valeur (dans "text" et "items") :
- **mot** : mets en gras chaque mot-clé, nom, date ou chiffre important, à sa première apparition (2 à 4 par paragraphe, pas de phrases entières en gras).
- ==phrase== : surligne la ou les 1 à 2 phrases les plus importantes de la partie (définition centrale, règle, formule). Pas plus.
- Pas d'autre balisage (pas de #, pas de _italique_, pas de HTML). Les formules s'écrivent en texte simple (a² + b² = c²).

Style : phrases claires et complètes, qui se comprennent sans le cours sous les yeux. Chaque phrase apporte une information du cours : pas de phrase de remplissage (« cela souligne l'importance de… », « il est crucial de comprendre… »), pas de « dans cette partie », pas de « le texte dit », pas de renvoi à une page.`;

async function writeSection(ctx: Ctx, system: string, plan: Part[], index: number, length: string) {
  const part = plan[index];
  const outline = plan.map((p, i) => `${i + 1}. ${p.title}`).join("\n");
  const raw = await callJson(
    ctx,
    "write",
    ctx.models.write,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Étape 2 : rédige UNE partie de la fiche.

Plan de toute la fiche (pour ne pas répéter les autres parties) :
${outline}

Partie à rédiger : ${index + 1}. ${part.title}
Notions à couvrir, TOUTES, avec les explications et détails que donne le cours (relis le passage correspondant du cours) :
${part.notions.map((n) => `- ${n}`).join("\n")}

Si le passage du cours contient d'autres informations importantes absentes de cette liste, ajoute-les aussi.
${DETAIL_TEXT[length] || DETAIL_TEXT.moyen}

${WRITING_RULES}`,
      },
    ],
    "partie",
    SECTION_SCHEMA,
    length === "detaille" ? 4500 : 3200
  );
  const blocks = normalizeBlocks(raw.blocks);
  if (blocks.length === 0) throw new EngineError("EMPTY", "Partie vide");
  return { title: part.title, blocks } satisfies FicheSection;
}

const CHECK_SCHEMA = obj({
  problemes: S.strArr,
  corrige: { type: "boolean" },
  blocks: { type: "array", items: BLOCK_SCHEMA },
});

async function checkSection(ctx: Ctx, system: string, part: Part, section: FicheSection) {
  const raw = await callJson(
    ctx,
    "check",
    ctx.models.check,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Étape 3 : contrôle qualité d'une partie de fiche, rédigée à partir du cours ci-dessus.

Partie : ${section.title}
Notions qui devaient être couvertes :
${part.notions.map((n) => `- ${n}`).join("\n")}

Partie rédigée (JSON) :
${JSON.stringify(section.blocks)}

Vérifie, en relisant le cours. Le cours fait foi : tu compares UNIQUEMENT au cours, jamais à tes propres connaissances. Si le cours dit une chose, elle est juste ici, même si tu crois qu'elle est fausse.
1. Inventions et erreurs : une phrase, un chiffre, une date, un nom, un exemple ou un piège qui n'est PAS dans le cours, ou qui déforme ce que dit le cours. Les phrases de remplissage sans information du cours sont à retirer.
2. Oublis : une notion de la liste absente ou seulement nommée sans son contenu.
3. Mise en valeur : du balisage cassé, ou pas de bloc "retenir" à la fin.

"problemes" : la liste courte des problèmes trouvés (vide si tout est bon).
Si tout est bon : "corrige" = false et "blocks" = [].
Sinon : "corrige" = true et "blocks" = la partie entière corrigée (retire ou rectifie ce qui est inventé ou faux, complète les oublis), avec les mêmes règles :

${WRITING_RULES}`,
      },
    ],
    "controle",
    CHECK_SCHEMA,
    4500
  );
  const problems = asArray(raw.problemes).map(asText).filter(Boolean);
  if (raw.corrige === true) {
    const blocks = normalizeBlocks(raw.blocks);
    if (blocks.length > 0) return { section: { title: section.title, blocks }, problems };
  }
  return { section, problems };
}

function ficheSystem(fiche: Fiche, title: string, difficulty: string) {
  return `Tu es un professeur qui prépare des révisions en français, à partir d'une fiche de cours vérifiée.
Tu n'utilises QUE le contenu de la fiche : aucun fait extérieur.
${DIFFICULTY_TEXT[difficulty] || DIFFICULTY_TEXT.moyen}

=== FICHE : ${title || "Cours"} ===
${stripMarks(ficheToText(fiche))}
=== FIN DE LA FICHE ===`;
}

async function makeEssentiel(ctx: Ctx, system: string) {
  const raw = await callJson(
    ctx,
    "essentiel",
    ctx.models.cards,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Écris « L'essentiel en 5 lignes » : exactement 5 phrases courtes, une par ligne, qui résument toute la fiche dans l'ordre (de la première à la dernière partie). Chaque phrase se comprend seule. Mets en gras (**mot**) 1 ou 2 mots-clés par phrase.`,
      },
    ],
    "essentiel",
    obj({ lignes: S.strArr }),
    800
  );
  return asArray(raw.lignes).map((l) => balanceMarks(asText(l))).filter(Boolean).slice(0, 5);
}

const CARD_RULES = `- Chaque carte teste UNE seule idée, avec une question précise qui n'a qu'une bonne réponse, et une réponse courte (une phrase, rarement deux).
- La réponse répond EXACTEMENT à la question : « Qui… ? » → une personne ou un groupe, « Quand… ? » → une date, « Que symbolise X ? » → ce que X représente. Ne retourne jamais le sens d'une relation de la fiche.
- La question ne contient pas sa réponse et reste compréhensible sans la fiche (précise le sujet : « la Révolution française », pas « elle »).
- Pas de question vague (« Parle de… », « Que dit la partie 2 ? »).
- Pas de balisage (ni ** ni ==).`;

async function makeFlashcards(ctx: Ctx, system: string, count: number, sections: number) {
  const raw = await callJson(
    ctx,
    "flashcards",
    ctx.models.cards,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Écris ${count} flashcards qui couvrent toute la fiche : réparties sur les ${sections} parties, en priorité les définitions, règles, dates, chiffres, causes et conséquences, et les pièges.
${CARD_RULES}
Relis chaque carte avant de répondre : si la réponse ne colle pas parfaitement à la question, reformule-la.`,
      },
    ],
    "flashcards",
    obj({ flashcards: { type: "array", items: obj({ question: S.str, answer: S.str }) } }),
    Math.max(1500, count * 110)
  );
  return normalizeCards(raw.flashcards).slice(0, count + 2);
}

async function makeQuiz(ctx: Ctx, system: string, count: number, sections: number) {
  const raw = await callJson(
    ctx,
    "quiz",
    ctx.models.cards,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Écris un quiz de ${count} questions à choix multiple sur toute la fiche (réparties sur les ${sections} parties), qui mélangent compréhension et mémoire.
- 4 options par question, une seule juste selon la fiche ; "correctIndex" = sa position (0 à 3) dans "options".
- Les 3 mauvaises réponses sont plausibles mais clairement fausses d'après la fiche. Les 4 options ont une longueur comparable.
- Jamais « toutes les réponses » ni « aucune des réponses ». Chaque question porte sur une idée différente.
- Pas de balisage (ni ** ni ==).
Vérifie chaque question avant de répondre : la bonne réponse doit être exacte d'après la fiche, et correctIndex doit pointer vers elle.`,
      },
    ],
    "quiz",
    obj({ quiz: { type: "array", items: obj({ question: S.str, options: S.strArr, correctIndex: { type: "integer" } }) } }),
    Math.max(1500, count * 160)
  );
  return normalizeQuiz(raw.quiz).slice(0, count);
}

// Photo(s) d'un cours : on recopie d'abord fidèlement le texte, puis on suit le même chemin qu'un texte.
export async function transcribeImages(ctx: Ctx, images: string[]) {
  const raw = await callJson(
    ctx,
    "transcription",
    ctx.models.vision,
    [
      {
        role: "system",
        content:
          "Tu recopies fidèlement le texte de photos de cours (notes manuscrites, tableau, pages de livre, diapositives). Tu ne résumes pas, tu ne corriges pas le fond, tu n'ajoutes rien. Tu gardes les titres, listes, formules (en texte simple) et l'ordre. Les schémas : décris en une ligne entre crochets ce qu'ils montrent, avec leurs légendes.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              images.length > 1
                ? `Voici ${images.length} photos : les pages d'un même cours, dans l'ordre. Recopie tout leur texte, page après page. "lisible" = false seulement si aucune n'est un cours lisible.`
                : `Recopie tout le texte de cette photo de cours. "lisible" = false seulement si ce n'est pas un cours lisible.`,
          },
          ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ],
      },
    ],
    "transcription",
    obj({ lisible: { type: "boolean" }, texte: S.str }),
    3000 + images.length * 1500
  );
  const text = typeof raw.texte === "string" ? raw.texte.trim() : "";
  if (raw.lisible === false || text.length < 20) throw new EngineError("EMPTY", "Photo illisible");
  return text;
}

// ---------- Le chef d'orchestre ----------

export function makeContext(opts: { apiKey?: string; models?: Partial<EngineModels>; deadline?: number }): Ctx {
  return {
    client: new OpenAI({ apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY }),
    models: { ...DEFAULT_MODELS, ...(opts.models ?? {}) },
    usage: [],
    deadline: opts.deadline ?? Date.now() + 10 * 60 * 1000,
  };
}

// Temps laissé aux étapes finales (flashcards, quiz) : si le contrôle risque de les empêcher, on le saute.
const FINAL_STEPS_MS = 22000;

export async function buildFiche(ctx: Ctx, source: string, opts: Pick<EngineOptions, "difficulty" | "length">) {
  const system = courseSystem(source, opts.difficulty);
  const { parts: partsTarget } = sizing(source.length, opts.length, false);
  // Environ une notion pour 350 caractères de cours : c'est ce qui fait une fiche complète.
  const notionsTarget = Math.round(Math.min(90, Math.max(8, source.length / 350)));
  const plan = await makePlan(ctx, system, partsTarget, notionsTarget);
  const report: string[] = [];

  const sections = await Promise.all(
    plan.parts.map(async (part, i) => {
      let section: FicheSection;
      try {
        section = await writeSection(ctx, system, plan.parts, i, opts.length);
      } catch (e) {
        if (e instanceof EngineError && e.code === "TIMEOUT") throw e;
        section = await writeSection(ctx, system, plan.parts, i, opts.length);
      }
      if (ctx.deadline - Date.now() < FINAL_STEPS_MS + 15000) {
        report.push(`${part.title} : contrôle sauté (temps)`);
        return section;
      }
      try {
        const checked = await checkSection(ctx, system, part, section);
        checked.problems.forEach((p) => report.push(`${part.title} : ${p}`));
        return checked.section;
      } catch (e) {
        // Le contrôle est un bonus : en cas d'échec on garde la partie rédigée.
        report.push(`${part.title} : contrôle impossible (${(e as Error).message})`);
        return section;
      }
    })
  );

  return { title: plan.title, fiche: { sections } as Fiche, plan: plan.parts, report };
}

export async function runEngine(ctx: Ctx, source: string, opts: EngineOptions) {
  const wants = (k: OutputKey) => opts.outputs.includes(k);
  const result: EngineResult = { version: 2 };
  let report: string[] = [];
  let plan: Part[] = [];
  let fiche: Fiche;

  if (opts.existingFiche && !wants("sheet")) {
    fiche = opts.existingFiche;
  } else {
    const built = await buildFiche(ctx, source, opts);
    fiche = built.fiche;
    report = built.report;
    plan = built.plan;
    if (built.title) result.title = built.title;
  }

  const sizes = sizing(source.length, opts.length, opts.pro);
  const system = ficheSystem(fiche, result.title ?? "", opts.difficulty);
  const n = fiche.sections.length;
  const [essentiel, flashcards, quiz] = await Promise.all([
    wants("summary") ? makeEssentiel(ctx, system) : Promise.resolve(undefined),
    wants("flashcards") ? makeFlashcards(ctx, system, sizes.cards, n) : Promise.resolve(undefined),
    wants("quiz") ? makeQuiz(ctx, system, sizes.quiz, n) : Promise.resolve(undefined),
  ]);

  if (wants("sheet")) {
    result.fiche = fiche;
    // Ancien format, gardé pour tout ce qui lit encore « sheet ».
    result.sheet = ficheToSheet(fiche);
  }
  if (wants("summary")) {
    if (!essentiel || essentiel.length === 0) throw new EngineError("EMPTY", "Essentiel vide");
    result.essentiel = essentiel;
    result.summary = essentiel.map(stripMarks).join(" ");
  }
  if (wants("flashcards")) {
    if (!flashcards || flashcards.length === 0) throw new EngineError("EMPTY", "Flashcards vides");
    result.flashcards = flashcards;
  }
  if (wants("quiz")) {
    if (!quiz || quiz.length === 0) throw new EngineError("EMPTY", "Quiz vide");
    result.quiz = quiz;
  }
  return { result, report, plan, usage: ctx.usage };
}

// Prix en dollars par million de jetons (entrée, entrée en cache, sortie). À vérifier sur openai.com/api/pricing.
export const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
  "gpt-4.1-mini": { input: 0.4, cached: 0.1, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, cached: 0.025, output: 0.4 },
  "gpt-4.1": { input: 2, cached: 0.5, output: 8 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2 },
  "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
  "gpt-5": { input: 1.25, cached: 0.125, output: 10 },
};

export function costUsd(usage: EngineUsage[]): number {
  let total = 0;
  for (const u of usage) {
    const p = PRICES[u.model] ?? PRICES["gpt-4.1-mini"];
    total += ((u.input - u.cached) * p.input + u.cached * p.cached + u.output * p.output) / 1e6;
  }
  return total;
}
