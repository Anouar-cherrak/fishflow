import OpenAI from "openai";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsage, incrementUsage, isProUser } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CHARS_FREE = 15000;
const MAX_CHARS_PRO = 60000;
const TIMEOUT_MS = 50000;

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

function buildSystemPrompt(outputs: string[], difficulty: string, length: string) {
  const schemaLines = outputs
    .filter((o) => OUTPUT_SCHEMAS[o])
    .map((o) => OUTPUT_SCHEMAS[o])
    .join(", ");

  return `Tu es un excellent assistant pédagogique, spécialisé dans la création de fiches de révision de haute qualité pour des étudiants.

Le contenu que tu reçois peut provenir de sources variées : texte brut, PDF de cours (parfois volumineux, plusieurs dizaines de pages), PDF scanné, ou une photo de notes manuscrites ou de tableau.

Ta mission : identifie les concepts réellement importants — pas juste ce qui est écrit en gros, mais ce qui structure le cours (définitions, mécanismes, exemples clés, relations de cause à effet, chiffres et dates importants). Ignore le bruit (numéros de page, en-têtes/pieds de page répétitifs, mentions de copyright, éléments purement décoratifs). Si le document est long, synthétise l'ensemble plutôt que de te concentrer uniquement sur le début.

À partir de ce contenu, génère un JSON avec exactement ces clés :
"sourceText": string (le texte original que tu as lu ou transcrit, tel quel, sans le reformuler), ${schemaLines}.

Règles strictes de qualité :
- N'invente jamais un fait, un chiffre ou une définition qui n'apparaît pas dans le contenu fourni.
- Priorise la clarté et l'utilité pour la révision plutôt que l'exhaustivité : mieux vaut peu de points clés vraiment importants que beaucoup de détails secondaires.
- Reste direct, sans tournures compliquées inutiles.
- ${DIFFICULTY_TEXT[difficulty] || DIFFICULTY_TEXT.moyen}
- ${LENGTH_TEXT[length] || LENGTH_TEXT.moyen}
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Impossible de lire les données envoyées. Réessaie." },
      { status: 400 }
    );
  }

  const { mode, storagePath } = body;
  const outputsRaw = body.outputs || "summary,sheet,flashcards,quiz";
  const outputs = String(outputsRaw).split(",").filter(Boolean);
  const difficulty = body.difficulty || "moyen";
  const length = body.length || "moyen";

  if (outputs.length === 0) {
    return NextResponse.json(
      { error: "Sélectionne au moins une sortie à générer." },
      { status: 400 }
    );
  }

  const SYSTEM_PROMPT = buildSystemPrompt(outputs, difficulty, length);
  const admin = createAdminClient();
  let messages: any[];
  let wasTruncated = false;

  try {
    if (mode === "text") {
      const text = body.text as string;
      if (!text || text.trim().length < 10) {
        return NextResponse.json(
          { error: "Le texte est trop court ou vide. Ajoute plus de contenu." },
          { status: 400 }
        );
      }
      const limitedText = text.slice(0, MAX_CHARS);
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contenu du cours :\n"""\n${limitedText}\n"""` },
      ];
    } else if (mode === "pdf") {
      if (!storagePath) {
        return NextResponse.json({ error: "Aucun fichier PDF reçu." }, { status: 400 });
      }

      const { data: fileBlob, error: downloadError } = await admin.storage
        .from("cours-uploads")
        .download(storagePath);

      if (downloadError || !fileBlob) {
        return NextResponse.json(
          {
            error: "Impossible de récupérer le fichier envoyé. Réessaie.",
            debug: {
              storagePath,
              downloadError: downloadError ? JSON.stringify(downloadError) : null,
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            },
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const pdf = await getDocumentProxy(buffer);
      const { text } = await extractText(pdf, { mergePages: true });
      wasTruncated = text.length > MAX_CHARS;
      const limitedText = text.slice(0, MAX_CHARS);

      await admin.storage.from("cours-uploads").remove([storagePath]);

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
              "Ce PDF est trop volumineux pour un compte gratuit. Passe à FishFlow Pro pour analyser des documents de plus de 60 pages.",
            requiresPro: true,
          },
          { status: 403 }
        );
      }

      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contenu du cours (extrait d'un PDF) :\n"""\n${limitedText}\n"""` },
      ];
    } else if (mode === "photo") {
      if (!storagePath) {
        return NextResponse.json({ error: "Aucune photo reçue." }, { status: 400 });
      }

      const { data: fileBlob, error: downloadError } = await admin.storage
        .from("cours-uploads")
        .download(storagePath);

      if (downloadError || !fileBlob) {
        return NextResponse.json(
          {
            error: "Impossible de récupérer le fichier envoyé. Réessaie.",
            debug: {
              storagePath,
              downloadError: downloadError ? JSON.stringify(downloadError) : null,
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            },
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const mimeType = fileBlob.type || "image/jpeg";

      await admin.storage.from("cours-uploads").remove([storagePath]);

      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Lis le contenu de cette image (le cours) et génère le JSON demandé." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ];
    } else {
      return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
    }
  } catch (err) {
    console.error("Erreur lecture/extraction fichier:", err);
    if (storagePath) {
      await admin.storage.from("cours-uploads").remove([storagePath]).catch(() => {});
    }
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