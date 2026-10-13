import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { costUsd, EngineError, makeContext, normalizeFiche, runEngine, transcribeImages, type OutputKey } from "@/lib/fiche-engine";
import { isProUser } from "@/lib/usage";
import { LIMITS } from "@/lib/limits";
import { recordCost, reserveFor } from "@/lib/quota";

export const runtime = "nodejs";
// Le moteur fait plusieurs étapes (plan, rédaction, contrôle, cartes) : il lui faut plus d'une minute sur un long cours.
export const maxDuration = 120;

// On rend la main un peu avant la limite de Vercel, pour pouvoir rembourser la fiche en cas d'échec.
const ENGINE_BUDGET_MS = (maxDuration - 10) * 1000;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 Mo — marge de sécurité sous la limite de payload de Vercel (~4.5 Mo)
const MAX_PDF_FILES = 10;
const MAX_PHOTOS = 4;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const OUTPUT_KEYS = new Set<string>(["summary", "sheet", "flashcards", "quiz"]);

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
  const MAX_CHARS = pro ? LIMITS.pro.maxChars : LIMITS.free.maxChars;
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  // Cours trop long : on le dit clairement (jamais de coupure en silence).
  const tooLong = (length: number) =>
    pro
      ? NextResponse.json(
          {
            error: `Ton cours fait ${fmt(length)} caractères, et la limite est de ${fmt(MAX_CHARS)} par fiche (environ 15 pages). Coupe-le en deux, et fais deux fiches.`,
          },
          { status: 413 }
        )
      : NextResponse.json(
          {
            error: `Ton cours fait ${fmt(length)} caractères, et la limite d'un compte gratuit est de ${fmt(MAX_CHARS)} par fiche. Raccourcis-le, ou passe à FishFlow Pro (jusqu'à ${fmt(LIMITS.pro.maxChars)} caractères par fiche).`,
            requiresPro: true,
          },
          { status: 403 }
        );

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
  // On ne garde que les sorties connues : une valeur inventée ferait payer une génération vide.
  const outputs = Array.from(new Set(outputsRaw.split(",").filter((o) => OUTPUT_KEYS.has(o)))) as OutputKey[];
  const difficulty = (formData.get("difficulty") as string) || "moyen";
  const length = (formData.get("length") as string) || "moyen";

  if (outputs.length === 0) {
    return NextResponse.json(
      { error: "Sélectionne au moins une sortie à générer." },
      { status: 400 }
    );
  }

  // Régénération des flashcards, du quiz ou de l'essentiel : on repart de la fiche déjà faite.
  let existingFiche = null;
  try {
    const raw = formData.get("fiche");
    if (typeof raw === "string" && raw.length < 80000) existingFiche = normalizeFiche(JSON.parse(raw));
  } catch {}
  // Refaire seulement les flashcards, le quiz ou l'essentiel d'une fiche existante : peu coûteux, compté à part.
  const cheapRegen = !!existingFiche && !outputs.includes("sheet");

  let sourceText: string | undefined;
  let images: string[] = [];

  try {
    if (mode === "text") {
      const text = formData.get("text") as string;
      if (!text || text.trim().length < 10) {
        return NextResponse.json(
          { error: "Le texte est trop court ou vide. Ajoute plus de contenu." },
          { status: 400 }
        );
      }
      // Une régénération repart de la fiche : le cours d'origine (même ancien et long) n'est pas renvoyé à l'IA.
      if (text.length > MAX_CHARS && !cheapRegen) return tooLong(text.length);
      sourceText = text.slice(0, MAX_CHARS);
    } else if (mode === "pdf") {
      const files = formData.getAll("files") as File[];
      const singleFile = formData.get("file") as File | null;
      const allFiles = files.length > 0 ? files : singleFile ? [singleFile] : [];

      if (allFiles.length === 0) {
        return NextResponse.json({ error: "Aucun fichier PDF reçu." }, { status: 400 });
      }

      if (allFiles.length > MAX_PDF_FILES) {
        return NextResponse.json({ error: `${MAX_PDF_FILES} PDF au maximum à la fois.` }, { status: 400 });
      }
      if (allFiles.some((f) => !(f instanceof File) || (f.type && !/pdf$/i.test(f.type)))) {
        return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés ici." }, { status: 400 });
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

      if (text.trim().length < 20) {
        return NextResponse.json(
          {
            error:
              "Impossible d'extraire du texte de ce PDF. Il s'agit probablement d'un PDF scanné (image), pas d'un PDF avec du vrai texte. Essaie avec un autre fichier.",
          },
          { status: 400 }
        );
      }

      if (text.length > MAX_CHARS) return tooLong(text.length);
      sourceText = text;
    } else if (mode === "photo") {
      // Une ou plusieurs photos (les pages d'un même cours, dans l'ordre).
      const many = formData.getAll("files").filter((f): f is File => f instanceof File);
      const single = formData.get("file");
      const photos = many.length > 0 ? many : single instanceof File ? [single] : [];

      if (photos.length === 0) {
        return NextResponse.json({ error: "Aucune photo reçue." }, { status: 400 });
      }
      if (photos.length > MAX_PHOTOS) {
        return NextResponse.json({ error: `${MAX_PHOTOS} photos au maximum pour une fiche.` }, { status: 400 });
      }
      if (photos.some((f) => !PHOTO_TYPES.has(f.type))) {
        return NextResponse.json(
          { error: "Ce format de photo n'est pas accepté. Utilise une image JPG, PNG ou WebP." },
          { status: 400 }
        );
      }
      if (photos.reduce((sum, f) => sum + f.size, 0) > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: "Ces photos sont trop lourdes ensemble (4 Mo au total). Envoie-en moins à la fois, ou recadre-les." },
          { status: 400 }
        );
      }

      images = await Promise.all(
        photos.map(async (f) => `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`)
      );
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

  // Limites d'usage (lib/limits.ts) : réservées de façon atomique AVANT d'appeler l'IA, rendues si la génération échoue.
  const reservation = await reserveFor(req, user.id, pro, cheapRegen ? "regen" : "fiche");
  if (!reservation.ok) {
    const { ok: _ok, status, scope: _scope, ...body } = reservation;
    void _ok;
    void _scope;
    return NextResponse.json(body, { status });
  }
  const giveBack = reservation.refund;
  let ctx: ReturnType<typeof makeContext> | null = null;

  try {
    const deadline = Date.now() + ENGINE_BUDGET_MS;
    // Une seule partie demandée = le bouton « Régénérer » : on veut un résultat différent.
    ctx = makeContext({ deadline, vary: outputs.length === 1 });
    // Photo : on recopie d'abord le texte du cours, puis on fait comme pour un texte.
    const source = sourceText ?? (await transcribeImages(ctx, images));
    const { result } = await runEngine(ctx, source, {
      outputs,
      difficulty,
      length,
      pro,
      existingFiche: existingFiche ?? undefined,
    });
    result.sourceText = source;
    return NextResponse.json(result);
  } catch (e) {
    const err = e as { message?: string; status?: number; code?: string };
    console.error("Erreur génération:", err?.message || err);
    await giveBack();

    if (e instanceof EngineError && e.message === "Photo illisible") {
      return NextResponse.json(
        { error: "Impossible de lire le cours sur cette photo. Reprends-la bien à plat, nette et éclairée." },
        { status: 422 }
      );
    }

    if (e instanceof EngineError && e.code === "EMPTY") {
      return NextResponse.json(
        { error: "L'IA a renvoyé une réponse incomplète. Réessaie." },
        { status: 502 }
      );
    }

    if (err?.code === "TIMEOUT") {
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
  } finally {
    // Coût réel (même en cas d'échec : l'IA a quand même travaillé), pour le filet de sécurité du mois.
    if (ctx) await recordCost(user.id, costUsd(ctx.usage));
  }
}