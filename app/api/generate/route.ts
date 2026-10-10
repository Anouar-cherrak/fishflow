import OpenAI from "openai";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT, getUsage, isProUser, monthKey, refundUsage, reserveUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CHARS_FREE = 15000;
const MAX_CHARS_PRO = 60000;
const TIMEOUT_MS = 50000;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 Mo — marge de sécurité sous la limite de payload de Vercel (~4.5 Mo)

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

type Flashcard = { question: string; answer: string };
type QuizQuestion = { question: string; options: string[]; correctIndex: number };

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// Vérifie et nettoie la réponse de l'IA avant de l'envoyer au navigateur.
// Renvoie null si une sortie demandée est vide ou inutilisable.
// Titre court : 5 mots au plus, sans « Document qui parle de… ». Vide si inutilisable (on retombera sur un titre de secours).
function cleanTitle(value: unknown): string {
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

function normalizeResult(raw: Record<string, unknown> | null, outputs: string[]) {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, unknown> = {};

  const title = cleanTitle(raw.title);
  if (title) out.title = title;

  if (outputs.includes("summary")) {
    const summary = Array.isArray(raw.summary)
      ? asArray(raw.summary).map(asText).filter(Boolean).join(" ")
      : asText(raw.summary);
    if (!summary) return null;
    out.summary = summary;
  }

  if (outputs.includes("sheet")) {
    const sheet = asArray(raw.sheet).map(asText).filter(Boolean);
    if (sheet.length === 0) return null;
    out.sheet = sheet;
  }

  if (outputs.includes("flashcards")) {
    const flashcards: Flashcard[] = [];
    for (const item of asArray(raw.flashcards)) {
      const card = (item ?? {}) as Record<string, unknown>;
      const question = asText(card.question);
      const answer = asText(card.answer);
      if (question && answer) flashcards.push({ question, answer });
    }
    if (flashcards.length === 0) return null;
    out.flashcards = flashcards;
  }

  if (outputs.includes("quiz")) {
    const quiz: QuizQuestion[] = [];
    for (const item of asArray(raw.quiz)) {
      const entry = (item ?? {}) as Record<string, unknown>;
      const question = asText(entry.question);
      const rawOptions = asArray(entry.options).map(asText);
      const rawIndex = Number(entry.correctIndex);
      const right = Number.isInteger(rawIndex) ? rawOptions[rawIndex] : "";
      // On retire les réponses vides ou en double, puis on les mélange : l'IA met trop souvent la bonne réponse au même endroit.
      const options = shuffle(Array.from(new Set(rawOptions.filter(Boolean))));
      const correctIndex = right ? options.indexOf(right) : -1;
      if (question && options.length >= 2 && correctIndex >= 0) {
        quiz.push({ question, options, correctIndex });
      }
    }
    if (quiz.length === 0) return null;
    out.quiz = quiz;
  }

  return out;
}

function buildSystemPrompt(
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Connecte-toi pour générer une fiche." },
      { status: 401 }
    );
  }

  const pro = await isProUser(user.id);
  const MAX_CHARS = pro ? MAX_CHARS_PRO : MAX_CHARS_FREE;

  if (!pro) {
    const usage = await getUsage(user.id);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Tu as atteint ta limite de ${usage.limit} fiches gratuites ce mois-ci. Passe à FishFlow Pro pour continuer.`,
          quotaExceeded: true,
        },
        { status: 403 }
      );
    }
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Impossible de lire les données envoyées. Réessaie." },
      { status: 400 }
    );
  }

  const mode = formData.get("mode") as string;
  const outputsRaw = (formData.get("outputs") as string) || "summary,sheet,flashcards,quiz";
  const outputs = outputsRaw.split(",").filter(Boolean);
  const difficulty = (formData.get("difficulty") as string) || "moyen";
  const length = (formData.get("length") as string) || "moyen";

  if (outputs.length === 0) {
    return NextResponse.json(
      { error: "Sélectionne au moins une sortie à générer." },
      { status: 400 }
    );
  }

  const SYSTEM_PROMPT = buildSystemPrompt(outputs, difficulty, length, pro, mode === "photo");

  let messages: any[];
  let wasTruncated = false;
  let sourceText: string | undefined;

  try {
    if (mode === "text") {
      const text = formData.get("text") as string;
      if (!text || text.trim().length < 10) {
        return NextResponse.json(
          { error: "Le texte est trop court ou vide. Ajoute plus de contenu." },
          { status: 400 }
        );
      }
      wasTruncated = text.length > MAX_CHARS;
      if (wasTruncated && !pro) {
        return NextResponse.json(
          {
            error: `Ce texte est trop long pour un compte gratuit (${MAX_CHARS_FREE.toLocaleString("fr-FR")} caractères maximum). Raccourcis-le, ou passe à FishFlow Pro pour des documents plus volumineux.`,
            requiresPro: true,
          },
          { status: 403 }
        );
      }
      const limitedText = text.slice(0, MAX_CHARS);
      sourceText = limitedText;
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contenu du cours :\n"""\n${limitedText}\n"""` },
      ];
    } else if (mode === "pdf") {
      const files = formData.getAll("files") as File[];
      const singleFile = formData.get("file") as File | null;
      const allFiles = files.length > 0 ? files : singleFile ? [singleFile] : [];

      if (allFiles.length === 0) {
        return NextResponse.json({ error: "Aucun fichier PDF reçu." }, { status: 400 });
      }

      if (allFiles.length > 1 && !pro) {
        return NextResponse.json(
          {
            error: "L'envoi de plusieurs PDF à la fois est réservé aux comptes Pro.",
            requiresPro: true,
          },
          { status: 403 }
        );
      }

      const textParts: string[] = [];
      for (const f of allFiles) {
        const extracted = await extractPdfText(f);
        if (extracted.trim().length > 0) {
          textParts.push(`--- Document : ${f.name} ---\n${extracted}`);
        }
      }
      const text = textParts.join("\n\n");

      wasTruncated = text.length > MAX_CHARS;
      const limitedText = text.slice(0, MAX_CHARS);

      if (limitedText.trim().length < 20) {
        return NextResponse.json(
          {
            error:
              "Impossible d'extraire du texte de ce PDF. Il s'agit probablement d'un PDF scanné (image), pas d'un PDF avec du vrai texte. Essaie avec un autre fichier.",
          },
          { status: 400 }
        );
      }

      if (wasTruncated && !pro) {
        return NextResponse.json(
          {
            error:
              "Ce document est trop long pour un compte gratuit. Passe à FishFlow Pro pour analyser des documents plus volumineux.",
            requiresPro: true,
          },
          { status: 403 }
        );
      }

      sourceText = limitedText;
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contenu du cours (extrait d'un ou plusieurs PDF) :\n"""\n${limitedText}\n"""` },
      ];
    } else if (mode === "photo") {
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "Aucune photo reçue." }, { status: 400 });
      }

      if (file.size > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          {
            error: "Cette photo est trop volumineuse (max 4 Mo). Réduis la qualité ou recadre l'image, puis réessaie.",
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Lis le contenu de cette image (le cours) et génère le JSON demandé." },
            { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
          ],
        },
      ];
    } else {
      return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
    }
  } catch (err) {
    console.error("Erreur lecture/extraction fichier:", err);
    return NextResponse.json(
      { error: "Impossible de lire ce fichier. Vérifie qu'il n'est pas corrompu et réessaie." },
      { status: 400 }
    );
  }

  // On réserve la génération gratuite avant d'appeler l'IA (plusieurs demandes en même temps ne passent plus),
  // et on la rend si la génération échoue.
  const usageKey = monthKey();
  if (!pro) {
    const ok = await reserveUsage(user.id, usageKey, FREE_MONTHLY_LIMIT);
    if (!ok) {
      return NextResponse.json(
        {
          error: `Tu as atteint ta limite de ${FREE_MONTHLY_LIMIT} fiches gratuites ce mois-ci. Passe à FishFlow Pro pour continuer.`,
          quotaExceeded: true,
        },
        { status: 403 }
      );
    }
  }
  const giveBack = async () => {
    if (!pro) await refundUsage(user.id, usageKey);
  };

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: pro ? 4500 : 3000,
        messages,
      }),
      TIMEOUT_MS
    );

    const choice = completion.choices[0];

    if (choice.finish_reason === "length") {
      await giveBack();
      return NextResponse.json(
        { error: "La réponse de l'IA a été coupée car le contenu est trop riche. Choisis une longueur plus courte ou moins de sorties, puis réessaie." },
        { status: 502 }
      );
    }

    const rawContent = choice.message.content || "{}";

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      await giveBack();
      return NextResponse.json(
        { error: "L'IA a renvoyé une réponse invalide. Réessaie." },
        { status: 502 }
      );
    }

    const result = normalizeResult(parsed, outputs);
    if (!result) {
      await giveBack();
      return NextResponse.json(
        { error: "L'IA a renvoyé une réponse incomplète. Réessaie." },
        { status: 502 }
      );
    }

    // Le texte du cours vient du serveur (texte/PDF) ou de la transcription de la photo.
    const finalSourceText = sourceText ?? asText(parsed?.sourceText);
    if (finalSourceText) result.sourceText = finalSourceText;

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erreur appel OpenAI:", err?.message || err);
    await giveBack();

    if (err?.message === "TIMEOUT") {
      return NextResponse.json(
        { error: "La génération a pris trop de temps. Réessaie avec un contenu plus court." },
        { status: 504 }
      );
    }

    if (err?.status === 401) {
      return NextResponse.json(
        { error: "Problème de configuration du service. Contacte le support." },
        { status: 500 }
      );
    }

    if (err?.status === 429) {
      return NextResponse.json(
        { error: "Trop de demandes en ce moment. Attends un instant et réessaie." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Une erreur est survenue pendant la génération. Réessaie dans quelques instants." },
      { status: 500 }
    );
  }
}