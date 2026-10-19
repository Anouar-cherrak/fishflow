"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GenererA, GenererB, GenererC, LandingA, LandingB, LandingC } from "./mocks";

type Theme = "light" | "dark";
type Key = "A" | "B" | "C";

type Direction = {
  key: Key;
  name: string;
  kind: string;
  concept: string;
  light: [string, string][];
  dark: [string, string][];
  fonts: string;
  components: string;
  mascot: string;
  motion: string;
  risk: string;
  kept?: string[];
};

const DIRECTIONS: Direction[] = [
  {
    key: "A",
    name: "Le Grand Bassin",
    kind: "Direction tirée au sort par le skill",
    concept:
      "FishFlow est un grand bassin en pleine mer : un fond carrelé où dansent les reflets du soleil, des lignes d'eau qui te guident d'une étape à l'autre et des repères de profondeur peints au bord. Chaque cours est une longueur : tu plonges avec ton cours, tu nages jusqu'à la fiche, tu touches le mur avec le quiz.",
    light: [["Eau du bassin", "#CDEFF7"], ["Carreau", "#EAF9FC"], ["Joint", "#A6DCEA"], ["Ligne d'eau (texte)", "#0A2B48"], ["Bleu FishFlow", "#2AA9E8"], ["Bouton", "#38BDF8"], ["Flotteur soleil", "#FFC23D"], ["Flotteur corail", "#FF6F59"]],
    dark: [["Bassin de nuit", "#04263A"], ["Carreau", "#073550"], ["Joint", "#0D4A6B"], ["Texte", "#E4F6FB"], ["Texte doux", "#9CC9DA"], ["Bouton", "#38BDF8"], ["Projecteur", "#FFC94D"], ["Corail", "#FF8A75"]],
    fonts: "Big Shoulders (titres, comme les chiffres peints au bord des piscines) + Atkinson Hyperlegible Next (texte, faite pour être lue facilement).",
    components:
      "Boutons rectangulaires à petits coins, avec un rebord plus foncé en bas comme la margelle : à l'appui, ils s'enfoncent. Pas de cartes partout : le carrelage est le fond, et les blocs importants sont posés dessus comme des plots de départ numérotés. Champs = couloirs de nage : au focus, une ligne de flotteurs s'allume sous le champ.",
    mascot: "La raie nage en grand dans le couloir central de l'accueil, son ombre floue glisse sur le carrelage. Pendant la génération, elle fait sa longueur ; quand la fiche est prête, elle touche le mur.",
    motion: "Reflets du soleil qui ondulent lentement au fond (2 calques SVG qui glissent), un flotteur qui avance sur la ligne d'eau à chaque étape, la raie qui traverse une seule fois au chargement.",
    risk: "Le carrelage rappelle une piscine avant l'océan : il faut garder la lumière, les poissons et la profondeur pour qu'on sente bien la mer, sinon ça fait « piscine municipale ».",
    kept: [
      "Du passeport : chaque jour révisé laisse une marque qui reste (ta série = des carreaux qui s'allument au fond du bassin, un par jour, jamais effacés).",
      "De la boîte à rythmes : une seule ligne continue avec un repère « tu es ici » (la ligne d'eau des 4 étapes et son flotteur).",
      "Des automates en papier : une seule chose bouge à la fois.",
    ],
  },
  {
    key: "B",
    name: "La Descente",
    kind: "Mon choix",
    concept:
      "Défiler, c'est plonger : l'accueil part de la surface ensoleillée et descend jusqu'aux grands fonds, où le plancton s'allume. Un profondimètre sur le côté montre où tu en es : à la surface tu colles ton cours, au milieu naît la fiche, au fond tu révises.",
    light: [["Surface", "#E3F6FF"], ["Eau à 20 m", "#A8DDF6"], ["Eau à 200 m", "#5BB7E3"], ["Rayon de soleil", "#FFF4C9"], ["Texte", "#052036"], ["Bleu FishFlow", "#2AA9E8"], ["Bouton", "#38BDF8"], ["Corail", "#FF7E5F"]],
    dark: [["Eau profonde", "#0B3352"], ["Crépuscule", "#061A30"], ["Abysses", "#020A16"], ["Plaque", "#0A2238"], ["Texte", "#EAF6FF"], ["Texte doux", "#9DBCD3"], ["Bouton", "#38BDF8"], ["Plancton", "#6EF0CF"]],
    fonts: "Bricolage Grotesque (titres, ronde et pleine de caractère) + Figtree (texte, simple et chaleureuse).",
    components:
      "Boutons en forme de pilule avec un reflet de lumière sur le haut (la lumière vient toujours d'en haut). Les blocs sont des plaques d'eau plus claires, éclairées par le haut et plus sombres en bas. Champs à bord souple : au focus, la surface de l'eau ondule sur le haut du champ.",
    mascot: "La raie descend avec toi en défilant, elle penche quand tu changes de zone. Pendant la génération, elle plonge le long du profondimètre ; quand la fiche est prête, des bulles remontent.",
    motion: "Rayons de lumière qui se balancent, bulles qui remontent, profondimètre qui suit le défilement. Au chargement : la lumière entre, puis la raie arrive de la surface.",
    risk: "C'est l'idée d'océan la plus attendue : beaucoup de sites marins font déjà des dégradés bleus. Elle tient seulement si le profondimètre et les zones restent très présents.",
  },
  {
    key: "C",
    name: "Encre d'eau",
    kind: "Idée venue d'ailleurs : la marbrure à l'encre (suminagashi)",
    concept:
      "Ton cours est une goutte d'encre qui tombe dans l'eau : elle s'étale en courants et ces courants dessinent ta fiche. On regarde l'eau d'en haut, calme et claire, et la raie la traverse en laissant un sillage qui marbre la surface.",
    light: [["Eau claire", "#EEF7FB"], ["Eau pâle", "#DCEEF6"], ["Encre indigo (texte)", "#12305A"], ["Bleu FishFlow", "#2AA9E8"], ["Bouton", "#38BDF8"], ["Menthe", "#4FD1BC"], ["Gris d'eau", "#5B7389"], ["Corail", "#F2765E"]],
    dark: [["Eau de nuit", "#07131F"], ["Bassin", "#0E2235"], ["Encre claire (texte)", "#E3F1FA"], ["Texte doux", "#A3BCD0"], ["Bleu FishFlow", "#38BDF8"], ["Menthe", "#5FE0CB"], ["Courant", "#1D4A6B"], ["Corail", "#FF8F75"]],
    fonts: "Young Serif (titres, ronde et douce) + Albert Sans (texte, nette).",
    components:
      "Boutons en forme de goutte, aux coins un peu irréguliers ; à l'appui, des cercles s'étalent autour. Presque pas de cartes : le contenu flotte sur l'eau, séparé par des lignes de courant. Champs comme un petit bassin : au focus, un cercle d'encre s'étale dans le coin.",
    mascot: "La raie, vue d'en haut, glisse en grand en haut de l'accueil, et son sillage dessine les courants. Pendant la génération, elle tourne en rond dans le bassin ; quand la fiche est prête, l'encre se pose.",
    motion: "Lignes de courant qui dérivent très lentement, cercles d'encre à l'appui. Au chargement : une goutte tombe, puis s'étale jusqu'à former la fiche d'exemple.",
    risk: "C'est la plus artistique et la plus calme : elle peut paraître moins énergique pour des 17-25 ans, et les courants doivent rester légers (SVG, pas de 3D).",
  },
];

// Affiche un écran conçu pour une largeur donnée (390 ou 1280 px), réduit pour tenir dans la colonne.
function Scaled({ width, children, label }: { width: number; children: ReactNode; label: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  const [h, setH] = useState(0);
  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const ro = new ResizeObserver(() => {
      const scale = Math.min(1, o.clientWidth / width);
      setS(scale);
      setH(i.offsetHeight * scale);
    });
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);
  return (
    <figure className="pv-shot">
      <figcaption>{label}</figcaption>
      <div ref={outer} className="pv-viewport" style={{ height: h || undefined }}>
        <div ref={inner} className="pv-inner" style={{ width, transform: `scale(${s})` }}>
          {children}
        </div>
      </div>
    </figure>
  );
}

const SCREENS: Record<Key, { landing: (p: { theme: Theme }) => ReactNode; generer: (p: { theme: Theme }) => ReactNode }> = {
  A: { landing: LandingA, generer: GenererA },
  B: { landing: LandingB, generer: GenererB },
  C: { landing: LandingC, generer: GenererC },
};

export function Preview() {
  const [key, setKey] = useState<Key>("A");
  const [theme, setTheme] = useState<Theme>("light");
  const [screen, setScreen] = useState<"landing" | "generer">("landing");
  const d = DIRECTIONS.find((x) => x.key === key)!;
  const Screen = SCREENS[key][screen];

  return (
    <div className="pv">
      <header className="pv-head">
        <h1>Trois directions pour FishFlow</h1>
        <p>Page de travail, à supprimer après ton choix. Les écrans sont des maquettes : les boutons ne font rien. <a href="/design-preview/descente">Voir la démo animée de La Descente</a></p>
        <div className="pv-controls">
          <div role="tablist" aria-label="Direction" className="pv-seg">
            {DIRECTIONS.map((x) => (
              <button key={x.key} role="tab" aria-selected={key === x.key} onClick={() => setKey(x.key)}>
                {x.key}. {x.name}
              </button>
            ))}
          </div>
          <div className="pv-seg" role="group" aria-label="Écran">
            <button aria-pressed={screen === "landing"} onClick={() => setScreen("landing")}>Accueil</button>
            <button aria-pressed={screen === "generer"} onClick={() => setScreen("generer")}>Générer</button>
          </div>
          <div className="pv-seg" role="group" aria-label="Thème">
            <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}>Clair</button>
            <button aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>Sombre</button>
          </div>
        </div>
      </header>

      <section className="pv-card" aria-labelledby="pv-name">
        <p className="pv-kind">{d.kind}</p>
        <h2 id="pv-name">{d.key}. {d.name}</h2>
        <p className="pv-concept">{d.concept}</p>
        <div className="pv-palettes">
          {(["light", "dark"] as const).map((t) => (
            <div key={t}>
              <h3>{t === "light" ? "Thème clair" : "Thème sombre"}</h3>
              <ul className="pv-chips">
                {d[t].map(([n, c]) => (
                  <li key={n + c}>
                    <span style={{ background: c }} aria-hidden="true" />
                    <b>{n}</b>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <dl className="pv-facts">
          <dt>Polices</dt><dd>{d.fonts}</dd>
          <dt>Boutons, cartes, champs</dt><dd>{d.components}</dd>
          <dt>La raie</dt><dd>{d.mascot}</dd>
          <dt>Animations</dt><dd>{d.motion}</dd>
          <dt>Le risque</dt><dd>{d.risk}</dd>
          {d.kept && (<><dt>Repris des idées écartées</dt><dd><ul>{d.kept.map((k) => <li key={k}>{k}</li>)}</ul></dd></>)}
        </dl>
      </section>

      <div className="pv-shots">
        <Scaled width={390} label="Téléphone (390 px)"><Screen theme={theme} /></Scaled>
        <Scaled width={1280} label="Ordinateur (1280 px)"><Screen theme={theme} /></Scaled>
      </div>
    </div>
  );
}
