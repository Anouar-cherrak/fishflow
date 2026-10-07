"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SceneStage, type Scene } from "@/components/Explainer";
import { APPRENDRE, GENERER, REVISER } from "@/components/tutorials";

const KEY = "ff-tuto-v1";
const LATER_KEY = "ff-tuto-later";
// Pages où le tutoriel ne doit jamais s'ouvrir tout seul
const QUIET = ["/", "/login", "/signup", "/reset-password", "/cgu", "/mentions-legales", "/confidentialite", "/p"];

type Step = { title: string; text: string; scene: Scene };

// Les écrans animés sont les mêmes que dans la page « Aide » : on voit la vraie interface.
const STEPS: Step[] = [
  {
    title: "Colle ton cours, FishFlow fait le reste",
    text: "Un texte, un PDF ou une photo de tes notes. En quelques secondes, ton cours devient clair.",
    scene: GENERER[0],
  },
  {
    title: "Tu reçois quatre outils d'un coup",
    text: "Un résumé, une fiche de révision, des flashcards et un quiz. Tu as 3 fiches gratuites par mois.",
    scene: GENERER[3],
  },
  {
    title: "Révise un peu chaque jour",
    text: "Dans « Réviser » et « Aujourd'hui », tu vois les cartes à revoir. Celles que tu connais reviennent moins souvent.",
    scene: REVISER[2],
  },
  {
    title: "Pose une question, comprends vite",
    text: "Dans « Apprendre », tu reçois une réponse bien expliquée, des images libres de droits et des liens pour aller plus loin. Tu as un essai gratuit.",
    scene: APPRENDRE[2],
  },
];

// Petit tutoriel affiché à la première connexion sur cet appareil. On peut le passer pour de bon,
// le remettre à plus tard (il revient à la prochaine visite) et le revoir à tout moment dans « Aide ».
export function Onboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const quiet = QUIET.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
    returnFocus.current?.focus();
  }, []);

  const start = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setStep(0);
    setOpen(true);
  }, []);

  // Première visite sur cet appareil (sauf si la personne l'a passé, ou remis à plus tard pendant cette visite)
  useEffect(() => {
    if (quiet) return;
    let cancelled = false;
    try {
      if (localStorage.getItem(KEY) === "1") return;
      if (sessionStorage.getItem(LATER_KEY) === "1") return;
    } catch {}
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled || !data.user) return;
        start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [start, quiet]);

  const later = useCallback(() => {
    try {
      sessionStorage.setItem(LATER_KEY, "1");
    } catch {}
    setOpen(false);
    returnFocus.current?.focus();
  }, []);

  // « Revoir le tutoriel » dans Paramètres
  useEffect(() => {
    window.addEventListener("ff-open-tuto", start);
    return () => window.removeEventListener("ff-open-tuto", start);
  }, [start]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = document.querySelectorAll<HTMLElement>("[data-tuto] button");
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open || quiet || typeof document === "undefined") return null;

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return createPortal(
    <div className="ff-tuto-back ff-fade" data-tuto>
      <div role="dialog" aria-modal="true" aria-labelledby="tuto-title" className="ff-tuto ff-fade-up">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-black/55" aria-live="polite">
            Étape {step + 1} sur {STEPS.length}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={later} className="text-sm text-black/60 hover:text-black min-h-[44px] px-3">
              Plus tard
            </button>
            <button type="button" onClick={close} className="text-sm text-black/60 hover:text-black min-h-[44px] px-3">
              Passer le tuto
            </button>
          </div>
        </div>

        <div className="mb-5"><SceneStage scene={current.scene} sceneKey={step} /></div>

        <h2 id="tuto-title" className="text-2xl font-extrabold tracking-tight leading-tight mb-2">
          {current.title}
        </h2>
        <p className="text-black/65 mb-6">{current.text}</p>
        {last && (
          <p className="text-sm text-black/60 mb-5">
            Tu retrouveras de petites animations pour chaque fonction dans{" "}
            <button
              type="button"
              onClick={() => {
                close();
                router.push("/aide");
              }}
              className="underline text-black font-semibold"
            >
              Aide
            </button>
            .
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className="ff-tuto-dot" data-on={i === step ? "true" : "false"} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="ff-secondary">
                Retour
              </button>
            )}
            {last ? (
              <button
                ref={nextRef}
                type="button"
                onClick={() => {
                  close();
                  router.push("/generer");
                }}
                className="ff-primary ff-btn"
              >
                Ma première fiche
              </button>
            ) : (
              <button ref={nextRef} type="button" onClick={() => setStep(step + 1)} className="ff-primary ff-btn">
                Suivant
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
