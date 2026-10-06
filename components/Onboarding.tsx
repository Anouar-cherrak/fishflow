"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const KEY = "ff-tuto-v1";
const NEW_ACCOUNT_DAYS = 7;
// Pages où le tutoriel ne doit jamais s'ouvrir tout seul
const QUIET = ["/", "/login", "/signup", "/reset-password", "/cgu", "/mentions-legales", "/confidentialite"];

type Step = { title: string; text: string; art: "doc" | "pack" | "boxes" | "orb" };

const STEPS: Step[] = [
  {
    title: "Colle ton cours, FishFlow fait le reste",
    text: "Un texte, un PDF ou une photo de tes notes. En quelques secondes, ton cours devient clair.",
    art: "doc",
  },
  {
    title: "Tu reçois quatre outils d'un coup",
    text: "Un résumé, une fiche de révision, des flashcards et un quiz. Tu as 3 fiches gratuites par mois.",
    art: "pack",
  },
  {
    title: "Révise un peu chaque jour",
    text: "Dans « Réviser », FishFlow te montre les cartes à revoir aujourd'hui. Les cartes que tu connais reviennent moins souvent.",
    art: "boxes",
  },
  {
    title: "Pose une question, vérifie les sources",
    text: "Dans « Apprendre », tu reçois une réponse courte, des images libres de droits et les liens pour vérifier. Tu as un essai gratuit.",
    art: "orb",
  },
];

function Art({ kind }: { kind: Step["art"] }) {
  if (kind === "doc") {
    return (
      <div className="ff-tuto-art ff-tuto-doc" aria-hidden="true">
        <span /><span /><span /><span />
        <i />
      </div>
    );
  }
  if (kind === "pack") {
    return (
      <div className="ff-tuto-art ff-tuto-pack" aria-hidden="true">
        <b>Résumé</b><b>Fiche</b><b>Flashcards</b><b>Quiz</b>
      </div>
    );
  }
  if (kind === "boxes") {
    return (
      <div className="ff-tuto-art ff-tuto-boxes" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n}>{n}</span>
        ))}
        <i />
      </div>
    );
  }
  return (
    <div className="ff-tuto-art ff-tuto-orb" aria-hidden="true">
      <u />
      <em /><em /><em />
    </div>
  );
}

// Petit tutoriel affiché une seule fois aux comptes récents. On peut le passer, et le revoir dans Paramètres.
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

  // Première visite d'un compte récent
  useEffect(() => {
    if (quiet) return;
    let cancelled = false;
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {}
    if (seen) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled || !data.user?.created_at) return;
        const age = Date.now() - new Date(data.user.created_at).getTime();
        if (age < NEW_ACCOUNT_DAYS * 86400000) start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [start, quiet]);

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
          <button type="button" onClick={close} className="text-sm text-black/60 hover:text-black min-h-[44px] px-2">
            Passer
          </button>
        </div>

        <Art key={current.art} kind={current.art} />

        <h2 id="tuto-title" className="text-2xl font-extrabold tracking-tight leading-tight mb-2">
          {current.title}
        </h2>
        <p className="text-black/65 mb-6">{current.text}</p>

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
                Créer ma première fiche
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
