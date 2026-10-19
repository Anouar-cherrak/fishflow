"use client";
/* Maquettes des 3 directions (accueil + Générer). Contenu réel de FishFlow, boutons sans action. */

import { useId } from "react";

type P = { theme: "light" | "dark" };

// La raie d'Anouar (logo.png), teintée par la couleur du texte grâce à un masque : le dessin n'est pas modifié.
function Raie({ className = "" }: { className?: string }) {
  return <span className={`raie ${className}`} aria-hidden="true" />;
}

const LEAD = "Colle ton cours, envoie un PDF ou prends une photo. FishFlow en fait une fiche, des flashcards et un quiz, en quelques secondes.";
const NOTE = "3 fiches gratuites par mois, sans carte bancaire.";
const FREE = ["3 fiches par mois", "Tes 5 dernières fiches gardées", "Flashcards, quiz et révision chaque jour", "1 question pour essayer Apprendre"];
const PRO = ["100 fiches par mois (10 par jour)", "Toutes tes fiches gardées", "Des cours plus longs (environ 15 pages)", "20 questions par jour dans Apprendre"];
const COURS = "La photosynthèse permet aux plantes de fabriquer leur nourriture à partir de la lumière, de l'eau et du CO₂. Elle se déroule dans les chloroplastes…";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const IC = {
  today: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  rev: "M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5",
  gen: "M12 5v14M5 12h14",
  fiches: "M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4",
};
function Tabs({ cls }: { cls: string }) {
  const t: [string, string, boolean?][] = [["Aujourd'hui", IC.today], ["Réviser", IC.rev], ["Générer", IC.gen, true], ["Mes fiches", IC.fiches]];
  return (
    <nav className={cls} aria-label="Navigation rapide">
      {t.map(([l, d, on]) => (
        <a key={l} href="#" aria-current={on ? "page" : undefined}><Icon d={d} /><span>{l}</span></a>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <a href="#" className="brand"><Raie className="raie-logo" /><span>Fish<em>Flow</em></span></a>
  );
}

function Fiche({ cls }: { cls: string }) {
  return (
    <article className={cls} aria-label="Exemple de fiche générée">
      <header><strong>Photosynthèse</strong><span>Fiche de révision</span></header>
      <h4>L&apos;essentiel</h4>
      <p>Les plantes transforment la lumière du soleil en énergie chimique : elles produisent du glucose et libèrent de l&apos;oxygène.</p>
      <h4>Points clés</h4>
      <ul>
        <li>Se déroule dans les chloroplastes</li>
        <li>Demande de la lumière, de l&apos;eau et du CO₂</li>
        <li>Produit du glucose, libère de l&apos;oxygène</li>
      </ul>
    </article>
  );
}

function GenForm({ p }: { p: string }) {
  return (
    <div className={`${p}-form`}>
      <section className={`${p}-src`} aria-label="Ton cours">
        <p className="lbl" id={`${p}-srcl`}>D&apos;où vient ton cours ?</p>
        <div className={`${p}-seg`} role="group" aria-labelledby={`${p}-srcl`}>
          <button aria-pressed="true">Texte</button><button aria-pressed="false">PDF</button><button aria-pressed="false">Photo</button>
        </div>
        <label className="sr-only" htmlFor={`${p}-cours`}>Ton cours</label>
        <textarea id={`${p}-cours`} className={`${p}-area`} defaultValue={COURS} rows={7} />
      </section>
      <section className={`${p}-opts`} aria-label="Réglages">
        <fieldset>
          <legend className="lbl">Ce que tu veux recevoir</legend>
          <div className={`${p}-checks`}>
            {[["Résumé", true], ["Fiche de révision", true], ["Flashcards", true], ["Quiz", false]].map(([l, on], i) => (
              <label key={String(l)} className={`${p}-check`}>
                <input type="checkbox" defaultChecked={Boolean(on)} />
                <span className="n" aria-hidden="true">{i + 1}</span>
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={`${p}-selects`}>
          <label><span className="lbl">Niveau</span><select defaultValue="moyen"><option value="facile">Facile</option><option value="moyen">Moyen</option><option value="difficile">Difficile</option></select></label>
          <label><span className="lbl">Longueur</span><select defaultValue="moyen"><option value="court">Court</option><option value="moyen">Moyen</option><option value="detaille">Détaillé</option></select></label>
        </div>
        <button className={`${p}-btn big`}>Créer ma fiche</button>
      </section>
    </div>
  );
}

/* ================= A. Le Grand Bassin ================= */

function Caustics({ cls }: { cls: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={cls} aria-hidden="true" width="100%" height="100%">
      <defs>
        <pattern id={`c${id}`} width="220" height="180" patternUnits="userSpaceOnUse">
          <path d="M0 40c30-18 52 10 80-4s44-30 70-8 50 14 70-6M10 120c22-26 46-6 70-20s30-40 62-30 48 34 78 18M40 0c-8 30 18 48 6 76s-30 44-4 70 6 34 0 34M150 0c18 24-6 46 10 70s40 34 18 60-6 50 4 50" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#c${id})`} />
    </svg>
  );
}

function Rope() {
  return <span className="a-rope" aria-hidden="true" />;
}

export function LandingA({ theme }: P) {
  return (
    <div className="dA fr" data-theme={theme}>
      <header className="a-top">
        <Brand />
        <nav aria-label="Menu"><a href="#">Prix</a><a href="#">Aide</a><a href="#">Connexion</a></nav>
      </header>
      <section className="a-hero" aria-label="Accueil">
        <Caustics cls="a-caus a-caus1" />
        <Caustics cls="a-caus a-caus2" />
        <div className="a-lane" aria-hidden="true"><span /></div>
        <div className="a-swimmer" aria-hidden="true"><Raie className="a-raie" /><Raie className="a-raie-shadow" /></div>
        <div className="a-copy">
          <p className="a-depth" aria-hidden="true"><b>&lt; 1</b> min</p>
          <h1>Ton cours devient une fiche de révision.</h1>
          <p className="a-lead">{LEAD}</p>
          <form className="a-start" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="a-paste" className="sr-only">Colle ton cours</label>
            <textarea id="a-paste" rows={3} placeholder="Colle ton cours ici…" />
            <Rope />
            <button className="a-btn">Créer ma fiche</button>
          </form>
          <p className="a-note">{NOTE}</p>
        </div>
      </section>

      <section className="a-steps" aria-labelledby="a-st">
        <h2 id="a-st">Une longueur, quatre étapes.</h2>
        <ol>
          {[["Ton cours", "Texte, PDF ou photo de tes notes."], ["La fiche", "L'essentiel, en phrases courtes."], ["Les flashcards", "Pour retenir les mots clés."], ["Le quiz", "Pour vérifier que c'est acquis."]].map(([t, s], i) => (
            <li key={t} data-on={i === 1 ? "true" : undefined}>
              <span className="a-block" aria-hidden="true">{i + 1}</span>
              <div><h3>{t}</h3><p>{s}</p></div>
            </li>
          ))}
        </ol>
        <div className="a-steps-lane" aria-hidden="true"><Rope /><i className="a-float" /></div>
        <Fiche cls="a-fiche" />
      </section>

      <section className="a-price" aria-labelledby="a-pr">
        <h2 id="a-pr">Gratuit ou Pro : qu&apos;est-ce qui change ?</h2>
        <div className="a-plans">
          <article><h3>Gratuit</h3><p className="a-amount">0 €</p><ul>{FREE.map((x) => <li key={x}>{x}</li>)}</ul></article>
          <article className="pro"><h3>Pro</h3><p className="a-amount">4,99 € <small>par mois</small></p><ul>{PRO.map((x) => <li key={x}>{x}</li>)}</ul><p className="a-small">Tu arrêtes quand tu veux, en un clic.</p></article>
        </div>
      </section>

      <section className="a-end" aria-labelledby="a-en">
        <h2 id="a-en">Ton prochain cours devient une fiche en moins d&apos;une minute.</h2>
        <button className="a-btn">Créer ma première fiche</button>
      </section>
    </div>
  );
}

export function GenererA({ theme }: P) {
  return (
    <div className="dA fr app" data-theme={theme}>
      <header className="a-top">
        <Brand />
        <nav aria-label="Menu" className="a-appnav"><a href="#">Aujourd&apos;hui</a><a href="#">Réviser</a><a href="#" aria-current="page">Générer</a><a href="#">Mes fiches</a></nav>
      </header>
      <main className="a-gen">
        <Caustics cls="a-caus a-caus1" />
        <div className="a-gen-head">
          <h1>Crée ta fiche de révision.</h1>
          <p>Il te reste <b>3 fiches</b> gratuites ce mois-ci. <a href="#">Ce que Pro change</a></p>
        </div>
        <GenForm p="a" />
        <div className="a-swim-state" role="status">
          <div className="a-swim-track" aria-hidden="true"><Rope /><Raie className="a-raie-mini" /></div>
          <p><b>Pendant la génération :</b> la raie fait sa longueur. Elle touche le mur quand ta fiche est prête.</p>
        </div>
      </main>
      <Tabs cls="a-tabs" />
    </div>
  );
}

/* ================= B. La Descente ================= */

function Gauge({ at }: { at: number }) {
  return (
    <div className="b-gauge" aria-hidden="true">
      {["0 m", "20 m", "200 m", "1000 m"].map((m, i) => (
        <span key={m} data-on={i === at ? "true" : undefined}>{m}</span>
      ))}
    </div>
  );
}

function Bubbles({ n = 7 }: { n?: number }) {
  return (
    <div className="b-bubbles" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} style={{ left: `${8 + ((i * 37) % 84)}%`, animationDelay: `${(i * 0.9) % 5}s`, width: 6 + ((i * 5) % 10), height: 6 + ((i * 5) % 10) }} />)}
    </div>
  );
}

export function LandingB({ theme }: P) {
  return (
    <div className="dB fr" data-theme={theme}>
      <header className="b-top">
        <Brand />
        <nav aria-label="Menu"><a href="#">Prix</a><a href="#">Aide</a><a href="#">Connexion</a></nav>
      </header>
      <section className="b-surface" aria-label="Accueil">
        <div className="b-rays" aria-hidden="true"><i /><i /><i /><i /></div>
        <Gauge at={0} />
        <Raie className="b-raie" />
        <Bubbles />
        <div className="b-copy">
          <h1>Ton cours devient une fiche de révision.</h1>
          <p className="b-lead">{LEAD}</p>
          <form className="b-start" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="b-paste" className="sr-only">Colle ton cours</label>
            <textarea id="b-paste" rows={3} placeholder="Colle ton cours ici…" />
            <button className="b-btn">Plonger avec mon cours</button>
          </form>
          <p className="b-note">{NOTE}</p>
        </div>
      </section>

      <section className="b-zone b-z1" aria-labelledby="b-z1">
        <p className="b-depth" aria-hidden="true">20 m · zone de lumière</p>
        <h2 id="b-z1">Ton cours descend, la fiche apparaît.</h2>
        <div className="b-demo">
          <div className="b-plate b-cours"><h3>Ton cours</h3><p>{COURS}</p></div>
          <Fiche cls="b-plate b-fiche" />
        </div>
      </section>

      <section className="b-zone b-z2" aria-labelledby="b-z2">
        <p className="b-depth" aria-hidden="true">200 m · crépuscule</p>
        <h2 id="b-z2">Plus bas, tu retiens.</h2>
        <div className="b-demo">
          <div className="b-plate b-card"><h3>Flashcard</h3><p className="q">Où se fait la photosynthèse ?</p><p className="a">Dans les chloroplastes.</p></div>
          <div className="b-plate b-card"><h3>Quiz</h3><p className="q">Que libère la plante ?</p><p className="opt">Du CO₂</p><p className="opt ok">De l&apos;oxygène</p></div>
        </div>
      </section>

      <section className="b-zone b-z3" aria-labelledby="b-pr">
        <p className="b-depth" aria-hidden="true">1000 m · grands fonds</p>
        <h2 id="b-pr">Gratuit ou Pro : qu&apos;est-ce qui change ?</h2>
        <div className="b-plans">
          <article className="b-plate"><h3>Gratuit</h3><p className="b-amount">0 €</p><ul>{FREE.map((x) => <li key={x}>{x}</li>)}</ul></article>
          <article className="b-plate pro"><h3>Pro</h3><p className="b-amount">4,99 € <small>par mois</small></p><ul>{PRO.map((x) => <li key={x}>{x}</li>)}</ul><p className="b-small">Tu arrêtes quand tu veux, en un clic.</p></article>
        </div>
        <div className="b-end">
          <h2>Ton prochain cours devient une fiche en moins d&apos;une minute.</h2>
          <button className="b-btn">Créer ma première fiche</button>
        </div>
        <div className="b-plankton" aria-hidden="true" />
      </section>
    </div>
  );
}

export function GenererB({ theme }: P) {
  return (
    <div className="dB fr app" data-theme={theme}>
      <header className="b-top">
        <Brand />
        <nav aria-label="Menu" className="b-appnav"><a href="#">Aujourd&apos;hui</a><a href="#">Réviser</a><a href="#" aria-current="page">Générer</a><a href="#">Mes fiches</a></nav>
      </header>
      <main className="b-gen">
        <div className="b-rays" aria-hidden="true"><i /><i /><i /></div>
        <div className="b-gen-head">
          <h1>Crée ta fiche de révision.</h1>
          <p>Il te reste <b>3 fiches</b> gratuites ce mois-ci. <a href="#">Ce que Pro change</a></p>
        </div>
        <GenForm p="b" />
        <div className="b-dive" role="status">
          <Gauge at={2} />
          <Raie className="b-raie-mini" />
          <p><b>Pendant la génération :</b> la raie plonge le long du profondimètre. Des bulles remontent quand ta fiche est prête.</p>
        </div>
      </main>
      <Tabs cls="b-tabs" />
    </div>
  );
}

/* ================= C. Encre d'eau ================= */

function Currents({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" strokeLinecap="round">
        <path className="c1" d="M-20 120C120 60 220 180 360 130S600 40 820 110" />
        <path className="c2" d="M-20 150C130 95 230 210 370 160S610 75 820 140" />
        <path className="c3" d="M-20 182C140 130 240 238 380 192S620 110 820 172" />
        <path className="c1" d="M-20 420C150 470 260 360 420 410S640 500 820 440" />
        <path className="c2" d="M-20 452C160 500 270 392 430 442S650 530 820 472" />
        <path className="c3" d="M600 300c0-40 40-70 80-60s60 60 30 90-90 20-110-30zM560 300c0-70 70-110 130-96s90 96 46 140-136 26-176-44z" />
      </g>
    </svg>
  );
}

export function LandingC({ theme }: P) {
  return (
    <div className="dC fr" data-theme={theme}>
      <header className="c-top">
        <Brand />
        <nav aria-label="Menu"><a href="#">Prix</a><a href="#">Aide</a><a href="#">Connexion</a></nav>
      </header>
      <section className="c-hero" aria-label="Accueil">
        <Currents cls="c-cur" />
        <Raie className="c-raie" />
        <div className="c-copy">
          <h1>Ton cours devient une fiche de révision.</h1>
          <p className="c-lead">{LEAD}</p>
          <form className="c-start" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="c-paste" className="sr-only">Colle ton cours</label>
            <textarea id="c-paste" rows={3} placeholder="Colle ton cours ici…" />
            <button className="c-btn">Créer ma fiche</button>
          </form>
          <p className="c-note">{NOTE}</p>
        </div>
        <div className="c-drop" aria-hidden="true"><i /><i /><i /></div>
        <Fiche cls="c-fiche" />
      </section>

      <section className="c-flow" aria-labelledby="c-fl">
        <h2 id="c-fl">Une goutte de cours, quatre courants.</h2>
        <ol>
          {[["Ton cours", "Texte, PDF ou photo de tes notes."], ["La fiche", "L'essentiel, en phrases courtes."], ["Les flashcards", "Pour retenir les mots clés."], ["Le quiz", "Pour vérifier que c'est acquis."]].map(([t, s]) => (
            <li key={t}><h3>{t}</h3><p>{s}</p></li>
          ))}
        </ol>
      </section>

      <section className="c-price" aria-labelledby="c-pr">
        <h2 id="c-pr">Gratuit ou Pro : qu&apos;est-ce qui change ?</h2>
        <div className="c-plans">
          <article><h3>Gratuit</h3><p className="c-amount">0 €</p><ul>{FREE.map((x) => <li key={x}>{x}</li>)}</ul></article>
          <article className="pro"><h3>Pro</h3><p className="c-amount">4,99 € <small>par mois</small></p><ul>{PRO.map((x) => <li key={x}>{x}</li>)}</ul><p className="c-small">Tu arrêtes quand tu veux, en un clic.</p></article>
        </div>
        <div className="c-end">
          <h2>Ton prochain cours devient une fiche en moins d&apos;une minute.</h2>
          <button className="c-btn">Créer ma première fiche</button>
        </div>
      </section>
    </div>
  );
}

export function GenererC({ theme }: P) {
  return (
    <div className="dC fr app" data-theme={theme}>
      <header className="c-top">
        <Brand />
        <nav aria-label="Menu" className="c-appnav"><a href="#">Aujourd&apos;hui</a><a href="#">Réviser</a><a href="#" aria-current="page">Générer</a><a href="#">Mes fiches</a></nav>
      </header>
      <main className="c-gen">
        <Currents cls="c-cur" />
        <div className="c-gen-head">
          <h1>Crée ta fiche de révision.</h1>
          <p>Il te reste <b>3 fiches</b> gratuites ce mois-ci. <a href="#">Ce que Pro change</a></p>
        </div>
        <GenForm p="c" />
        <div className="c-state" role="status">
          <div className="c-drop small" aria-hidden="true"><i /><i /><i /></div>
          <p><b>Pendant la génération :</b> la raie tourne dans le bassin et l&apos;encre s&apos;étale. Elle se pose quand ta fiche est prête.</p>
        </div>
      </main>
      <Tabs cls="c-tabs" />
    </div>
  );
}

