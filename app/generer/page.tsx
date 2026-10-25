"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { InstallPWA } from "@/components/InstallPWA";
import { UpgradeModal } from "@/components/UpgradeModal";
import { trackEvent } from "@/lib/tracking";
import { track } from "@/lib/track";
import type { User } from "@supabase/supabase-js";
import { LIMITS } from "@/lib/limits";
import { FicheLoader, LOADER_STEPS } from "@/components/FicheLoader";
import { burstBubbles } from "@/lib/bubbles";

type Mode = "text" | "pdf" | "photo";
type OutputKey = "summary" | "sheet" | "flashcards" | "quiz";
type Difficulty = "facile" | "moyen" | "difficile";
type Length = "court" | "moyen" | "detaille";

type UsageInfo = {
  isPro: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  fichesLeftMonth?: number;
  fichesLeftDay?: number | null;
  resetMonth?: string;
};

const OUTPUT_OPTIONS: { key: OutputKey; label: string }[] = [
  { key: "summary", label: "L'essentiel" },
  { key: "sheet", label: "Fiche de révision" },
  { key: "flashcards", label: "Flashcards" },
  { key: "quiz", label: "Quiz" },
];

// Moment (en secondes) où chaque étape commence, d'après les durées habituelles du moteur (20 à 60 s).
// La dernière étape reste affichée jusqu'à la vraie réponse : la barre ne dit jamais « fini » trop tôt.
const STEP_AT = [0, 5, 14, 30];

const FREE_FICHES_LIMIT = LIMITS.free.historyMax;
const MAX_PHOTO_SIDE = 2000;
const MAX_PHOTOS = 4;

// Les photos de téléphone dépassent souvent 4 Mo : on les réduit avant l'envoi (plus rapide, et plus de refus).
// Si le navigateur ne sait pas lire l'image, on envoie l'originale.
async function shrinkPhoto(file: File, maxSide = MAX_PHOTO_SIDE): Promise<File> {
  if (maxSide === MAX_PHOTO_SIDE && file.size < 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Petit aperçu d'une photo choisie (l'adresse temporaire est libérée quand l'aperçu disparaît).
function PhotoThumb({ file, alt }: { file: File; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    queueMicrotask(() => setUrl(u));
    return () => URL.revokeObjectURL(u);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} className="w-full h-full object-cover" /> : null;
}

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImage = (f: File) => f.type.startsWith("image/");

function GenererContent() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [outputs, setOutputs] = useState<OutputKey[]>(["summary", "sheet", "flashcards", "quiz"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");
  const [length, setLength] = useState<Length>("moyen");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Erreur pendant la création : l'écran de chargement reste ouvert et propose de réessayer.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; message: string; manage?: boolean } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
      if (data.user) {
        // Réponse d'erreur (serveur indisponible…) : on n'affiche pas de compteur plutôt qu'un « undefined ».
        fetch("/api/usage").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && typeof d.isPro === "boolean") setUsage(d); }).catch(() => {});
      }
    });
  }, []);

  // Un texte envoyé depuis Apprendre (« En faire une fiche de révision »)
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("ff-prefill");
      if (prefill) {
        sessionStorage.removeItem("ff-prefill");
        queueMicrotask(() => setText(prefill.slice(0, 20000)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const alreadyTracked = sessionStorage.getItem("ff_achat_tracked") === "1";
      if (!alreadyTracked) {
        trackEvent("achat_premium", { value: 4.99, currency: "EUR" });
        sessionStorage.setItem("ff_achat_tracked", "1");
      }
      router.replace("/generer");
    }
  }, [searchParams, router]);

  useEffect(() => {
    // Les compteurs repartent de zéro au lancement (handleGenerate).
    if (!loading || loadError) return;
    const started = Date.now();
    const tick = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      setElapsed(Math.round(s));
      const step = STEP_AT.filter((at) => s >= at).length - 1;
      setLoadingStep((prev) => (prev >= LOADER_STEPS.length ? prev : step));
      // Chaque étape remplit son quart de barre ; la dernière ralentit et s'arrête à 92 % jusqu'à la réponse.
      const next = STEP_AT[step + 1] ?? STEP_AT[step] + 40;
      const within = Math.min(1, (s - STEP_AT[step]) / (next - STEP_AT[step]));
      setProgress((prev) => (prev >= 100 ? prev : Math.min(92, Math.max(prev, (step + within * (step === 3 ? 0.68 : 1)) * 25))));
    }, 250);
    return () => clearInterval(tick);
  }, [loading, loadError]);

  const toggleOutput = (key: OutputKey) => {
    setOutputs((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const handleGenerate = async () => {
    if (!user) {
      // Le cours déjà collé est gardé pendant l'inscription : il revient tout seul dans la zone de texte.
      try {
        if (mode === "text" && text.trim()) sessionStorage.setItem("ff-prefill", text.slice(0, 20000));
      } catch {}
      router.push("/signup");
      return;
    }

    // Pas de connexion internet : on le dit tout de suite, au lieu d'attendre sans rien afficher.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("Tu n'es pas connecté à internet. Vérifie ton wifi ou tes données mobiles, puis réessaie.");
      return;
    }

    const supabase = createClient();

    if (usage && !usage.isPro) {
      const { count } = await supabase.from("fiches").select("*", { count: "exact", head: true });
      if ((count ?? 0) >= FREE_FICHES_LIMIT) {
        trackEvent("historique_plein", { mode });
        setUpgradeModal({
          title: "Ton historique est plein",
          message: `Un compte gratuit garde ${FREE_FICHES_LIMIT} fiches au maximum. Supprime une ancienne fiche dans « Mes fiches », ou passe Pro pour toutes les garder.`,
          manage: true,
        });
        return;
      }
    }

    setError(null);
    setLoadError(null);
    setLoadingStep(0);
    setProgress(0);
    setElapsed(0);
    setLoading(true);
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("outputs", outputs.join(","));
    formData.append("difficulty", difficulty);
    formData.append("length", length);

    if (mode === "text") {
      formData.append("text", text);
    } else if (mode === "pdf" && usage?.isPro && files.length > 0) {
      files.forEach((f) => formData.append("files", f));
    } else if (mode === "photo") {
      // Plusieurs pages : chaque photo est un peu plus réduite, pour que l'envoi reste léger.
      const side = files.length > 1 ? 1600 : MAX_PHOTO_SIDE;
      const ready = await Promise.all(files.map((f) => shrinkPhoto(f, side)));
      ready.forEach((f) => formData.append("files", f));
    } else if (file) {
      formData.append("file", file);
    }

    // Fiche déjà créée (et décomptée) par le serveur : un souci réseau APRÈS ce moment ne doit jamais proposer « Réessayer ».
    let generated: Record<string, unknown> | null = null;
    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      // Une réponse qui n'est pas du JSON (délai dépassé chez l'hébergeur, panne) : on l'explique simplement.
      const data = await res.json().catch(() => ({
        error: "La création de ta fiche a pris trop de temps ou a échoué. Réessaie, ou coupe ton cours en deux s'il est long.",
      }));

      if (!res.ok) {
        setLoading(false);
        if (data.quotaExceeded) {
          trackEvent("quota_atteint", { mode });
          setUpgradeModal({
            title: "Limite gratuite atteinte",
            message: data.error || "Tu as utilisé tes fiches gratuites de ce mois-ci. Avec Pro, tu peux en créer jusqu'à 100 par mois.",
          });
        } else if (data.requiresPro) {
          trackEvent("pdf_trop_volumineux", { mode });
          setUpgradeModal({
            title: /caractères/.test(data.error ?? "") ? "Ton cours est trop long" : "Réservé à Pro",
            message: data.error,
          });
        } else {
          trackEvent("generation_echouee", { mode, reason: data.error || "erreur" });
          setLoading(true);
          setLoadError(data.error || "Réessaie dans un instant.");
        }
        // Réponse d'erreur (serveur indisponible…) : on n'affiche pas de compteur plutôt qu'un « undefined ».
        fetch("/api/usage").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && typeof d.isPro === "boolean") setUsage(d); }).catch(() => {});
        return;
      }

      generated = data;
      const title = data.title || data.summary?.slice(0, 40) || data.sheet?.[0]?.slice(0, 40) || "Fiche sans titre";
      const { data: inserted, error: insertError } = await supabase.from("fiches").insert({ title, data }).select().single();

      // La base refuse une 6e fiche gratuite : on l'explique au lieu de faire comme si tout allait bien.
      if (insertError && String(insertError.message).includes("FREE_LIMIT")) {
        setLoading(false);
        setUpgradeModal({
          title: "Ton historique est plein",
          message: `Un compte gratuit garde ${FREE_FICHES_LIMIT} fiches au maximum. Supprime une ancienne fiche dans « Mes fiches », ou passe Pro pour toutes les garder.`,
          manage: true,
        });
        return;
      }

      // Première fiche de la personne : on compte l'étape (mesure du parcours).
      if (inserted?.id) {
        const { count: mine } = await supabase.from("fiches").select("*", { count: "exact", head: true });
        if (mine === 1) track("first_fiche");
      }

      const dataWithId = { ...data, id: inserted?.id };
      localStorage.setItem("fishflow_result", JSON.stringify(dataWithId));
      localStorage.setItem("fishflow_settings", JSON.stringify({ difficulty, length }));

      trackEvent("generation_reussie", { mode, outputs: outputs.join(",") });

      const updatedUsage = await fetch("/api/usage").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (updatedUsage && typeof updatedUsage.isPro === "boolean") setUsage(updatedUsage);
      if (updatedUsage && !updatedUsage.isPro) {
        trackEvent("quota_utilise", { remaining: updatedUsage.remaining });
      }

      setProgress(100);
      setLoadingStep(LOADER_STEPS.length);
      // Fiche prête : une gerbe de bulles remonte pendant qu'on l'ouvre.
      burstBubbles();
      // Une fiche enregistrée a sa propre adresse ; sinon on garde la page de secours.
      const destination = inserted?.id ? `/fiche/${inserted.id}?nouvelle=1` : "/result";
      setTimeout(() => router.push(destination), 450);
    } catch {
      if (generated) {
        // La fiche existe déjà : on l'ouvre (page de secours) au lieu d'en refaire une.
        try {
          localStorage.setItem("fishflow_result", JSON.stringify(generated));
        } catch {}
        router.push("/result");
        return;
      }
      trackEvent("generation_echouee", { mode, reason: "erreur_reseau" });
      setLoadError("La connexion a été coupée. Vérifie ton internet, puis réessaie.");
    }
  };

  const isMultiPdfPro = mode === "pdf" && usage?.isPro;

  const canGenerate =
    !loading &&
    (mode === "text" ? !!text : mode === "photo" || isMultiPdfPro ? files.length > 0 : !!file) &&
    outputs.length > 0 &&
    !(!!user && !!usage && !usage.isPro && usage.remaining === 0) &&
    !(!!usage?.isPro && (usage.fichesLeftMonth === 0 || usage.fichesLeftDay === 0));

  // Ce qu'il reste, affiché discrètement sous le bouton (les limites sont vérifiées par le serveur).
  const proLeftText = (() => {
    if (!usage?.isPro || typeof usage.fichesLeftMonth !== "number") return "";
    const month = usage.fichesLeftMonth;
    const day = usage.fichesLeftDay ?? month;
    if (month === 0) return `Tu as atteint la limite de ce mois-ci. Elle se remet à zéro ${usage.resetMonth ?? "le mois prochain"}.`;
    if (day === 0) return "Tu as atteint la limite du jour. Elle se remet à zéro à minuit.";
    const base = `Il te reste ${month} fiche${month > 1 ? "s" : ""} ce mois-ci`;
    return day < month ? `${base}, dont ${day} aujourd'hui.` : `${base}.`;
  })();

  // Photos ajoutées une par une (appareil photo du téléphone) ou plusieurs d'un coup, 4 au maximum.
  const addPhotos = (list: File[]) => {
    const images = list.filter(isImage);
    if (images.length === 0) return;
    setError(null);
    setFiles((prev) => {
      const next = [...prev, ...images];
      if (next.length > MAX_PHOTOS) setError(`${MAX_PHOTOS} photos au maximum pour une fiche.`);
      return next.slice(0, MAX_PHOTOS);
    });
  };

  // Glisser-déposer un fichier sur la zone (ordinateur).
  const dropProps = (accept: (f: File) => boolean, multiple: boolean) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const got = Array.from(e.dataTransfer.files).filter(accept);
      if (got.length === 0) return setError(mode === "photo" ? "Ce fichier n'est pas une photo. Choisis une image JPG ou PNG." : "Ce fichier n'est pas un PDF. Choisis un fichier qui finit par .pdf, ou utilise « Photo » pour une image.");
      setError(null);
      if (mode === "photo") addPhotos(got);
      else if (multiple) setFiles(got);
      else setFile(got[0]);
    },
  });

  const dropClass =
    (dragging ? "border-accent bg-surface " : "") +
    "w-full min-h-[220px] lg:min-h-[320px] p-8 border border-dashed border-black/25 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent hover:bg-surface transition";

  return (
    <AppShell size="wide">
      {loading && (
        <FicheLoader
          step={loadingStep}
          progress={progress}
          elapsed={elapsed}
          error={loadError}
          onRetry={handleGenerate}
          onBack={() => {
            setLoading(false);
            setLoadError(null);
          }}
        />
      )}

      {upgradeModal && (
        <UpgradeModal
          title={upgradeModal.title}
          message={upgradeModal.message}
          onClose={() => setUpgradeModal(null)}
          onUpgrade={() => {
            trackEvent("clic_modal_upgrade");
            router.push("/pricing");
          }}
          secondaryLabel={upgradeModal.manage ? "Gérer mes fiches" : undefined}
          onSecondary={upgradeModal.manage ? () => router.push("/mes-fiches") : undefined}
        />
      )}

      <div className="mb-8 ff-fade-up">
        <h1 className="ff-title mb-3">Crée ta fiche de révision.</h1>
        <p className="ff-lead">
          Donne ton cours (texte, PDF ou photo)<span className="max-sm:hidden">, puis appuie sur « Créer ma fiche »</span>. Tu reçois une fiche, l&apos;essentiel, des flashcards et un quiz.
        </p>
      </div>

      {/* Ce qu'il reste, visible tout de suite (sans défiler), avec un lien vers ce que Pro change. */}
      {user && usage && (
        <p className="mb-5 -mt-4 text-sm text-black/70 ff-fade-up" aria-live="polite">
          {usage.isPro
            ? proLeftText
            : usage.remaining === 0
              ? "Tu as utilisé tes fiches gratuites de ce mois-ci."
              : `Il te reste ${usage.remaining} fiche${(usage.remaining ?? 0) > 1 ? "s" : ""} gratuite${(usage.remaining ?? 0) > 1 ? "s" : ""} ce mois-ci.`}{" "}
          {!usage.isPro && (
            <a href="/pricing" className="underline font-semibold whitespace-nowrap">
              Ce que Pro change
            </a>
          )}
        </p>
      )}

      <div className="ff-fade-up" style={{ animationDelay: "0.05s" }}>
        <InstallPWA />
      </div>

      {!user && !checkingAuth && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-surface text-black/80 ff-fade-up">
          Pour créer une fiche, il te faut un compte gratuit (3 fiches par mois, sans carte bancaire).{" "}
          <a href="/signup" className="underline font-semibold">Créer mon compte</a> ou{" "}
          <a href="/login" className="underline font-semibold">me connecter</a>.
        </div>
      )}

      <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* Colonne de gauche : le cours */}
        <section aria-label="Ton cours" className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-7 ff-fade-up" style={{ animationDelay: "0.1s" }}>
          <p className="text-sm font-semibold text-black/70 mb-2" id="source-label">D&apos;où vient ton cours ?</p>
          <div className="flex gap-1 mb-5 bg-white border border-black/10 rounded-full p-1" role="group" aria-labelledby="source-label">
            {(["text", "pdf", "photo"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => { setMode(m); setFile(null); setFiles([]); setError(null); }}
                className={`flex-1 min-h-[44px] px-3 rounded-full font-semibold text-sm transition ${
                  mode === m ? "bg-black text-white" : "text-black/55 hover:text-black"
                }`}
              >
                {m === "text" ? "Texte" : m === "pdf" ? "PDF" : "Photo"}
              </button>
            ))}
          </div>

          {mode === "text" && (
            <>
              <label htmlFor="cours" className="sr-only">Ton cours</label>
              <textarea
                id="cours"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Colle ici ton cours, un article ou tes notes (quelques phrases au minimum)…"
                className="w-full h-32 sm:h-64 lg:h-[22rem] p-4 border border-black/15 rounded-2xl text-black placeholder-black/35 bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-base ff-input resize-y"
              />
            </>
          )}

          {mode === "pdf" && isMultiPdfPro && (
            <div>
              <label className={dropClass} {...dropProps(isPdf, true)}>
                <span className="text-black font-semibold mb-1">
                  {files.length > 0 ? `${files.length} fichier${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}` : "Choisir un ou plusieurs PDF"}
                </span>
                <span className="text-black/60 text-sm">Avec Pro, tu peux mettre plusieurs PDF dans une seule fiche.</span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                  className="sr-only"
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="text-sm text-black/60 flex items-center justify-between px-1">
                      <span className="truncate">{f.name}</span>
                      <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-black/40 hover:text-black shrink-0 ml-2 w-8 h-8">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {mode === "pdf" && !isMultiPdfPro && (
            <label className={dropClass} {...dropProps(isPdf, false)}>
              <span className="text-black font-semibold mb-1">{file ? file.name : "Choisir un PDF"}</span>
              <span className="text-black/50 text-sm">{file ? "Fichier sélectionné ✓" : <><span className="ff-desk-only">ou glisse-dépose ton fichier ici</span><span className="ff-mobile-only">Touche ici pour choisir</span></>}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  // Mauvais fichier : on le dit tout de suite, avant d'envoyer quoi que ce soit.
                  if (f && !isPdf(f)) {
                    setFile(null);
                    setError("Ce fichier n'est pas un PDF. Choisis un fichier qui finit par .pdf, ou utilise « Photo » pour une image.");
                    e.target.value = "";
                    return;
                  }
                  setError(null);
                  setFile(f);
                }}
                className="sr-only"
              />
            </label>
          )}

          {mode === "photo" && (
            <div>
              {files.length < MAX_PHOTOS && (
                <label className={files.length > 0 ? dropClass.replace("min-h-[220px] lg:min-h-[320px]", "min-h-[120px]") : dropClass} {...dropProps(isImage, true)}>
                  <span className="text-black font-semibold mb-1">
                    {files.length === 0 ? "Choisir une photo" : "Ajouter une page"}
                  </span>
                  <span className="text-black/50 text-sm">
                    {files.length === 0 ? (
                      <>
                        <span className="ff-desk-only">ou glisse-dépose tes photos ici. </span>
                        <span className="ff-mobile-only">Touche ici pour prendre ou choisir une photo. </span>
                        Un cours de plusieurs pages ? Ajoute jusqu'à {MAX_PHOTOS} photos.
                      </>
                    ) : (
                      `${files.length} / ${MAX_PHOTOS} photos`
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      addPhotos(e.target.files ? Array.from(e.target.files) : []);
                      e.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              )}
              {files.length > 0 && (
                <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Photos choisies">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-black/15 bg-white">
                      <PhotoThumb file={f} alt={`Page ${i + 1}`} />
                      <span className="absolute left-1 top-1 text-xs font-bold px-1.5 rounded-full bg-[#000000]/70 text-[#ffffff]">{i + 1}</span>
                      <button
                        type="button"
                        aria-label={`Retirer la page ${i + 1}`}
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-0 top-0 w-9 h-9 flex items-center justify-center text-[#ffffff] text-sm"
                      >
                        <span className="w-6 h-6 rounded-full bg-[#000000]/70 flex items-center justify-center" aria-hidden="true">✕</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Colonne de droite : ce que tu veux recevoir */}
        <div className="grid gap-6 ff-fade-up" style={{ animationDelay: "0.15s" }}>
          {/* Réglages : repliés (une ligne résume les choix), ouverts d'un clic ; rien ne bouge à l'affichage. */}
          <details className="ff-settings">
            <summary>
              <span>Réglages</span>
              <span className="ff-settings-sum">
                {{ facile: "Facile", moyen: "Moyen", difficile: "Difficile" }[difficulty]} · {{ court: "Court", moyen: "Moyen", detaille: "Détaillé" }[length]} · {outputs.length === OUTPUT_OPTIONS.length ? "tout" : `${outputs.length} sur ${OUTPUT_OPTIONS.length}`}
              </span>
            </summary>
          <section aria-label="Options" className="grid gap-6 pt-4">
            <div className="grid grid-cols-2 gap-4" role="group" aria-label="Réglages de la fiche">
              <div>
                <label htmlFor="niveau" className="text-sm font-semibold text-black/60 block mb-2">Niveau</label>
                <select
                  id="niveau"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full min-h-[48px] px-3 border border-black/15 rounded-2xl bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent ff-input"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
                <p className="text-xs text-black/60 mt-1.5">Des mots simples, ou plus techniques.</p>
              </div>
              <div>
                <label htmlFor="longueur" className="text-sm font-semibold text-black/60 block mb-2">Longueur</label>
                <select
                  id="longueur"
                  value={length}
                  onChange={(e) => setLength(e.target.value as Length)}
                  className="w-full min-h-[48px] px-3 border border-black/15 rounded-2xl bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent ff-input"
                >
                  <option value="court">Court</option>
                  <option value="moyen">Moyen</option>
                  <option value="detaille">Détaillé</option>
                </select>
                <p className="text-xs text-black/60 mt-1.5">Court : le principal. Détaillé : plus de cartes.</p>
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-black/60 mb-3">Ce que tu veux recevoir (coche au moins une case)</legend>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 min-h-[48px] px-4 rounded-2xl border cursor-pointer text-sm font-medium transition ${
                      outputs.includes(opt.key) ? "bg-surface border-accent text-black" : "bg-white border-black/15 text-black/55 hover:border-black/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={outputs.includes(opt.key)}
                      onChange={() => toggleOutput(opt.key)}
                      className="accent-[var(--ff-accent)] w-4 h-4"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

          </section>
          </details>

          {error && (
            <p role="alert" className="px-4 py-3 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 text-sm text-black">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="ff-primary w-full text-base ff-btn"
          >
            {loading ? "Création en cours…" : !user ? "Créer mon compte pour continuer" : "Créer ma fiche"}
          </button>
          {!loading && user && !canGenerate && (mode === "text" ? !text : files.length === 0 && !file) && (
            <p className="text-sm text-black/60 text-center -mt-3">
              {mode === "text" ? "Colle d'abord ton cours dans la zone de texte." : mode === "pdf" ? "Choisis d'abord ton fichier PDF." : "Ajoute d'abord une photo de ton cours."}
            </p>
          )}

          {proLeftText && <p className="text-xs text-black/50 text-center -mt-2">{proLeftText}</p>}

          {user && usage && !usage.isPro && (
            <section aria-label="Ton offre" className="bg-surface border border-black/10 rounded-3xl overflow-hidden">
              <p className={`px-5 py-3 text-sm font-semibold ${usage.remaining === 0 ? "text-accent" : "text-black/80"}`}>
                {usage.remaining === 0
                  ? `Tu as utilisé tes ${LIMITS.free.fichesPerMonth} fiches gratuites de ce mois-ci. Elles reviennent ${usage.resetMonth ?? "le mois prochain"}.`
                  : `Il te reste ${usage.remaining} fiche${usage.remaining! > 1 ? "s" : ""} gratuite${usage.remaining! > 1 ? "s" : ""} ce mois-ci.`}
              </p>
              <div className="px-5 pb-5 grid grid-cols-2 gap-4 border-t border-black/10 pt-4">
                <div>
                  <p className="text-xs font-semibold text-black/50 mb-2">Gratuit</p>
                  <p className="text-sm text-black/65">{LIMITS.free.fichesPerMonth} fiches par mois</p>
                  <p className="text-sm text-black/65">Cours jusqu'à 7 pages</p>
                  <p className="text-sm text-black/65">5 fiches gardées</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-accent mb-2">Pro</p>
                  <p className="text-sm font-medium">{LIMITS.pro.fichesPerMonth} fiches par mois</p>
                  <p className="text-sm font-medium">Cours jusqu'à 15 pages</p>
                  <p className="text-sm font-medium">Plusieurs PDF dans une fiche</p>
                  <p className="text-sm font-medium">Quiz de 12 questions et lecture à voix haute</p>
                  <p className="text-sm font-medium">Toutes tes fiches gardées</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button type="button" onClick={() => router.push("/pricing")} className="ff-secondary w-full text-sm">
                  Voir Pro, 4,99 € par mois
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function Generer() {
  return (
    <Suspense fallback={null}>
      <GenererContent />
    </Suspense>
  );
}