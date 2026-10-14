import type { CSSProperties } from "react";

// Fond « sous l'eau » : des bulles de tailles variées qui montent lentement, de petits poissons et des reflets d'eau.
// Uniquement du CSS (transform et opacity), placé derrière le contenu, sans effet sur la mise en page.
// Coupé entièrement si la personne demande moins d'animations (prefers-reduced-motion).

// Valeurs fixes (pas de hasard) : le rendu serveur et le rendu navigateur sont identiques.
const BUBBLES = [
  { x: 4, s: 10, d: 19, delay: -2, drift: 14 },
  { x: 11, s: 4, d: 13, delay: -6, drift: -6 },
  { x: 18, s: 6, d: 15, delay: -9, drift: -10 },
  { x: 25, s: 18, d: 28, delay: -20, drift: 20 },
  { x: 31, s: 14, d: 24, delay: -14, drift: 18 },
  { x: 38, s: 5, d: 14, delay: -1, drift: -8 },
  { x: 47, s: 8, d: 17, delay: -5, drift: -14 },
  { x: 53, s: 22, d: 32, delay: -26, drift: -18 },
  { x: 58, s: 6, d: 16, delay: -12, drift: 10 },
  { x: 62, s: 12, d: 22, delay: -17, drift: 12 },
  { x: 69, s: 4, d: 12, delay: -4, drift: 6 },
  { x: 74, s: 7, d: 16, delay: -11, drift: -8 },
  { x: 80, s: 16, d: 27, delay: -8, drift: -16 },
  { x: 86, s: 11, d: 21, delay: -3, drift: 16 },
  { x: 91, s: 6, d: 15, delay: -13, drift: -10 },
  { x: 96, s: 5, d: 14, delay: -7, drift: -12 },
];

// Petits poissons qui traversent le fond, très lentement. Valeurs fixes, comme les bulles.
const FISH = [
  { y: 16, size: 24, d: 58, delay: -8, dir: 1, round: false },
  { y: 31, size: 16, d: 70, delay: -50, dir: -1, round: true },
  { y: 47, size: 18, d: 72, delay: -40, dir: -1, round: false },
  { y: 58, size: 14, d: 64, delay: -12, dir: 1, round: true },
  { y: 69, size: 30, d: 66, delay: -22, dir: 1, round: false },
  { y: 80, size: 20, d: 80, delay: -60, dir: -1, round: true },
  { y: 90, size: 15, d: 76, delay: -34, dir: 1, round: false },
];

// Silhouette d'un poisson, tête vers la droite (corps, queue, œil). « round » : un poisson plus rond.
export function FishShape({ className = "", round = false }: { className?: string; round?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 44 22" aria-hidden="true" focusable="false">
      {round ? (
        <path d="M38 11 C 38 3, 24 1, 16 7 L 6 2 L 9 11 L 6 20 L 16 15 C 24 21, 38 19, 38 11 Z" fill="currentColor" />
      ) : (
        <path d="M41 11 C 35 2, 20 1, 11 9 L 3 3 L 5 11 L 3 19 L 11 13 C 20 21, 35 20, 41 11 Z" fill="currentColor" />
      )}
      <circle cx={round ? 31 : 34} cy="9.5" r="1.6" fill="var(--ff-fish-eye, rgba(0,0,0,0.45))" />
    </svg>
  );
}

export function Ocean() {
  return (
    <div className="ff-ocean" aria-hidden="true">
      <span className="ff-caustic" />
      {FISH.map((f, i) => (
        <b
          key={`f${i}`}
          className="ff-fish"
          style={{ "--y": `${f.y}%`, "--size": `${f.size}px`, "--d": `${f.d}s`, "--delay": `${f.delay}s`, "--dir": f.dir } as CSSProperties}
        >
          <span>
            <FishShape round={f.round} />
          </span>
        </b>
      ))}
      {BUBBLES.map((b, i) => (
        <i
          key={i}
          style={
            {
              "--x": `${b.x}%`,
              "--s": `${b.s}px`,
              "--d": `${b.d}s`,
              "--delay": `${b.delay}s`,
              "--drift": `${b.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

// Un petit coin de mer dans une carte, un bandeau ou un état vide : trois bulles et un poisson, derrière le texte.
// Le bloc parent doit avoir la classe « ff-deco-host ».
const DECO_BUBBLES = [
  { x: "8%", s: 8, d: 7, delay: -1 },
  { x: "16%", s: 5, d: 9, delay: -5 },
  { x: "26%", s: 11, d: 11, delay: -3 },
];
export function SeaDecor({ fish = true, y = "72%" }: { fish?: boolean; y?: string }) {
  return (
    <span className="ff-deco" aria-hidden="true">
      {DECO_BUBBLES.map((b, i) => (
        <i key={i} style={{ "--x": b.x, "--s": `${b.s}px`, "--d": `${b.d}s`, "--delay": `${b.delay}s` } as CSSProperties} />
      ))}
      {fish && (
        <b style={{ "--y": y, "--delay": "-9s" } as CSSProperties}>
          <FishShape round />
        </b>
      )}
    </span>
  );
}

// Séparation douce en forme de vague (page d'accueil).
export function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`ff-wave${flip ? " ff-wave-flip" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 2880 48" preserveAspectRatio="none" focusable="false">
        <path d="M0 24 C 240 4, 480 4, 720 24 S 1200 44, 1440 24 S 1920 4, 2160 24 S 2640 44, 2880 24" />
        <path d="M0 32 C 240 14, 480 14, 720 32 S 1200 50, 1440 32 S 1920 14, 2160 32 S 2640 50, 2880 32" />
      </svg>
    </div>
  );
}

// Chargement : un petit banc de poissons qui tourne en rond, avec quelques bulles.
export function FishSchool() {
  return (
    <div className="ff-school mb-8" aria-hidden="true">
      <span className="ff-school-fish"><FishShape /></span>
      <span className="ff-school-fish"><FishShape /></span>
      <span className="ff-school-fish"><FishShape /></span>
      <span className="ff-school-bubbles"><i /><i /><i /></span>
    </div>
  );
}
