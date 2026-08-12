import OpenAI from "openai";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { getUsage, incrementUsage, isProUser } from "@/lib/usage";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CHARS = 15000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const TIMEOUT_MS = 30000; // 30 secondes

const DIFFICULTY_TEXT: Record<string, string> = {
  facile: "Utilise un langage très simple, accessible à un débutant, évite tout jargon technique.",
  moyen: "Utilise un niveau standard, adapté à un lycéen ou un étudiant moyen.",
  difficile: "Utilise un niveau avancé, avec un vocabulaire technique précis, adapté à un public expert.",
};

const LENGTH_TEXT: Record<string, string> = {
  court: "Sois très concis : résumé en 2-3 phrases, 3 à 4 points clés maximum, 4 à 5 flashcards, 3 questions de quiz.",
  moyen: "Longueur standard : résumé en un paragraphe, 5 à 7 points clés, 6 à 8 flashcards, 5 questions de quiz.",
  detaille: "Sois complet et détaillé : résumé développé, 8 à 10 points clés, 10 à 12 flashcards, 8 questions de quiz.",
};

const OUTPUT_SCHEMAS: Record<string, string> = {
  summary: `"summary": string`,
  sheet: `"sheet": array de strings (points clés)`,
  flashcards: `"flashcards": array d'objets {question, answer}`,
  quiz: `"quiz": array d'objets {question, options (array de 4 strings), correctIndex}`,
};

function buildSystemPrompt(outputs: string[], difficulty: string, length: string) {
  const schemaLines = outputs
    .filter((o) => OUTPUT_SCHEMAS[o])
    .map((o) => OUTPUT_SCHEMAS[o])
    .join(", ");

  return `Tu es un assistant pédagogique. À partir du contenu fourni, génère un JSON avec exactement ces clés :
"sourceText": string (le texte original que tu as lu ou transcrit, tel quel, sans le reformuler), ${schemaLines}.
${DIFFICULTY_TEXT[difficulty] || DIFFICULTY_TEXT.moyen}
${LENGTH_TEXT[length] || LENGTH_TEXT.moyen}
Ne génère QUE les clés listées ci-dessus. Réponds uniquement en JSON, rien d'autre.`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);
}

export async function POST(req: Request) {
  // --- Authentification ---
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Connecte-toi pour générer une fiche." },
      { status: 401 }
    );
  }

  // --- Vérification du quota (avant tout traitement, pour ne pas gaspiller de ressources) ---
  const pro = await isProUser(user.id);

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

  const SYSTEM_PROMPT = buildSystemPrompt(outputs, difficulty, length);

  let messages: any[];

  try {
    if (mode === "text") {
      const text = formData.get("text") as string;
      if (!text || text.trim().length < 10) {
        return NextResponse.json(
          { error: "Le texte est trop court ou vide. Ajoute plus de contenu." },
          { status: 400 }
        );
      }
      const limitedText = text.slice(0, MAX_CHARS);
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: limitedText },
      ];
    } else if (mode === "pdf") {
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "Aucun fichier PDF reçu." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Le fichier est trop volumineux (10 Mo maximum)." },
          { status: 400 }
        );
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(buffer);
      const { text } = await extractText(pdf, { mergePages: true });
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

      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: limitedText },
      ];
    } else if (mode === "photo") {
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "Aucune photo reçue." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "L'image est trop volumineuse (10 Mo maximum)." },
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
            { type: "text", text: "Lis le contenu de cette image et génère le JSON demandé." },
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

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 2000,
        messages,
      }),
      TIMEOUT_MS
    );

    const rawContent = completion.choices[0].message.content || "{}";

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: "L'IA a renvoyé une réponse invalide. Réessaie." },
        { status: 502 }
      );
    }

    // Comptabilise l'usage seulement après un succès réel (on ne pénalise pas les échecs techniques)
    if (!pro) {
      await incrementUsage(user.id);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erreur appel OpenAI:", err?.message || err);

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