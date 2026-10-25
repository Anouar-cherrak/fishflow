// « La Descente » : la vie de l'océan autour de la page d'accueil, de la surface aux abysses.
// Dessins SVG légers, éclairés par le haut (dégradés), tous décoratifs (aria-hidden, pointer-events: none).
// Mouvements en CSS (transform et opacity, landing.css) ; chaque groupe ne bouge que lorsqu'il est à l'écran (data-scene).
import type { CSSProperties } from "react";
import { RAIE_PATH, RAIE_VIEWBOX } from "@/lib/raie-path";

// Poisson : corps doré éclairé par le haut, ventre clair, nageoires translucides.
function Fish({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`dp-fish ${className}`} style={style} viewBox="0 0 64 32" aria-hidden="true">
      <path className="dp-fish-tail" d="M49 16 62 5.5c1-.8 2.3.2 1.9 1.4L61 16l2.9 9.1c.4 1.2-.9 2.2-1.9 1.4z" fill="url(#dp-fin)" />
      <path d="M2 16C9 6 21 2.5 33 3.2 42 3.8 49 8.6 51 16c-2 7.4-9 12.2-18 12.8C21 29.5 9 26 2 16z" fill="url(#dp-fish)" />
      <path d="M8 18c8 6 22 8 36 3" stroke="rgba(255,255,255,.55)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M23 6c-3 6-3 14 0 20" stroke="rgba(160,90,0,.28)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="12.5" cy="13" r="2.6" fill="#08213F" />
      <circle cx="11.7" cy="12.2" r=".9" fill="#fff" />
    </svg>
  );
}

// Dégradés partagés (une seule fois dans la page).
export function DeepDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dp-fish" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset=".55" stopColor="#FFB547" />
          <stop offset="1" stopColor="#FFF1CF" />
        </linearGradient>
        <linearGradient id="dp-fin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFCB5C" stopOpacity=".95" />
          <stop offset="1" stopColor="#FF9A3D" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id="dp-raie" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#7FD0FF" />
          <stop offset=".5" stopColor="#2AA9E8" />
          <stop offset="1" stopColor="#0B6FB8" />
        </linearGradient>
        <radialGradient id="dp-jelly" cx=".5" cy=".25" r=".8">
          <stop offset="0" stopColor="#E6FFF8" stopOpacity=".95" />
          <stop offset=".45" stopColor="#8FF5E0" stopOpacity=".6" />
          <stop offset="1" stopColor="#5AD7F0" stopOpacity=".18" />
        </radialGradient>
        <radialGradient id="dp-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#8FF5E0" stopOpacity=".5" />
          <stop offset="1" stopColor="#8FF5E0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dp-angler" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B3E72" />
          <stop offset="1" stopColor="#06162F" />
        </linearGradient>
        <radialGradient id="dp-lure" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FFFBE0" />
          <stop offset=".35" stopColor="#FFE680" />
          <stop offset="1" stopColor="#FFD23F" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* La surface : ciel (soleil ou lune), deux vagues qui roulent, et un poisson qui saute de temps en temps. */
export function Surface() {
  return (
    <div className="dp-surface" data-scene aria-hidden="true">
      <div className="dp-sky">
        <i className="dp-sun" />
        <i className="dp-star" style={{ left: "12%", top: "30%" }} />
        <i className="dp-star" style={{ left: "34%", top: "18%" }} />
        <i className="dp-star" style={{ left: "58%", top: "40%" }} />
        <i className="dp-star" style={{ left: "72%", top: "14%" }} />
      </div>
      <div className="dp-jump">
        <Fish />
        <i className="dp-splash" /><i className="dp-splash b" /><i className="dp-splash c" />
      </div>
      <svg className="dp-wave dp-wave-back" viewBox="0 0 1200 40" preserveAspectRatio="none">
        <path d="M0 22C100 8 200 8 300 22s200 14 300 0 200-14 300 0 200 14 300 0v18H0z" />
      </svg>
      <svg className="dp-wave dp-wave-front" viewBox="0 0 1200 40" preserveAspectRatio="none">
        <path d="M0 18C75 30 150 30 225 18S375 6 450 18s150 12 225 0 150-12 225 0 150 12 225 0 75-6 75-6v28H0z" />
      </svg>
    </div>
  );
}

/* Un banc qui traverse au loin (10 m). */
export function School() {
  const fish = [
    [0, 0, 1], [38, -14, 0.8], [30, 18, 0.9], [72, 2, 0.75], [64, -26, 0.7], [104, 14, 0.65],
  ];
  return (
    <div className="dp-zone dp-school-zone" data-scene aria-hidden="true">
      <div className="dp-school">
        {fish.map(([x, y, s], i) => (
          <Fish key={i} style={{ "--fx": `${x}px`, "--fy": `${y}px`, "--fs": s, "--fd": `${-i * 0.35}s` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

/* La raie d'Anouar qui passe en planant (40 m). */
export function MantaPass() {
  return (
    <div className="dp-zone dp-manta-zone" data-scene aria-hidden="true">
      <div className="dp-manta">
        <svg viewBox={RAIE_VIEWBOX}>
          <path fill="url(#dp-raie)" fillRule="evenodd" d={RAIE_PATH} />
        </svg>
      </div>
    </div>
  );
}

function Jelly({ style }: { style?: CSSProperties }) {
  return (
    <div className="dp-jelly" style={style}>
      <svg viewBox="0 0 90 170">
        <circle cx="45" cy="40" r="44" fill="url(#dp-glow)" className="dp-jelly-glow" />
        <g className="dp-tent" fill="none" stroke="#9BF2E2" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round">
          <path d="M24 52c-6 22 8 36 0 60s6 34 0 52" />
          <path d="M38 56c-4 20 6 34 0 56s4 28 0 40" />
          <path d="M52 56c4 20-6 34 0 56s-4 28 0 40" />
          <path d="M66 52c6 22-8 36 0 60s-6 34 0 52" />
        </g>
        <g className="dp-bell">
          <path d="M6 48C6 20 24 4 45 4s39 16 39 44c-10 7-22 3-39 8-17-5-29-1-39-8z" fill="url(#dp-jelly)" />
          <path d="M18 36c2-13 12-22 25-24" stroke="rgba(255,255,255,.7)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M12 48c10 3 21 1 33 4 12-3 23-1 33-4" stroke="#C9FFF3" strokeOpacity=".8" strokeWidth="2.5" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/* Les méduses (200 m). */
export function Jellies() {
  return (
    <div className="dp-zone dp-jelly-zone" data-scene aria-hidden="true">
      <Jelly style={{ "--jx": "6%", "--jy": "0px", "--js": 1, "--jd": "0s" } as CSSProperties} />
      <Jelly style={{ "--jx": "82%", "--jy": "180px", "--js": 0.7, "--jd": "-2.4s" } as CSSProperties} />
      <Jelly style={{ "--jx": "70%", "--jy": "-60px", "--js": 0.5, "--jd": "-4.1s" } as CSSProperties} />
    </div>
  );
}

/* La baudroie et sa lanterne, tout au fond (1 000 m). */
export function Angler() {
  return (
    <div className="dp-angler" data-scene aria-hidden="true">
      <svg viewBox="0 0 220 140">
        <circle className="dp-lure-glow" cx="152" cy="12" r="34" fill="url(#dp-lure)" />
        <path d="M74 36C92 10 128 4 150 10" stroke="#2A5A96" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle className="dp-lure" cx="152" cy="12" r="6" fill="#FFF6C2" />
        <path d="M200 76c-8-22-30-40-62-42-40-2-74 18-86 44 12 26 46 46 86 44 32-2 54-20 62-46z" fill="url(#dp-angler)" />
        <path d="M200 78 218 58v40z" fill="#0E2950" />
        <path d="M60 80c10 12 26 16 42 13" stroke="#CFE6FF" strokeOpacity=".7" strokeWidth="3" strokeDasharray="4 5" fill="none" />
        <path d="M120 44c18-2 40 6 52 20" stroke="rgba(141,206,255,.25)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="106" cy="62" r="6.5" fill="#FFE680" />
        <circle cx="104.5" cy="60.5" r="2" fill="#fff" />
      </svg>
    </div>
  );
}
