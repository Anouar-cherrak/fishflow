"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { RAIE_PATH, RAIE_VIEWBOX } from "@/lib/raie-path";

// Écran pendant la création d'une fiche : on plonge. La raie nage, les étapes se cochent,
// la barre avance avec les étapes (sans jamais dire « fini » avant la fin), et la fiche se dessine en squelette.
// Cas « c'est long » et « erreur » : message clair et bouton pour réessayer. Rien ne bouge avec prefers-reduced-motion.

export const LOADER_STEPS = ["Je lis ton cours…", "Je repère les idées clés…", "Je construis ta fiche…", "Je prépare les flashcards et le quiz…"];

type Props = {
  step: number; // étape en cours (0 à 3), 4 = terminé
  progress: number; // 0 à 100
  elapsed: number; // secondes
  error?: string | null;
  onRetry: () => void;
  onBack: () => void;
};

export function FicheLoader({ step, progress, elapsed, error, onRetry, onBack }: Props) {
  const done = step >= LOADER_STEPS.length;
  const slow = !error && !done && elapsed >= 45;
  const verySlow = !error && !done && elapsed >= 90;
  const box = useRef<HTMLDivElement>(null);

  // Vraie fenêtre : tout le reste de la page devient inaccessible (clavier, lecteur d'écran) tant qu'elle est ouverte.
  useEffect(() => {
    const others = Array.from(document.body.children).filter((el) => el !== box.current && !el.hasAttribute("inert"));
    others.forEach((el) => el.setAttribute("inert", ""));
    box.current?.focus();
    return () => others.forEach((el) => el.removeAttribute("inert"));
  }, []);

  // Rendu directement dans <body> : la page qui apparaît en glissant (transform) piégerait sinon cet écran
  // dans son propre cadre, sous la barre du haut et les onglets.
  return createPortal(
    <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Création de ta fiche" className="ff-loader outline-none" data-state={error ? "error" : done ? "done" : "work"} aria-busy={!error && !done}>
      <div className="ff-loader-in">
        <div className="ff-loader-swim" aria-hidden="true">
          <svg viewBox={RAIE_VIEWBOX} className="ff-loader-raie">
            <defs>
              <linearGradient id="ff-loader-g" x1="0" y1="0" x2=".6" y2="1">
                <stop offset="0" stopColor="#8FD8FF" />
                <stop offset=".55" stopColor="#2AA9E8" />
                <stop offset="1" stopColor="#0B74C2" />
              </linearGradient>
            </defs>
            <path fill="url(#ff-loader-g)" fillRule="evenodd" d={RAIE_PATH} />
          </svg>
          <i /><i /><i /><i />
        </div>

        {error ? (
          <div className="ff-loader-msg" role="alert">
            <h2>Ta fiche n&apos;a pas pu être créée.</h2>
            <p>{error}</p>
            <div className="ff-loader-actions">
              <button type="button" className="ff-primary ff-btn" onClick={onRetry} autoFocus>Réessayer</button>
              <button type="button" className="ff-secondary" onClick={onBack}>Modifier mon cours</button>
            </div>
          </div>
        ) : (
          <>
            {/* Une seule phrase lue par les lecteurs d'écran : l'étape en cours. */}
            <p className="sr-only" role="status" aria-live="polite">
              {done ? "Ta fiche est prête." : LOADER_STEPS[step]}
            </p>
            <ol className="ff-loader-steps" aria-hidden="true">
              {LOADER_STEPS.map((s, i) => (
                <li key={s} data-state={i < step ? "done" : i === step ? "now" : "todo"}>
                  <span className="ff-loader-dot">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                    </svg>
                  </span>
                  {s}
                </li>
              ))}
            </ol>

            <div className="ff-loader-bar" aria-hidden="true">
              <i style={{ transform: `scaleX(${Math.max(0.03, progress / 100)})` }} />
            </div>
            <p className="ff-loader-note">
              {done
                ? "Ta fiche est prête !"
                : verySlow
                  ? "Ça prend plus de temps que d'habitude, mais ta fiche arrive. Ne ferme pas cette page."
                  : slow
                    ? "C'est un long cours : encore quelques secondes."
                    : "En général 20 à 60 secondes. Reste sur cette page."}
              {elapsed >= 9 && !done && <span className="tabular-nums"> · {elapsed} s</span>}
            </p>
            {/* Pas de « Réessayer » ici : la première demande tourne encore, une seconde compterait une fiche de plus. */}

            {/* Le squelette de la fiche : les blocs se remplissent au fil des étapes (même taille du début à la fin). */}
            <div className="ff-loader-sheet" aria-hidden="true" style={{ "--fill": Math.min(step, 4) } as CSSProperties}>
              <span className="t" />
              <span className="k" />
              <span className="l" data-on={step >= 1} />
              <span className="l s" data-on={step >= 1} />
              <span className="k" />
              <span className="l b" data-on={step >= 2} />
              <span className="l b" data-on={step >= 2} />
              <span className="l b s" data-on={step >= 2} />
              <div className="cards">
                <span data-on={step >= 3} />
                <span data-on={step >= 3} />
                <span data-on={step >= 3} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
