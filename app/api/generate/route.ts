import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { costUsd, EngineError, makeContext, ficheToText, normalizeFiche, runEngine, transcribeImages, type OutputKey } from "@/lib/fiche-engine";
import { isProUser } from "@/lib/usage";
import { LIMITS } from "@/lib/limits";
import { recordCost, reserveFor } from "@/lib/quota";
import { clientIp, fingerprint, limiter, tooMany } from "@/lib/security/limiter";
import { imageType, isPdf, withTimeout } from "@/lib/security/files";

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
const DIFFICULTIES = new Set(["facile", "moyen", "difficile"]);
const LENGTHS = new Set(["court", "moyen", "detaille"]);
// Garde-fous contre les fichiers piégés ou énormes (la limite d'envoi de Vercel est d'environ 4,5 Mo de toute façon).
const MAX_BODY_BYTES = 4.5 * 1024 * 1024;
const MAX_PDF_PAGES = 80;
const PDF_READ_MS = 20_000;

class PdfRefused extends Error {}

async function extractPdfText(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  // Le vrai contenu doit être un PDF (pas seulement le nom du fichier).
  if (!isPdf(buffer)) throw new PdfRefused("Ce fichier n'est pas un vrai PDF. Choisis un fichier PDF, ou utilise « Photo » pour une image.");
  return withTimeout(
    (async () => {
      const pdf = await getDocumentProxy(buffer);
      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new PdfRefused(`Ce PDF a ${pdf.numPages} pages : ${MAX_PDF_PAGES} au maximum. Garde seulement les pages du chapitre à réviser.`);
      }
      const { text } = await extractText(pdf, { mergePages: true });
      return text;
    })(),
    PDF_READ_MS
  );
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

  // Limite de rythme dès l'arrivée, AVANT de lire les fichiers : un script ne peut pas faire travailler le serveur en boucle.
  const early = await limiter.check([
    { key: `generer:${fingerprint("user", user.id)}`, limit: 8, windowSeconds: 60 },
    { key: `generer:${fingerprint("ip", clientIp(req))}`, limit: 25, windowSeconds: 60 },
  ]);
  if (early) return tooMany(early, "Doucement : trop de demandes en une minute. Attends un petit instant, puis réessaie.");
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Ton envoi est trop lourd (4 Mo au maximum). Envoie moins de fichiers à la fois." }, { status: 413 });
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
      { error: "L'envoi n'a pas marché. Réessaie." },
      { status: 400 }
    );
  }

  const field = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  const mode = field("mode");
  const outputsRaw = field("outputs").slice(0, 100) || "summary,sheet,flashcards,quiz";
  // On ne garde que les sorties connues : une valeur inventée ferait payer une génération vide.
  const outputs = Array.from(new Set(outputsRaw.split(",").filter((o) => OUTPUT_KEYS.has(o)))) as OutputKey[];
  // Seulement des valeurs connues : rien d'inventé n'est recopié dans les consignes de l'IA.
  const difficulty = DIFFICULTIES.has(field("difficulty")) ? field("difficulty") : "moyen";
  const length = LENGTHS.has(field("length")) ? field("length") : "moyen";

  if (outputs.length === 0) {
    return NextResponse.json(
      { error: "Coche au moins une case dans « Ce que tu veux recevoir »." },
      { status: 400 }
    );
  }

  // Régénération des flashcards, du quiz ou de l'essentiel : on repart de la fiche déjà faite.
  let existingFiche = null;
  try {
    const raw = formData.get("fiche");
    if (typeof raw === "string" && raw.length < 80000) existingFiche = normalizeFiche(JSON.parse(raw));
    // Une fiche plus longue que la limite de la formule (gratuit : 15 000 caractères) ne passe pas par la régénération.
    if (existingFiche && ficheToText(existingFiche).length > MAX_CHARS) existingFiche = null;
  } catch {}
  // Refaire seulement les flashcards, le quiz ou l'essentiel d'une fiche existante : peu coûteux, compté à part.
  const cheapRegen = !!existingFiche && !outputs.includes("sheet");

  let sourceText: string | undefined;
  let images: string[] = [];

  try {
    if (mode === "text") {
      const text = field("text");
      if (!text || text.trim().length < 10) {
        return NextResponse.json(
          { error: "Ton cours est trop court. Colle au moins quelques phrases, puis réessaie." },
          { status: 400 }
        );
      }
      // Une régénération repart de la fiche : le cours d'origine (même ancien et long) n'est pas renvoyé à l'IA.
      if (text.length > MAX_CHARS && !cheapRegen) return tooLong(text.length);
      sourceText = text.slice(0, MAX_CHARS);
    } else if (mode === "pdf") {
      const files = formData.getAll("files").filter((f): f is File => f instanceof File);
      const singleFile = formData.get("file");
      const allFiles = files.length > 0 ? files : singleFile instanceof File ? [singleFile] : [];

      if (allFiles.length === 0) {
        return NextResponse.json({ error: "Le PDF n'est pas arrivé. Choisis ton fichier à nouveau, puis réessaie." }, { status: 400 });
      }

      if (allFiles.length > MAX_PDF_FILES) {
        return NextResponse.json({ error: `${MAX_PDF_FILES} PDF au maximum à la fois.` }, { status: 400 });
      }
      if (allFiles.reduce((sum, f) => sum + f.size, 0) > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "Ces PDF sont trop lourds ensemble (4 Mo au maximum). Envoie-en moins à la fois." }, { status: 413 });
      }
      if (allFiles.some((f) => f.type && !/pdf$/i.test(f.type))) {
        return NextResponse.json({ error: "Ce fichier n'est pas un PDF. Choisis un fichier qui finit par .pdf, ou utilise « Photo » pour une image." }, { status: 400 });
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
          // Le nom du fichier est raccourci et nettoyé avant d'être montré à l'IA.
          const name = f.name.replace(/[\r\n]/g, " ").slice(0, 80);
          textParts.push(`--- Document : ${name} ---\n${extracted}`);
        }
      }
      const text = textParts.join("\n\n");

      if (text.trim().length < 20) {
        return NextResponse.json(
          {
            error:
              "Ce PDF ne contient pas de texte lisible (c'est sûrement un document scanné). Prends plutôt les pages en photo avec « Photo ».",
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
        return NextResponse.json({ error: "La photo n'est pas arrivée. Choisis-la à nouveau, puis réessaie." }, { status: 400 });
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

      const buffers = await Promise.all(photos.map(async (f) => new Uint8Array(await f.arrayBuffer())));
      // Le vrai contenu doit être une image (pas un autre fichier renommé en « .jpg »).
      const types = buffers.map(imageType);
      if (types.some((t) => !t)) {
        return NextResponse.json(
          { error: "Ce fichier n'est pas une vraie photo. Utilise une image JPG, PNG ou WebP." },
          { status: 400 }
        );
      }
      images = buffers.map((b, i) => `data:${types[i]};base64,${Buffer.from(b).toString("base64")}`);
    } else {
      return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof PdfRefused) return NextResponse.json({ error: err.message }, { status: 400 });
    if ((err as { code?: string })?.code === "TIMEOUT") {
      return NextResponse.json({ error: "Ce PDF est trop long à lire. Garde seulement les pages du chapitre à réviser, puis réessaie." }, { status: 400 });
    }
    console.error("Erreur lecture/extraction fichier:", (err as Error)?.message || err);
    return NextResponse.json(
      { error: "Ce fichier n'a pas pu être lu. Il est peut-être abîmé : essaie avec un autre fichier." },
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
        { error: "Ta fiche n'a pas pu être terminée. Elle ne t'a pas été décomptée : réessaie." },
        { status: 502 }
      );
    }

    if (err?.code === "TIMEOUT") {
      return NextResponse.json(
        { error: "La création a pris trop de temps. Elle ne t'a pas été décomptée : réessaie, ou coupe ton cours en deux." },
        { status: 504 }
      );
    }

    if (err?.status === 401) {
      return NextResponse.json(
        { error: "Le service a un problème de notre côté. Réessaie plus tard ; si ça dure, écris-nous (adresse dans les mentions légales)." },
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
      { error: "Ta fiche n'a pas pu être créée. Elle ne t'a pas été décomptée : réessaie dans un instant." },
      { status: 500 }
    );
  } finally {
    // Coût réel (même en cas d'échec : l'IA a quand même travaillé), pour le filet de sécurité du mois.
    if (ctx) await recordCost(user.id, costUsd(ctx.usage));
  }
}