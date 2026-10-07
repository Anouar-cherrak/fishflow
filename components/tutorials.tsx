import type { CSSProperties, ReactNode } from "react";
import type { Scene } from "@/components/Explainer";

/*
  Les animations de la page Aide montrent de vrais écrans de FishFlow (mêmes titres, mêmes boutons,
  même mise en page) dessinés sur une toile de 1000 x 560, avec un curseur qui clique au bon endroit.
  d = quand ça démarre (en secondes), t = combien de temps ça dure.
*/

const V = (o: Record<string, string | number>) => o as CSSProperties;
const at = (d: number, t?: number, n?: number): CSSProperties =>
  V({ "--d": `${d}s`, ...(t ? { "--t": `${t}s` } : {}), ...(n ? { "--n": n } : {}) });

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 20C4 20 8 12 16 12C24 12 28 20 28 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 24C4 24 8 16 16 16C24 16 28 24 28 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".4" />
      <circle cx="16" cy="8" r="3" fill="#22C55E" />
    </svg>
  );
}

function Screen({ n, label, children }: { n: number; label: string; children: ReactNode }) {
  return (
    <>
      <div className="sx-bar">
        <div className="sx-logo"><Mark /><span><b>Fish</b>Flow</span></div>
        <div className="sx-rounds">
          <span className="sx-round" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          </span>
          <span className="sx-round" aria-hidden="true"><i /></span>
        </div>
      </div>
      {children}
      <div className="sx-badge sx-in" style={at(0.2)}><i>{n}</i>{label}</div>
    </>
  );
}

function Cur({ from, to, d = 0.3, t = 1 }: { from: [number, number]; to: [number, number]; d?: number; t?: number }) {
  return (
    <>
      <span
        className="sx-cur"
        style={V({ "--fx": `${from[0]}px`, "--fy": `${from[1]}px`, "--tx": `${to[0]}px`, "--ty": `${to[1]}px`, "--d": `${d}s`, "--t": `${t}s` })}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M1 1l0 17 4.6-3.8 3.2 7 3-1.4-3.2-6.8 6.4-.2z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="sx-rip" style={V({ left: to[0], top: to[1], "--d": `${d}s`, "--t": `${t}s` })} />
    </>
  );
}

const Tick = ({ d }: { d: number }) => (
  <span className="sx-box on sx-show" style={{ ...at(d), position: "absolute", left: -1.5, top: -1.5 }} />
);

/* ---------- Écran « Générer » ---------- */
function GenererPage({
  text,
  typing,
  quiz,
  quizD = 0,
  gen,
  genD = 0,
}: {
  text?: boolean;
  typing?: boolean;
  quiz?: boolean;
  quizD?: number;
  gen?: boolean;
  genD?: number;
}) {
  const lines = [
    "La photosynthèse permet aux plantes",
    "de fabriquer leur nourriture à partir",
    "de la lumière, de l'eau et du CO2.",
  ];
  return (
    <div className="sx-page">
      <h1 className="sx-h1">Génère ta fiche de révision.</h1>
      <p className="sx-lead" style={{ maxWidth: 700 }}>Colle ton cours, envoie un PDF ou prends-le en photo.</p>
      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 24, marginTop: 20 }}>
        <div className="sx-card" style={{ padding: 18 }}>
          <div className="sx-tabs"><span className="on">Texte</span><span>PDF</span><span>Photo</span></div>
          <div className="sx-ta" style={{ marginTop: 12 }} data-t="ta">
            {!text && <span style={{ opacity: 0.4 }}>Colle ton cours ici...</span>}
            {text && (
              <div style={{ lineHeight: 1.65 }}>
                {lines.map((l, i) =>
                  typing ? (
                    <div key={i}><span className="sx-type" style={at(1.3 + i * 0.75, 0.7, l.length)}>{l}</span></div>
                  ) : (
                    <div key={i}>{l}</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="sx-muted" style={{ fontWeight: 700, margin: "0 0 8px" }}>Ce que tu veux recevoir</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["Résumé", "Fiche de révision", "Flashcards", "Quiz"].map((l) => {
              const isQ = l === "Quiz";
              const animated = isQ && quizD > 0;
              const on = !isQ || quiz;
              const staticOn = on && !animated;
              return (
                <div key={l} className={`sx-check${staticOn ? " on" : ""}`} data-t={isQ ? "quiz" : undefined}>
                  <span className={`sx-box${staticOn ? " on" : ""}`}>{animated ? <Tick d={quizD} /> : null}</span>
                  {l}
                  {animated ? (
                    <span className="sx-show" style={{ ...at(quizD), position: "absolute", inset: -1, border: "1px solid var(--ff-accent)", borderRadius: 14 }} />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div><p className="sx-muted" style={{ fontWeight: 700, margin: "0 0 6px" }}>Niveau</p><div className="sx-sel">Moyen</div></div>
            <div><p className="sx-muted" style={{ fontWeight: 700, margin: "0 0 6px" }}>Longueur</p><div className="sx-sel">Moyen</div></div>
          </div>
          <div style={{ marginTop: 18 }}>
            <span
              data-t="gen"
              className={`sx-primary${gen ? " sx-press" : ""}`}
              style={{ width: "100%", ...(gen ? at(genD) : {}), position: "relative" }}
            >
              {gen ? (
                <>
                  <span className="sx-hide" style={at(genD + 0.4)}>Générer</span>
                  <span className="sx-show" style={{ ...at(genD + 0.4), position: "absolute" }}>Génération…</span>
                </>
              ) : (
                "Générer"
              )}
            </span>
            {gen && (
              <div className="sx-line" style={{ marginTop: 14, overflow: "hidden" }}>
                <div className="sx-grow" style={{ ...at(genD + 0.5, 2.2), height: "100%", background: "var(--ff-accent)" }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Écran d'une fiche ---------- */
function FichePage({ share, shareD = 0, copied }: { share?: "link"; shareD?: number; copied?: number }) {
  return (
    <div className="sx-page" style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 40, alignContent: "start" }}>
      <div>
        <p className="sx-eyebrow" style={{ margin: 0 }}>Fiche de révision</p>
        <h1 className="sx-h1" style={{ fontSize: 44, marginTop: 4 }}>La photosynthèse</h1>
        <p className="sx-lead" style={{ fontSize: 15 }}>Résumé, fiche, flashcards et quiz, générés à partir de ton cours.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <span className="sx-pill on sm">Classique</span><span className="sx-pill sm">Mémo</span><span className="sx-pill sm">Cornell</span>
        </div>
        <div className="sx-card" style={{ marginTop: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18 }}>
            Résumé <span className="sx-muted" style={{ fontWeight: 500 }}>Régénérer</span>
          </div>
          <p style={{ margin: "10px 0 0", opacity: 0.8, fontSize: 15, lineHeight: 1.55 }}>
            La photosynthèse permet aux plantes de fabriquer leur nourriture à partir de la lumière, de l&apos;eau et du dioxyde de carbone.
          </p>
        </div>
        <div className="sx-bullets sx-in" style={{ ...at(0.3), marginTop: 12 }}>
          <div className="sx-bullet">Se déroule dans les chloroplastes</div>
          <div className="sx-bullet">Utilise la chlorophylle</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10, alignContent: "start", paddingTop: 4 }}>
        <span className="sx-primary" style={{ height: 46, fontSize: 14 }}>Télécharger en PDF</span>
        <span className="sx-sec">Nouvelle fiche</span>
        <span className="sx-sec">Étudier les flashcards</span>
        <span className="sx-sec">Mes fiches</span>
        {share === "link" ? (
          <div className="sx-card" style={{ padding: 12, borderRadius: 16, fontSize: 12 }}>
            <p className="sx-muted" style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 12 }}>Lien de ta fiche</p>
            <div className="sx-field sx-show" style={{ ...at(shareD), height: 38, fontSize: 12 }}>fishflow.fr/p/a8f3c2…</div>
            <span className="sx-primary" style={{ height: 38, fontSize: 13, marginTop: 8, width: "100%", position: "relative" }} data-t="copy">
              {copied ? (
                <>
                  <span className="sx-hide" style={at(copied)}>Copier le lien</span>
                  <span className="sx-show" style={{ ...at(copied), position: "absolute" }}>Lien copié ✓</span>
                </>
              ) : (
                "Copier le lien"
              )}
            </span>
            <p className="sx-muted" style={{ margin: "8px 0 0", fontSize: 11.5 }}>Toute personne qui a ce lien peut lire ta fiche.</p>
          </div>
        ) : (
          <span className="sx-sec" data-t="share">Partager par lien</span>
        )}
      </div>
    </div>
  );
}

export const GENERER: Scene[] = [
  {
    caption: "Colle ton cours (ou envoie un PDF, ou une photo de tes notes).",
    art: (
      <Screen n={1} label="Colle ton cours">
        <GenererPage text typing />
        <Cur from={[820, 470]} to={[230, 330]} d={0.3} t={0.9} />
      </Screen>
    ),
  },
  {
    caption: "Coche ce que tu veux recevoir : résumé, fiche, flashcards, quiz.",
    art: (
      <Screen n={2} label="Choisis ce que tu veux">
        <GenererPage text quiz quizD={1.5} />
        <Cur from={[300, 330]} to={[790, 300]} d={0.4} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Clique sur « Générer ». Il faut quelques secondes.",
    art: (
      <Screen n={3} label="Clique sur Générer">
        <GenererPage text quiz gen genD={1.4} />
        <Cur from={[780, 300]} to={[740, 447]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Ta fiche est prête, avec un titre court qui nomme le sujet.",
    art: (
      <Screen n={4} label="Ta fiche est prête">
        <FichePage />
      </Screen>
    ),
  },
];

/* ---------- Réviser ---------- */
function ReviserLeft({ children }: { children: ReactNode }) {
  return <div className="sx-card" style={{ height: 320, display: "grid", alignContent: "center", position: "relative", padding: 26 }}>{children}</div>;
}
function Boxes({ dot }: { dot?: boolean }) {
  const h = [34, 56, 78, 100, 124];
  const l = ["1 jour", "3 jours", "7 jours", "14 jours", "30 jours"];
  const dotStyle = (d: number): CSSProperties => ({ ...at(d), position: "absolute", left: "50%", top: 8, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: "var(--ff-accent)" });
  return (
    <div className="sx-bx">
      {h.map((x, i) => (
        <div key={i}>
          <i style={{ height: x }}>
            {i === 0 && dot && <span className="sx-hide" style={dotStyle(1.6)} />}
            {i === 1 && dot && <span className="sx-show" style={dotStyle(1.6)} />}
          </i>
          {l[i]}
        </div>
      ))}
    </div>
  );
}
function ReviserPage({ left, dot }: { left: ReactNode; dot?: boolean }) {
  return (
    <div className="sx-page">
      <h1 className="sx-h1">Réviser.</h1>
      <p className="sx-lead" style={{ fontSize: 16, maxWidth: 800 }}>Tes cartes reviennent au bon moment : vite si tu les rates, plus tard si tu les sais.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 22, marginTop: 18 }}>
        {left}
        <div className="sx-card" style={{ height: 320, padding: 24 }}>
          <h3>Comment ça marche</h3>
          <p className="sx-muted" style={{ margin: "0 0 18px", lineHeight: 1.5 }}>
            Chaque carte monte d&apos;une case quand tu la sais, et redescend quand tu la rates.
          </p>
          <Boxes dot={dot} />
        </div>
      </div>
    </div>
  );
}

export const REVISER: Scene[] = [
  {
    caption: "FishFlow te dit combien de cartes sont à revoir aujourd'hui. Clique sur « Commencer ».",
    art: (
      <Screen n={1} label="Commence">
        <ReviserPage
          left={
            <ReviserLeft>
              <p style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, margin: 0 }}>6</p>
              <p style={{ fontSize: 20, opacity: 0.7, margin: "6px 0 22px" }}>cartes à réviser aujourd&apos;hui</p>
              <div><span className="sx-primary sx-press" style={at(1.4)} data-t="start">Commencer</span></div>
            </ReviserLeft>
          }
        />
        <Cur from={[760, 480]} to={[152, 418]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Lis la question, puis touche la carte pour voir la réponse.",
    art: (
      <Screen n={2} label="Touche la carte">
        <ReviserPage
          left={
            <ReviserLeft>
              <div className="sx-flash" style={{ height: 220 }} data-t="card">
                <div className="sx-hide" style={{ ...at(1.5), position: "absolute", inset: 0, display: "grid", placeContent: "center", gap: 14, padding: 24 }}>
                  <span className="q">Où se fait la photosynthèse ?</span>
                  <small>Touche pour voir la réponse</small>
                </div>
                <div className="sx-show" style={{ ...at(1.5), display: "grid", gap: 14 }}>
                  <span className="q" style={{ color: "var(--ff-accent)" }}>Dans les chloroplastes des feuilles.</span>
                  <small>Touche pour revoir la question</small>
                </div>
              </div>
            </ReviserLeft>
          }
        />
        <Cur from={[700, 470]} to={[300, 350]} d={0.4} t={0.9} />
      </Screen>
    ),
  },
  {
    caption: "Clique sur « Je savais » ou « À revoir ». La carte revient plus tard, ou demain.",
    art: (
      <Screen n={3} label="Je savais / À revoir">
        <ReviserPage
          left={
            <ReviserLeft>
              <div style={{ position: "relative", height: 180 }}>
                <div className="sx-flash sx-show" style={{ ...at(2.3), position: "absolute", inset: 0 }}>
                  <span className="q">Que produit-elle ?</span>
                  <small>Touche pour voir la réponse</small>
                </div>
                <div className="sx-flash sx-slide" style={{ ...at(1.6), position: "absolute", inset: 0 }}>
                  <span className="q" style={{ color: "var(--ff-accent)" }}>Dans les chloroplastes des feuilles.</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <span className="sx-sec" style={{ flex: 1 }}>À revoir</span>
                <span className="sx-primary sx-press" style={{ flex: 1, ...at(1.5) }} data-t="knew">Je savais</span>
              </div>
            </ReviserLeft>
          }
        />
        <Cur from={[500, 300]} to={[373, 446]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Chaque carte monte d'une case quand tu la sais. Plus la case est haute, plus elle revient tard.",
    art: (
      <Screen n={4} label="La carte monte d'une case">
        <ReviserPage
          dot
          left={
            <ReviserLeft>
              <h3 style={{ fontSize: 22 }}>Séance terminée.</h3>
              <p className="sx-muted" style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 20px" }}>
                Les cartes que tu connais reviendront plus tard, celles à revoir demain.
              </p>
              <div><span className="sx-primary">Retour à mes fiches</span></div>
            </ReviserLeft>
          }
        />
      </Screen>
    ),
  },
];

/* ---------- Examens ---------- */
function ExamPage({ children, btn }: { children: ReactNode; btn?: boolean }) {
  return (
    <div className="sx-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="sx-h1">Mes examens.</h1>
          <p className="sx-lead" style={{ fontSize: 16 }}>Donne une date. FishFlow te dit combien de cartes revoir chaque jour.</p>
        </div>
        {btn && <span className="sx-primary sx-press" style={at(1.4)} data-t="add">Ajouter un examen</span>}
      </div>
      <div style={{ marginTop: 20 }}>{children}</div>
    </div>
  );
}
const FICHES = ["Les contrats", "La responsabilité", "Les sources du droit"];

export const EXAMENS: Scene[] = [
  {
    caption: "Clique sur « Ajouter un examen ».",
    art: (
      <Screen n={1} label="Ajoute un examen">
        <ExamPage btn>
          <div className="sx-card" style={{ textAlign: "center", padding: 34 }}>
            <h3 style={{ fontSize: 19 }}>Aucun examen pour l&apos;instant.</h3>
            <p className="sx-muted" style={{ margin: "6px auto 16px", maxWidth: 380 }}>Ajoute la date de ton prochain examen et choisis tes fiches.</p>
            <span className="sx-primary">Ajouter mon premier examen</span>
          </div>
        </ExamPage>
        <Cur from={[560, 440]} to={[850, 140]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Écris le nom de l'examen et choisis sa date.",
    art: (
      <Screen n={2} label="Nom et date">
        <ExamPage>
          <div className="sx-card" style={{ display: "grid", gap: 14 }}>
            <div>
              <p className="sx-muted" style={{ fontWeight: 700, margin: "0 0 6px" }}>Nom de l&apos;examen</p>
              <div className="sx-field" data-t="name">
                <span className="sx-hide" style={{ ...at(1.1), opacity: 0.4, position: "absolute" }}>Ex : Partiel de droit</span>
                <span className="sx-type" style={at(1.1, 1, 16)}>Partiel de droit</span>
              </div>
            </div>
            <div>
              <p className="sx-muted" style={{ fontWeight: 700, margin: "0 0 6px" }}>Date</p>
              <div className="sx-field" style={{ width: 260 }}>
                <span className="sx-hide" style={{ ...at(2.4), opacity: 0.4, position: "absolute" }}>jj/mm/aaaa</span>
                <span className="sx-type" style={at(2.4, 0.8, 10)}>22/10/2026</span>
              </div>
            </div>
          </div>
        </ExamPage>
        <Cur from={[800, 420]} to={[330, 261]} d={0.3} t={0.7} />
        <Cur from={[330, 261]} to={[200, 345]} d={1.9} t={0.5} />
      </Screen>
    ),
  },
  {
    caption: "Choisis les fiches à réviser, puis clique sur « Enregistrer ».",
    art: (
      <Screen n={3} label="Choisis tes fiches">
        <ExamPage>
          <div className="sx-card" style={{ display: "grid", gap: 10 }}>
            <p className="sx-muted" style={{ fontWeight: 700, margin: 0 }}>Fiches à réviser</p>
            {FICHES.map((f, i) => (
              <div key={f} className="sx-check" style={{ height: 40 }}>
                <span className="sx-box">{i < 2 && <Tick d={0.9 + i * 0.7} />}</span>
                {f}
              </div>
            ))}
            <div><span className="sx-primary sx-press" style={{ ...at(2.9), height: 42 }} data-t="save">Enregistrer</span></div>
          </div>
        </ExamPage>
        <Cur from={[800, 300]} to={[150, 262]} d={0.2} t={0.6} />
        <Cur from={[150, 262]} to={[150, 312]} d={0.95} t={0.5} />
        <Cur from={[150, 312]} to={[145, 413]} d={2.2} t={0.6} />
      </Screen>
    ),
  },
  {
    caption: "Chaque jour, FishFlow te dit combien de cartes il reste à revoir avant le jour J.",
    art: (
      <Screen n={4} label="Le compte à rebours">
        <ExamPage btn>
          <div className="sx-card sx-in" style={{ ...at(0.2), display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 22, margin: 0 }}>Partiel de droit</h3>
                <p className="sx-muted" style={{ margin: "2px 0 0" }}>Jeudi 22 octobre</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>15</span>
                <span className="sx-muted"> jours</span>
              </div>
            </div>
            <div className="sx-line" style={{ overflow: "hidden" }}><div className="sx-grow" style={{ ...at(0.6, 1.6), width: "38%", height: "100%", background: "var(--ff-accent)" }} /></div>
            <p className="sx-muted" style={{ margin: 0 }}>2 fiches · 8 à revoir aujourd&apos;hui.</p>
          </div>
        </ExamPage>
      </Screen>
    ),
  },
];

/* ---------- Apprendre ---------- */
function AskPage({ typed, typedD, think, children }: { typed?: boolean; typedD?: number; think?: boolean; children?: ReactNode }) {
  return (
    <>
      <div className="sx-page" style={{ textAlign: "center" }}>
        {children ?? (
          <>
            <div className={`sx-orb${think ? " think" : ""}`} style={{ marginTop: 14 }} />
            <h1 className="sx-h1" style={{ fontSize: 30, marginTop: 28 }}>Que veux-tu savoir ?</h1>
            <p className="sx-lead" style={{ margin: "8px auto 0", fontSize: 15, maxWidth: 420 }}>Pose une question. Tu reçois une réponse courte, des images et les sources.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              <span className="sx-pill sm">Comment fonctionne un trou noir</span>
              <span className="sx-pill sm" data-t="chip">Pourquoi le ciel est bleu</span>
              <span className="sx-pill sm">Histoire du café</span>
            </div>
          </>
        )}
      </div>
      <div className="sx-ask">
        <div className="in" data-t="in">
          {typed ? (
            <span>Pourquoi le ciel est bleu</span>
          ) : typedD ? (
            <>
              <span className="sx-hide" style={{ ...at(typedD), opacity: 0.4, position: "absolute" }}>Que veux-tu savoir ?</span>
              <span className="sx-type" style={at(typedD, 1, 25)}>Pourquoi le ciel est bleu</span>
            </>
          ) : (
            <span style={{ opacity: 0.4 }}>Que veux-tu savoir ?</span>
          )}
        </div>
        <span className="sx-primary" style={{ height: 46 }} data-t="send">Envoyer</span>
      </div>
    </>
  );
}

export const APPRENDRE: Scene[] = [
  {
    caption: "Choisis une idée de question, ou écris la tienne.",
    art: (
      <Screen n={1} label="Pose ta question">
        <AskPage typedD={1.3} />
        <Cur from={[820, 330]} to={[555, 376]} d={0.3} t={0.9} />
      </Screen>
    ),
  },
  {
    caption: "Clique sur « Envoyer ». FishFlow réfléchit quelques secondes.",
    art: (
      <Screen n={2} label="FishFlow réfléchit">
        <AskPage typed think />
        <Cur from={[560, 320]} to={[704, 524]} d={0.3} t={0.9} />
      </Screen>
    ),
  },
  {
    caption: "Tu reçois une réponse courte, des images libres de droits et les sources.",
    art: (
      <Screen n={3} label="Réponse, images et sources">
        <AskPage typed>
          <div style={{ textAlign: "left", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 10 }}>
              {[0, 1, 2].map((i) => <span key={i} className="sx-img sx-in" style={at(0.2 + i * 0.3)} />)}
            </div>
            <h1 className="sx-h1 sx-in" style={{ ...at(1), fontSize: 28, marginTop: 14 }}>Pourquoi le ciel est bleu</h1>
            <p className="sx-in" style={{ ...at(1.3), margin: "8px 0 0", opacity: 0.8, lineHeight: 1.55, fontSize: 15 }}>
              La lumière du Soleil contient toutes les couleurs. L&apos;air diffuse surtout le bleu dans toutes les directions : c&apos;est ce qu&apos;on voit en levant la tête.
            </p>
            <p className="sx-in" style={{ ...at(1.7), margin: "10px 0 0", fontSize: 13, color: "var(--ff-accent)", fontWeight: 700 }}>[1] Wikipédia · Diffusion de Rayleigh</p>
          </div>
        </AskPage>
      </Screen>
    ),
  },
  {
    caption: "Un clic sur « En faire une fiche de révision » et ta question devient une vraie fiche.",
    art: (
      <Screen n={4} label="Garde-la en fiche">
        <AskPage typed>
          <div style={{ textAlign: "left", maxWidth: 640, margin: "0 auto" }}>
            <h1 className="sx-h1" style={{ fontSize: 28 }}>Pourquoi le ciel est bleu</h1>
            <p style={{ margin: "8px 0 16px", opacity: 0.8, lineHeight: 1.55, fontSize: 15 }}>
              La lumière du Soleil contient toutes les couleurs. L&apos;air diffuse surtout le bleu dans toutes les directions.
            </p>
            <span className="sx-primary sx-press" style={at(1.4)} data-t="mk">En faire une fiche de révision</span>
            <div className="sx-toast sx-in" style={{ ...at(1.9), marginTop: 16 }}>
              <span>La fiche est créée : résumé, flashcards et quiz.</span>
              <span style={{ color: "var(--ff-accent)", fontWeight: 700 }}>Voir ✓</span>
            </div>
          </div>
        </AskPage>
        <Cur from={[700, 300]} to={[310, 216]} d={0.3} t={1} />
      </Screen>
    ),
  },
];

/* ---------- Partager ---------- */
export const PARTAGER: Scene[] = [
  {
    caption: "Ouvre ta fiche et clique sur « Partager par lien ».",
    art: (
      <Screen n={1} label="Partager par lien">
        <FichePage />
        <Cur from={[500, 470]} to={[809, 338]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Le lien est créé. Clique sur « Copier le lien » et envoie-le à ton ami.",
    art: (
      <Screen n={2} label="Copie le lien">
        <FichePage share="link" shareD={0.2} copied={1.8} />
        <Cur from={[500, 470]} to={[809, 416]} d={0.8} t={0.9} />
      </Screen>
    ),
  },
  {
    caption: "Ton ami ouvre le lien : il lit la fiche, sans pouvoir la modifier.",
    art: (
      <Screen n={3} label="Ton ami la lit">
        <div className="sx-page" style={{ maxWidth: 760 }}>
          <span className="sx-tag sx-in" style={at(0.2)}>Lecture seule</span>
          <h1 className="sx-h1" style={{ marginTop: 12 }}>La photosynthèse</h1>
          <div className="sx-card sx-in" style={{ ...at(0.5), marginTop: 18 }}>
            <h3>Résumé</h3>
            <p style={{ margin: "8px 0 0", opacity: 0.8, lineHeight: 1.55 }}>
              La photosynthèse permet aux plantes de fabriquer leur nourriture à partir de la lumière, de l&apos;eau et du dioxyde de carbone.
            </p>
          </div>
          <div className="sx-bullets sx-in" style={{ ...at(0.9), marginTop: 12 }}>
            <div className="sx-bullet">Se déroule dans les chloroplastes</div>
            <div className="sx-bullet">Utilise la chlorophylle</div>
          </div>
        </div>
      </Screen>
    ),
  },
  {
    caption: "Quand tu veux, clique sur « Arrêter le partage » : le lien ne marche plus.",
    art: (
      <Screen n={4} label="Arrête le partage quand tu veux">
        <div className="sx-page" style={{ maxWidth: 560 }}>
          <h1 className="sx-h1" style={{ fontSize: 34 }}>La photosynthèse</h1>
          <div className="sx-card" style={{ marginTop: 20, display: "grid", gap: 10 }}>
            <p className="sx-muted" style={{ fontWeight: 700, margin: 0 }}>Lien de ta fiche</p>
            <div className="sx-field" style={{ position: "relative" }}>
              <span className="sx-hide" style={at(1.5)}>fishflow.fr/p/a8f3c2…</span>
              <span className="sx-show" style={{ ...at(1.5), position: "absolute", textDecoration: "line-through", opacity: 0.5 }}>fishflow.fr/p/a8f3c2…</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span className="sx-primary" style={{ height: 40, fontSize: 14 }}>Copier le lien</span>
              <span className="sx-press" style={{ ...at(1.4), textDecoration: "underline", textUnderlineOffset: 4, opacity: 0.75, fontSize: 14 }} data-t="stop">Arrêter le partage</span>
            </div>
            <p className="sx-show" style={{ ...at(1.7), margin: 0, fontSize: 14, color: "#ef4444", fontWeight: 700 }}>Lien désactivé : plus personne ne peut ouvrir ta fiche.</p>
          </div>
        </div>
        <Cur from={[780, 460]} to={[290, 277]} d={0.3} t={1} />
      </Screen>
    ),
  },
];

/* ---------- Aujourd'hui ---------- */
function Ring({ n, goal }: { n: number; goal: number }) {
  const r = 50, c = 2 * Math.PI * r;
  return (
    <div className="sx-ring">
      <svg viewBox="0 0 116 116" aria-hidden="true">
        <circle cx="58" cy="58" r={r} fill="none" stroke="var(--ff-line)" strokeWidth="10" />
        <circle cx="58" cy="58" r={r} fill="none" stroke="var(--ff-accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, n / goal))} />
      </svg>
      <div className="n">{n}<small>sur {goal}</small></div>
    </div>
  );
}
function TodayPage({ pick, pickD = 0, ask, bars }: { pick?: number; pickD?: number; ask?: boolean; bars?: boolean }) {
  const goals = [5, 10, 20, 30];
  return (
    <div className="sx-page" style={{ paddingTop: 14 }}>
      <h1 className="sx-h1" style={{ fontSize: 38 }}>Aujourd&apos;hui.</h1>
      <p className="sx-lead" style={{ fontSize: 15, margin: "4px 0 0" }}>Mercredi 7 octobre</p>
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 20, marginTop: 10 }}>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="sx-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ position: "relative", width: 116, height: 116, flex: "none" }}>
                {pick ? (
                  <>
                    <span className="sx-hide" style={{ ...at(pickD), position: "absolute", inset: 0 }}><Ring n={6} goal={10} /></span>
                    <span className="sx-show" style={{ ...at(pickD), position: "absolute", inset: 0 }}><Ring n={6} goal={pick} /></span>
                  </>
                ) : (
                  <Ring n={6} goal={10} />
                )}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Ton objectif du jour</h3>
                <p className="sx-muted" style={{ margin: "4px 0 0" }}>4 cartes à réviser pour y arriver.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {goals.map((g) => {
                const base = g === 10;
                const target = pick === g;
                return (
                  <span key={g} className="sx-pill sm" style={{ position: "relative" }} data-t={`g${g}`}>
                    {g} cartes
                    {base && <span className={`sx-pill sm on${pick ? " sx-hide" : ""}`} style={{ position: "absolute", inset: -1, ...(pick ? at(pickD) : {}) }}>{g} cartes</span>}
                    {target && <span className="sx-pill sm on sx-show" style={{ position: "absolute", inset: -1, ...at(pickD) }}>{g} cartes</span>}
                  </span>
                );
              })}
            </div>
          </div>
          {ask !== undefined && (
            <div className="sx-card" style={{ padding: 16 }}>
              <h3>Une question pour aujourd&apos;hui</h3>
              <p style={{ margin: "0 0 12px", opacity: 0.85 }}>Qu&apos;est-ce que la relativité d&apos;Einstein, sans formule ?</p>
              <div style={{ display: "flex", gap: 10 }}>
                <span className={`sx-primary${ask ? " sx-press" : ""}`} style={{ height: 42, fontSize: 14, ...(ask ? at(1.4) : {}) }} data-t="ask">Poser cette question</span>
                <span className="sx-pill" style={{ height: 42 }}>Une autre</span>
              </div>
            </div>
          )}
        </div>
        <div className="sx-card" style={{ padding: 20, alignSelf: "start" }}>
          <h3>Ta progression</h3>
          <div style={{ display: "flex", gap: 34, margin: "8px 0 14px" }}>
            {[["Série", "4 j"], ["Cartes suivies", "18"], ["Maîtrisées", "6"]].map(([a, b]) => (
              <div key={a}><span className="sx-muted" style={{ fontSize: 12 }}>{a}</span><div style={{ fontSize: 22, fontWeight: 800 }}>{b}</div></div>
            ))}
          </div>
          <p className="sx-muted" style={{ fontSize: 12, margin: "0 0 8px" }}>Cartes révisées, 7 derniers jours</p>
          <div className="sx-bars">
            {[12, 40, 78, 6, 28, 62, 44].map((h, i) => (
              <i key={i} className={i === 6 ? "hot" : ""} style={V({ height: `${h}%`, "--d": `${bars ? 0.2 + i * 0.12 : 0}s` })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const AUJOURDHUI: Scene[] = [
  {
    caption: "Chaque jour, tu as un objectif : le nombre de cartes à revoir.",
    art: (
      <Screen n={1} label="Ton objectif du jour">
        <TodayPage />
      </Screen>
    ),
  },
  {
    caption: "Change-le quand tu veux : 5, 10, 20 ou 30 cartes.",
    art: (
      <Screen n={2} label="Choisis ton rythme">
        <TodayPage pick={20} pickD={1.5} />
        <Cur from={[700, 470]} to={[298, 311]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Une question de curiosité par jour : un clic, et FishFlow te répond.",
    art: (
      <Screen n={3} label="Une question par jour">
        <TodayPage ask />
        <Cur from={[700, 300]} to={[168, 458]} d={0.3} t={1} />
      </Screen>
    ),
  },
  {
    caption: "Ta série et tes progrès restent visibles : ça motive de ne pas casser la chaîne.",
    art: (
      <Screen n={4} label="Ta progression">
        <TodayPage bars />
      </Screen>
    ),
  },
];
