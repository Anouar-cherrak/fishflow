import type { CSSProperties } from "react";
import { RaieImg } from "@/components/Logo";
import { TextureCanvas } from "@/components/ocean/TextureCanvas";

// L'eau autour des pages de l'application : la lumière qui descend, des reflets du soleil, des particules
// en suspension, quelques bulles et, de temps en temps, un banc de poissons au loin.
// Uniquement du CSS (transform et opacity), fixe, derrière le contenu. Tout s'arrête avec prefers-reduced-motion.
// Valeurs fixes (pas de hasard) : le rendu serveur et le rendu navigateur sont identiques.

const SNOW = Array.from({ length: 22 }, (_, i) => ({
  x: `${(i * 37 + 11) % 100}%`,
  y: `${(i * 53 + 7) % 100}%`,
  s: 1.5 + ((i * 7) % 3),
  d: 9 + ((i * 5) % 9),
  delay: -((i * 3) % 11),
  dx: `${((i * 13) % 30) - 15}px`,
  dy: `${18 + ((i * 11) % 30)}px`,
}));

const BUBBLES = [
  { x: "9%", s: 7, d: 21, delay: -4, drift: "14px" },
  { x: "31%", s: 4, d: 17, delay: -11, drift: "-8px" },
  { x: "58%", s: 10, d: 26, delay: -18, drift: "16px" },
  { x: "77%", s: 5, d: 19, delay: -2, drift: "-12px" },
  { x: "92%", s: 8, d: 24, delay: -14, drift: "10px" },
];

export function Ocean() {
  return (
    <div className="ff-ocean" aria-hidden="true">
      <TextureCanvas className="ff-rays" src="/ocean/rays.webp" />
      <TextureCanvas className="ff-caustic" src="/ocean/caustic-top.webp" tileW={560} />
      <div className="ff-snow">
        {SNOW.map((s, i) => (
          <i key={i} style={{ "--x": s.x, "--y": s.y, "--s": `${s.s}px`, "--d": `${s.d}s`, "--delay": `${s.delay}s`, "--dx": s.dx, "--dy": s.dy } as CSSProperties} />
        ))}
      </div>
      {BUBBLES.map((b, i) => (
        <i key={i} className="ff-bub" style={{ "--x": b.x, "--s": `${b.s}px`, "--d": `${b.d}s`, "--delay": `${b.delay}s`, "--drift": b.drift } as CSSProperties} />
      ))}
    </div>
  );
}

// Un petit coin de mer dans une carte, un bandeau ou un état vide : reflets du soleil et quelques bulles,
// toujours derrière le texte. Le bloc parent a la classe « ff-deco-host ». (« fish » et « y » : anciens réglages, ignorés.)
const DECO_BUBBLES = [
  { x: "8%", s: 8, d: 7, delay: -1 },
  { x: "16%", s: 5, d: 9, delay: -5 },
  { x: "26%", s: 10, d: 11, delay: -3 },
];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SeaDecor(_props: { fish?: boolean; y?: string }) {
  return (
    <span className="ff-deco" aria-hidden="true">
      {DECO_BUBBLES.map((b, i) => (
        <i key={i} style={{ "--x": b.x, "--s": `${b.s}px`, "--d": `${b.d}s`, "--delay": `${b.delay}s` } as CSSProperties} />
      ))}
    </span>
  );
}

// Chargement : la raie du logo nage en rond, quelques bulles remontent.
export function FishSchool() {
  return (
    <div className="ff-swim" aria-hidden="true">
      <span className="ff-swim-raie"><RaieImg small={false} width={92} height={76} /></span>
      <i /><i /><i />
    </div>
  );
}
