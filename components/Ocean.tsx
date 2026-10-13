import type { CSSProperties } from "react";

// Fond « sous l'eau » : quelques bulles qui montent lentement et des reflets d'eau très doux.
// Uniquement du CSS (transform et opacity), placé derrière le contenu, sans effet sur la mise en page.
// Coupé entièrement si la personne demande moins d'animations (prefers-reduced-motion).

// Valeurs fixes (pas de hasard) : le rendu serveur et le rendu navigateur sont identiques.
const BUBBLES = [
  { x: 6, s: 10, d: 19, delay: -2, drift: 14 },
  { x: 18, s: 6, d: 15, delay: -9, drift: -10 },
  { x: 31, s: 14, d: 24, delay: -14, drift: 18 },
  { x: 47, s: 8, d: 17, delay: -5, drift: -14 },
  { x: 62, s: 12, d: 22, delay: -17, drift: 12 },
  { x: 74, s: 7, d: 16, delay: -11, drift: -8 },
  { x: 86, s: 11, d: 21, delay: -3, drift: 16 },
  { x: 94, s: 5, d: 14, delay: -7, drift: -12 },
];

// Petits poissons qui traversent le fond, très lentement. Valeurs fixes, comme les bulles.
const FISH = [
  { y: 22, size: 26, d: 58, delay: -8, dir: 1 },
  { y: 47, size: 18, d: 72, delay: -40, dir: -1 },
  { y: 66, size: 32, d: 64, delay: -22, dir: 1 },
  { y: 84, size: 20, d: 80, delay: -60, dir: -1 },
];

// Silhouette d'un poisson, tête vers la droite (corps, queue, œil).
export function FishShape({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 22" aria-hidden="true">
      <path d="M41 11 C 35 2, 20 1, 11 9 L 3 3 L 5 11 L 3 19 L 11 13 C 20 21, 35 20, 41 11 Z" fill="currentColor" />
      <circle cx="34" cy="9.5" r="1.6" fill="var(--ff-fish-eye, rgba(0,0,0,0.45))" />
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
            <FishShape />
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

// Séparation douce en forme de vague (page d'accueil).
export function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`ff-wave${flip ? " ff-wave-flip" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 2880 48" preserveAspectRatio="none">
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
