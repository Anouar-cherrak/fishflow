// Les objets du produit, en relief, qui s'animent tout seuls quand ils sont à l'écran (attribut data-on posé
// par Landing.tsx). Contenu réel de FishFlow (exemple : un cours sur la photosynthèse). Décors : aria-hidden,
// le texte utile de chaque section est écrit à côté, en clair.

function Check() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

/* Accueil : le cours (une feuille) est lu, la fiche en sort, les flashcards s'étalent, le quiz est réussi. En boucle. */
export function HeroStage() {
  return (
    <div className="stage" data-scene aria-hidden="true">
      <div className="stage-tilt">
        <div className="obj sheet">
          <p className="sheet-t">Chapitre 4 · La photosynthèse</p>
          <p className="sheet-l"><span>La photosynthèse permet aux plantes de</span> fabriquer leur nourriture à partir de</p>
          <p className="sheet-l"><span>la lumière, de l&apos;eau et du CO₂.</span> Elle se déroule dans</p>
          <p className="sheet-l">les chloroplastes, <span>grâce à la chlorophylle.</span> Pendant</p>
          <p className="sheet-l">la phase claire, la lumière est captée ;</p>
          <p className="sheet-l">pendant la phase sombre, <span>le glucose est</span></p>
          <p className="sheet-l"><span>fabriqué. La plante libère de l&apos;oxygène.</span></p>
          <i className="scan" />
        </div>
        <div className="obj fiche">
          <div className="fiche-top"><b>Photosynthèse</b><small>Fiche de révision</small></div>
          <p className="k">L&apos;essentiel</p>
          <p className="t">Les plantes transforment la lumière en énergie chimique : du glucose, et de l&apos;oxygène libéré.</p>
          <ul>
            <li>Dans les chloroplastes</li>
            <li>Lumière, eau et CO₂</li>
            <li>Glucose et oxygène</li>
          </ul>
        </div>
        <div className="obj card c2"><p>Que capte la chlorophylle ?</p></div>
        <div className="obj card c1">
          <div className="card-in">
            <p className="front">Où se fait la photosynthèse ?</p>
            <p className="back">Dans les chloroplastes.</p>
          </div>
        </div>
        <div className="obj quiz">
          <p className="q">Que libère la plante ?</p>
          <p className="o">Du CO₂</p>
          <p className="o ok">De l&apos;oxygène <Check /></p>
        </div>
      </div>
    </div>
  );
}

/* Les trois gestes : chaque carte joue sa petite scène quand elle arrive à l'écran. */
export function StepPaste() {
  return (
    <div className="mini paste" data-scene aria-hidden="true">
      <div className="mini-field"><span className="typed">La photosynthèse permet aux plantes de fabriquer…</span><i className="caret" /></div>
      <p className="mini-btn">Créer ma fiche</p>
    </div>
  );
}
export function StepRead() {
  return (
    <div className="mini read" data-scene aria-hidden="true">
      <p className="mini-line"><mark>Les plantes</mark> captent <mark>la lumière</mark></p>
      <p className="mini-line">dans <mark>les chloroplastes</mark> et</p>
      <p className="mini-line">produisent <mark>du glucose</mark>.</p>
      <div className="bar"><i /></div>
    </div>
  );
}
export function StepReady() {
  return (
    <div className="mini ready" data-scene aria-hidden="true">
      <div className="ready-row"><span className="dot" /><b>Fiche</b><small>4 parties</small></div>
      <div className="ready-row"><span className="dot" /><b>Flashcards</b><small>14 cartes</small></div>
      <div className="ready-row"><span className="dot" /><b>Quiz</b><small>9 questions</small></div>
      <i className="pop" /><i className="pop" /><i className="pop" />
    </div>
  );
}

/* Grandes démos des fonctionnalités. */
export function FicheShow() {
  return (
    <div className="show fiche-show" data-scene aria-hidden="true">
      <div className="paper p-a">
        <p className="paper-t">Classique</p>
        <p className="h">L&apos;essentiel</p><span className="ln" /><span className="ln s" />
        <p className="h">Points clés</p><span className="ln b" /><span className="ln b s" /><span className="ln b" />
      </div>
      <div className="paper p-b">
        <p className="paper-t">Mémo</p>
        <div className="memo"><span>Lumière</span><span>CO₂</span><span>Glucose</span><span>O₂</span></div>
        <span className="ln" /><span className="ln s" />
      </div>
      <div className="paper p-c">
        <p className="paper-t">Cornell</p>
        <div className="cornell"><div><span className="ln" /><span className="ln" /></div><div><span className="ln" /><span className="ln s" /><span className="ln" /></div></div>
        <span className="ln" />
      </div>
    </div>
  );
}

export function CardsShow() {
  return (
    <div className="show cards-show" data-scene aria-hidden="true">
      <div className="fc f3"><p>Qu&apos;est-ce que l&apos;inflation ?</p></div>
      <div className="fc f2"><p>Date de la prise de la Bastille ?</p></div>
      <div className="fc f1">
        <div className="fc-in">
          <p className="front">Où se fait la photosynthèse ?</p>
          <p className="back">Dans les chloroplastes.</p>
        </div>
      </div>
      <div className="fc-tags"><span className="no">À revoir</span><span className="yes">Je savais</span></div>
    </div>
  );
}

export function QuizShow() {
  return (
    <div className="show quiz-show" data-scene aria-hidden="true">
      <div className="qz">
        <div className="qz-top"><span>Question 3 sur 9</span><span className="qz-dots"><i className="on" /><i className="on" /><i className="on" /><i /><i /></span></div>
        <p className="qz-q">Que produit la plante pendant la photosynthèse ?</p>
        <p className="qz-o">Du sel minéral</p>
        <p className="qz-o ok">Du glucose <Check /></p>
        <p className="qz-o">Du dioxyde de carbone</p>
        <i className="b" /><i className="b" /><i className="b" /><i className="b" />
      </div>
    </div>
  );
}

export function DailyShow() {
  return (
    <div className="show daily-show" data-scene aria-hidden="true">
      <div className="dy">
        <div className="dy-ring">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" /><circle className="on" cx="60" cy="60" r="50" /></svg>
          <p><b>8</b><small>sur 10</small></p>
        </div>
        <div className="dy-txt"><b>Objectif du jour</b><small>8 cartes revues · série de 12 jours</small></div>
        <div className="week">{["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className={i < 5 ? "on" : i === 5 ? "now" : ""}>{d}</span>)}</div>
      </div>
    </div>
  );
}

export function AskShow() {
  return (
    <div className="show ask-show" data-scene aria-hidden="true">
      <p className="ask-q">Pourquoi le ciel est bleu ?</p>
      <div className="ask-a">
        <b>La lumière bleue est la plus dispersée</b>
        <p>En traversant l&apos;atmosphère, la lumière bleue est dispersée par les molécules d&apos;air bien plus que le rouge : elle nous arrive de partout. <sup>[1]</sup></p>
        <div className="src"><span>[1] Wikipédia · Diffusion Rayleigh</span></div>
      </div>
    </div>
  );
}
