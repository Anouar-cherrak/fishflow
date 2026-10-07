import type { CSSProperties, ReactNode } from "react";
import type { Scene } from "@/components/Explainer";

const v = (o: Record<string, string | number>) => o as CSSProperties;
const Line = ({ w = 100, d = 0 }: { w?: number; d?: number }) => (
  <span className="ex-line ex-grow" style={v({ width: `${w}%`, animationDelay: `${d}s` })} />
);
const Chip = ({ children, on, d = 0 }: { children: ReactNode; on?: boolean; d?: number }) => (
  <span className={`ex-chip ex-pop${on ? " on" : ""}`} style={v({ animationDelay: `${d}s` })}>{children}</span>
);
const Btn = ({ children, press }: { children: ReactNode; press?: boolean }) => (
  <span className={`ex-btn${press ? " ex-press" : ""}`}>{children}</span>
);
const Cursor = ({ x, y }: { x: string; y: string }) => (
  <svg className="ex-cursor" viewBox="0 0 24 24" width="22" height="22" style={v({ "--cx": x, "--cy": y })} aria-hidden="true">
    <path d="M5 3l14 8-6 1.5L10 19 5 3z" fill="currentColor" stroke="var(--ff-bg)" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const Win = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`ex-win ${className}`}>{children}</div>
);

export const GENERER: Scene[] = [
  {
    caption: "Colle un cours, envoie un PDF ou prends une photo de tes notes.",
    art: (
      <Win>
        <div className="ex-tabs"><b>Texte</b><span>PDF</span><span>Photo</span></div>
        <div className="grid gap-2 mt-3">
          <Line w={96} d={0.1} /><Line w={88} d={0.3} /><Line w={92} d={0.5} /><Line w={60} d={0.7} />
        </div>
      </Win>
    ),
  },
  {
    caption: "Choisis ce que tu veux recevoir : résumé, fiche, flashcards, quiz.",
    art: (
      <Win>
        <div className="flex flex-wrap gap-2 justify-center">
          <Chip on d={0.1}>Résumé</Chip><Chip on d={0.3}>Fiche</Chip><Chip on d={0.5}>Flashcards</Chip><Chip d={0.7}>Quiz</Chip>
        </div>
      </Win>
    ),
  },
  {
    caption: "Clique sur « Générer ». Ça prend quelques secondes.",
    art: (
      <Win className="relative">
        <div className="grid justify-items-center gap-4">
          <Btn press>Générer</Btn>
          <span className="ex-track"><i className="ex-fill" /></span>
        </div>
        <Cursor x="12px" y="-6px" />
      </Win>
    ),
  },
  {
    caption: "Ta fiche est prête, avec un titre court qui nomme le sujet.",
    art: (
      <Win>
        <p className="ex-h ex-up">La photosynthèse</p>
        <div className="grid gap-2 mt-3"><Line w={90} d={0.2} /><Line w={80} d={0.4} /><Line w={70} d={0.6} /></div>
        <div className="flex gap-2 mt-3"><Chip on d={0.8}>Résumé</Chip><Chip on d={0.95}>Flashcards</Chip><Chip on d={1.1}>Quiz</Chip></div>
      </Win>
    ),
  },
];

export const REVISER: Scene[] = [
  {
    caption: "Chaque jour, tes cartes à revoir t'attendent.",
    art: (
      <div className="grid justify-items-center gap-4">
        <div className="ex-stack ex-up"><i /><i /><i /><b>12 cartes</b></div>
        <Btn>Réviser maintenant</Btn>
      </div>
    ),
  },
  {
    caption: "Lis la question, puis retourne la carte pour voir la réponse.",
    art: (
      <div className="ex-flip">
        <div className="ex-flip-in">
          <div className="ex-face">Où a lieu la photosynthèse ?</div>
          <div className="ex-face back">Dans les chloroplastes.</div>
        </div>
      </div>
    ),
  },
  {
    caption: "Dis honnêtement si tu le savais.",
    art: (
      <div className="relative flex gap-3 justify-center">
        <span className="ex-btn ghost ex-pop">À revoir</span>
        <span className="ex-btn ex-pop ex-press" style={v({ animationDelay: "0.2s" })}>Je savais</span>
        <Cursor x="-4px" y="-4px" />
      </div>
    ),
  },
  {
    caption: "Une carte sue revient plus tard. Une carte ratée revient vite.",
    art: (
      <Win>
        <div className="ex-boxes">
          {[1, 2, 3, 4, 5].map((n) => (<span key={n}>{n}</span>))}
          <i className="ex-dot ok" /><i className="ex-dot ko" />
        </div>
        <p className="text-xs text-center mt-3 opacity-60">Boîte 1 : demain · Boîte 5 : dans un mois</p>
      </Win>
    ),
  },
];

export const EXAMENS: Scene[] = [
  {
    caption: "Ajoute le nom et la date de ton examen.",
    art: (
      <Win>
        <div className="ex-cal">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={i === 10 ? "on" : ""}>{i + 12}</span>
          ))}
        </div>
        <p className="ex-h ex-up mt-3 text-sm">Partiel de droit · 22 octobre</p>
      </Win>
    ),
  },
  {
    caption: "Choisis tes fiches. Les pastilles te font naviguer dossier par dossier.",
    art: (
      <Win>
        <div className="flex flex-wrap gap-2 justify-center mb-3">
          <Chip on d={0.1}>Toutes</Chip><Chip d={0.25}>Droit</Chip><Chip d={0.4}>Maths</Chip>
        </div>
        <div className="grid gap-2">
          {["Les contrats", "La responsabilité", "Les sources du droit"].map((t, i) => (
            <span key={t} className="ex-row ex-up" style={v({ animationDelay: `${0.3 + i * 0.2}s` })}><i className={i < 2 ? "on" : ""} />{t}</span>
          ))}
        </div>
      </Win>
    ),
  },
  {
    caption: "FishFlow répartit les cartes sur les jours qui restent.",
    art: (
      <Win>
        <div className="ex-bars">
          {[40, 65, 50, 80, 55, 70, 30].map((h, i) => (
            <span key={i} style={v({ "--h": `${h}%`, animationDelay: `${i * 0.12}s` })} />
          ))}
        </div>
        <div className="ex-days"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      </Win>
    ),
  },
  {
    caption: "Clique sur « Réviser pour cet examen » et suis ta progression.",
    art: (
      <Win className="relative">
        <div className="grid justify-items-center gap-4">
          <Btn press>Réviser pour cet examen</Btn>
          <span className="ex-track"><i className="ex-fill half" /></span>
        </div>
        <Cursor x="10px" y="-6px" />
      </Win>
    ),
  },
];

export const APPRENDRE: Scene[] = [
  {
    caption: "Pose n'importe quelle question de culture ou de cours.",
    art: (
      <Win>
        <div className="ex-input"><span className="ex-type">Pourquoi le ciel est bleu ?</span></div>
      </Win>
    ),
  },
  {
    caption: "La boule réfléchit quelques secondes.",
    art: (
      <div className="grid justify-items-center gap-3">
        <span className="ex-orb" />
        <span className="ex-dots"><i /><i /><i /></span>
      </div>
    ),
  },
  {
    caption: "Tu reçois une réponse claire, des images et des liens pour aller plus loin.",
    art: (
      <Win>
        <div className="grid gap-2"><Line w={95} d={0.1} /><Line w={85} d={0.25} /></div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[0, 1, 2].map((i) => (<span key={i} className="ex-img ex-pop" style={v({ animationDelay: `${0.5 + i * 0.2}s` })} />))}
        </div>
      </Win>
    ),
  },
  {
    caption: "En un clic, transforme la réponse en fiche de révision.",
    art: (
      <Win className="relative">
        <div className="grid justify-items-center"><Btn press>En faire une fiche de révision</Btn></div>
        <Cursor x="10px" y="-6px" />
      </Win>
    ),
  },
];

export const PARTAGER: Scene[] = [
  {
    caption: "Ouvre une fiche et clique sur « Partager par lien ».",
    art: (
      <Win className="relative">
        <div className="flex gap-3 items-start">
          <div className="grid gap-2 flex-1"><p className="ex-h text-sm">La photosynthèse</p><Line w={90} /><Line w={75} /></div>
          <Btn press>Partager par lien</Btn>
        </div>
        <Cursor x="-10px" y="-4px" />
      </Win>
    ),
  },
  {
    caption: "Un lien est créé. Copie-le et envoie-le à qui tu veux.",
    art: (
      <Win>
        <div className="ex-link ex-up"><span>fishflow.fr/p/a8f3…</span><b>Copié ✓</b></div>
      </Win>
    ),
  },
  {
    caption: "La personne voit ta fiche en lecture seule, sans ton cours d'origine.",
    art: (
      <Win>
        <p className="ex-tag ex-pop">Lecture seule</p>
        <p className="ex-h text-sm mt-2">La photosynthèse</p>
        <div className="grid gap-2 mt-2"><Line w={92} d={0.2} /><Line w={78} d={0.4} /><Line w={64} d={0.6} /></div>
      </Win>
    ),
  },
  {
    caption: "Tu peux arrêter le partage quand tu veux.",
    art: (
      <Win>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Partage par lien</span>
          <span className="ex-toggle"><i /></span>
        </div>
        <p className="ex-link off ex-up mt-3"><span>fishflow.fr/p/a8f3…</span><b>Lien désactivé</b></p>
      </Win>
    ),
  },
];

export const AUJOURDHUI: Scene[] = [
  {
    caption: "Choisis ton objectif du jour : 5, 10, 20 ou 30 cartes.",
    art: (
      <Win>
        <div className="flex flex-wrap gap-2 justify-center">
          <Chip d={0.1}>5</Chip><Chip on d={0.25}>10</Chip><Chip d={0.4}>20</Chip><Chip d={0.55}>30</Chip>
        </div>
      </Win>
    ),
  },
  {
    caption: "Révise tes cartes : l'anneau se remplit au fur et à mesure.",
    art: (
      <div className="grid justify-items-center gap-2">
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" />
          <circle className="ex-ring" cx="60" cy="60" r="52" fill="none" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" transform="rotate(-90 60 60)" />
        </svg>
        <p className="ex-h text-sm ex-up" style={v({ animationDelay: "2s" })}>Objectif atteint</p>
      </div>
    ),
  },
  {
    caption: "Une question de curiosité chaque jour, pour apprendre sans examen.",
    art: (
      <Win>
        <p className="ex-h text-sm ex-up">Comment fonctionne la mémoire humaine ?</p>
        <div className="mt-3"><Btn>Poser cette question</Btn></div>
      </Win>
    ),
  },
  {
    caption: "Suis ta série de jours et ta progression.",
    art: (
      <Win>
        <div className="flex items-end justify-between gap-3">
          <div className="ex-bars small">
            {[30, 55, 40, 75, 60, 90, 45].map((h, i) => (<span key={i} style={v({ "--h": `${h}%`, animationDelay: `${i * 0.1}s` })} />))}
          </div>
          <span className="ex-streak ex-pop" style={v({ animationDelay: "0.8s" })}>4 jours</span>
        </div>
      </Win>
    ),
  },
];
