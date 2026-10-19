"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandMark } from "@/components/BrandMark";
import { TextureCanvas } from "@/components/ocean/TextureCanvas";
import { TrackedLink } from "@/components/TrackedLink";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";
import { trackEvent } from "@/lib/tracking";
import { depthClick, disableDepthSound, enableDepthSound } from "./depth-sound";
import { AskShow, CardsShow, DailyShow, FicheShow, HeroStage, QuizShow, StepPaste, StepRead, StepReady } from "./Objects";

type Theme = "light" | "dark";

const FREE = ["3 fiches par mois", "Tes 5 dernières fiches gardées", "Flashcards, quiz et révision chaque jour", "1 question pour essayer Apprendre"];
const PRO = ["100 fiches par mois (10 par jour)", "Toutes tes fiches gardées", "Des cours plus longs (environ 15 pages)", "20 questions par jour dans Apprendre"];
const SUBJECTS = ["SVT", "Histoire", "Droit", "Maths", "Philosophie", "Économie", "Physique-chimie", "Géographie", "Anglais", "Médecine", "Gestion", "Littérature"];

// Le texte qui s'allume mot à mot quand on fait défiler.
const STORY =
  "La veille du contrôle, tu as quarante pages de cours et aucune idée de par où commencer. Avec FishFlow, tu colles ton cours : il garde l'essentiel, te prépare des flashcards et un quiz, et te dit chaque jour quoi revoir.";
const STORY_END = "Tu révises sans te noyer.";

const FEATURES = [
  { id: "fiche", title: "Une vraie fiche, pas un résumé flou.", text: "L'essentiel en quelques lignes, puis les points clés rangés en parties. Trois façons de l'afficher (Classique, Mémo ou Cornell), et un PDF à télécharger.", Show: FicheShow },
  { id: "cartes", title: "Des flashcards prêtes à réviser.", text: "Tu retournes la carte et tu dis si tu savais. Une carte ratée revient demain ; une carte que tu connais revient plus tard, jusqu'à 30 jours.", Show: CardsShow },
  { id: "quiz", title: "Un quiz pour vérifier que c'est acquis.", text: "Des questions tirées de ton cours. Quand tu te trompes, tu vois tout de suite la bonne réponse, et ton meilleur score est gardé.", Show: QuizShow },
  { id: "jour", title: "Cinq minutes par jour, et ça reste.", text: "FishFlow te dit chaque jour quelles cartes revoir. Ta série grandit, ton objectif du jour se remplit, et le jour de l'examen tu n'as plus qu'à relire.", Show: DailyShow },
  { id: "apprendre", title: "Une notion te bloque ? Pose ta question.", text: "Apprendre te répond clairement, avec ses sources et des images. Tu peux ensuite en faire une fiche en un geste.", Show: AskShow },
];

// Bulles d'ambiance : quelques-unes par « étage » de la page (valeurs fixes : même rendu serveur et navigateur).
const BUBBLE_BANDS = [0, 1, 2, 3, 4, 5].map((band) => ({
  top: `${band * 115}vh`,
  items: Array.from({ length: 6 }, (_, i) => ({
    x: `${(i * 17 + band * 23 + 6) % 96}%`,
    s: `${5 + ((i * 7 + band * 3) % 12)}px`,
    d: `${16 + ((i * 5 + band) % 12)}s`,
    delay: `${-((i * 4 + band * 3) % 18)}s`,
    drift: `${((i * 11 + band * 7) % 40) - 20}px`,
  })),
}));

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* Le profondimètre : quatre colonnes de chiffres qui roulent (et un « clic » tous les 10 m si le son est activé). */
function Gauge({ sound, onSound }: { sound: boolean; onSound: () => void }) {
  return (
    <div className="gauge">
      <p className="gauge-read" aria-hidden="true">
        <span className="gauge-digits">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="gauge-col" data-blank={i < 3 ? "true" : "false"}>
              {Array.from({ length: 10 }, (_, d) => <i key={d}>{d}</i>)}
            </span>
          ))}
        </span>
        <span className="gauge-unit">m</span>
        <span className="gauge-tick" />
      </p>
      <button type="button" className="gauge-sound" aria-pressed={sound} aria-label={sound ? "Couper le son des mètres" : "Entendre les mètres défiler"} onClick={onSound}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" />
          {sound ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
        </svg>
      </button>
    </div>
  );
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");
  const [signedIn, setSignedIn] = useState(false);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const [stickyCta, setStickyCta] = useState(false);
  const [draft, setDraft] = useState("");

  /* Déjà connecté : la barre propose d'ouvrir son espace. Sans cookie de session, on ne charge pas Supabase. */
  useEffect(() => {
    if (!hasAuthCookie()) return;
    import("@/lib/supabase/client")
      .then(({ createClient }) => createClient().auth.getSession())
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => {});
  }, []);

  /* Thème : sombre par défaut, le choix est retenu sur cet appareil (même clé que tout le site). */
  useEffect(() => {
    try {
      if (localStorage.getItem("ff-theme2") === "light") queueMicrotask(() => setTheme("light"));
    } catch {}
  }, []);
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("ff-theme2", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    } catch {}
  };

  const toggleSound = () => {
    const next = !sound;
    if (next && !enableDepthSound()) return;
    if (!next) disableDepthSound();
    soundRef.current = next;
    setSound(next);
  };

  /* Commencer depuis l'accueil : le texte collé suit jusqu'à « Générer » (même passage que depuis Apprendre). */
  const start = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (draft.trim()) sessionStorage.setItem("ff-prefill", draft.slice(0, 20000));
    } catch {}
    trackEvent("cta_click_hero", draft.trim() ? { with_text: true } : undefined);
    router.push("/generer");
  };

  /* ===== Tout ce qui suit le défilement, dans une seule petite boucle (seulement quand ça bouge) ===== */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const cols = Array.from(el.querySelectorAll<HTMLElement>(".gauge-col"));
    const tick = el.querySelector<HTMLElement>(".gauge-tick");
    const flowZone = el.querySelector<HTMLElement>(".flow-zone");
    const flowPath = el.querySelector<SVGPathElement>(".flow-line path.draw");
    const flowSvg = el.querySelector<SVGSVGElement>(".flow-line");
    const flowTip = el.querySelector<HTMLElement>(".flow-tip");
    const story = el.querySelector<HTMLElement>(".story-text");
    const words = story ? Array.from(story.querySelectorAll<HTMLElement>("span.w")) : [];
    const tilt = el.querySelector<HTMLElement>(".stage-tilt");

    let vh = 0, maxY = 1, flowTop = 0, flowH = 1, storyTop = 0, storyH = 1, total = 1;
    const measure = () => {
      vh = window.innerHeight;
      maxY = Math.max(1, document.documentElement.scrollHeight - vh);
      if (flowZone) { flowTop = flowZone.getBoundingClientRect().top + window.scrollY; flowH = flowZone.offsetHeight; }
      if (story) { storyTop = story.getBoundingClientRect().top + window.scrollY; storyH = story.offsetHeight; }
      if (flowPath) total = flowPath.getTotalLength();
    };
    measure();

    let raf = 0, shown = -1, lastTen = 0, lit = -1;
    const pointer = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const frame = () => {
      raf = 0;
      const y = window.scrollY;

      // Profondeur : de 0 m en haut à 1 000 m tout en bas de la page.
      const meters = Math.round((y / maxY) * 1000);
      if (meters !== shown) {
        shown = meters;
        const s = String(meters).padStart(4, " ");
        cols.forEach((c, i) => {
          c.dataset.blank = String(s[i] === " ");
          c.style.transform = `translate3d(0, ${s[i] === " " ? 0 : -Number(s[i]) * 10}%, 0)`;
        });
        const ten = Math.floor(meters / 10);
        if (ten !== lastTen) {
          lastTen = ten;
          tick?.animate([{ opacity: 1, transform: "scaleX(1)" }, { opacity: 0, transform: "scaleX(.2)" }], { duration: 260, easing: "ease-out" });
          if (soundRef.current) depthClick(meters);
        }
      }

      // Le fil « Flow » se dessine au fil de la descente ; une bulle brille au bout du trait.
      if (flowPath && flowSvg && !reduce) {
        const p = clamp((y + vh * 0.62 - flowTop) / flowH, 0, 1);
        flowPath.style.strokeDashoffset = String(1 - p);
        if (flowTip) {
          const pt = flowPath.getPointAtLength(total * p);
          const w = flowSvg.clientWidth, h = flowSvg.clientHeight;
          flowTip.style.transform = `translate3d(${((pt.x / 40) * w).toFixed(1)}px, ${((pt.y / 1000) * h).toFixed(1)}px, 0)`;
          flowTip.style.opacity = p > 0.01 && p < 0.995 ? "1" : "0";
        }
      }

      // L'histoire s'allume mot à mot.
      if (words.length && !reduce) {
        const p = clamp((y + vh * 0.78 - storyTop) / (storyH + vh * 0.3), 0, 1);
        const n = Math.round(p * words.length);
        if (n !== lit) {
          lit = n;
          words.forEach((w, i) => w.classList.toggle("on", i < n));
        }
      }

      // Ordinateur : la scène de l'accueil suit un peu la souris (relief).
      let moving = false;
      if (tilt && fine && !reduce) {
        cur.x = lerp(cur.x, pointer.x, 0.08);
        cur.y = lerp(cur.y, pointer.y, 0.08);
        tilt.style.transform = `rotateX(${(10 - cur.y * 6).toFixed(2)}deg) rotateY(${(-16 + cur.x * 10).toFixed(2)}deg)`;
        moving = Math.abs(cur.x - pointer.x) > 0.002 || Math.abs(cur.y - pointer.y) > 0.002;
      }
      if (moving) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
      kick();
    };

    // Les blocs apparaissent quand on arrive dessus (une seule fois).
    const reveals = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      el.classList.add("lp-js");
      io = new IntersectionObserver((es) => {
        for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io?.unobserve(e.target); }
      }, { rootMargin: "0px 0px -10% 0px" });
      reveals.forEach((r) => io!.observe(r));
    }
    // Les démos ne tournent que lorsqu'elles sont à l'écran.
    const scenes = new IntersectionObserver((es) => {
      for (const e of es) (e.target as HTMLElement).dataset.on = String(e.isIntersecting);
    }, { rootMargin: "60px 0px" });
    el.querySelectorAll("[data-scene]").forEach((s) => scenes.observe(s));

    // Bouton collant (téléphone) : après l'accueil, caché à la fin.
    const hero = el.querySelector(".hero"), end = el.querySelector(".final");
    const seen = { hero: true, end: false };
    const ctaIo = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.target === hero) seen.hero = e.isIntersecting;
        if (e.target === end) seen.end = e.isIntersecting;
      }
      setStickyCta(!seen.hero && !seen.end);
    });
    [hero, end].forEach((t) => t && ctaIo.observe(t));

    const onScroll = () => kick();
    const onResize = () => { measure(); kick(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.fonts?.ready.then(onResize);
    const late = window.setTimeout(onResize, 1200);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.clearTimeout(late);
      io?.disconnect();
      scenes.disconnect();
      ctaIo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const cta = (event: string, label: string, cls = "btn") =>
    signedIn ? (
      <Link href="/generer" className={cls}><span>Ouvrir FishFlow</span></Link>
    ) : (
      <TrackedLink href="/generer" event={event} className={cls}><span>{label}</span></TrackedLink>
    );

  return (
    <div className="lp" data-theme={theme} ref={root}>
      <a className="skip" href="#top">Aller au contenu</a>

      <div className="fx" aria-hidden="true">
        <TextureCanvas className="fx-rays" src="/ocean/rays.webp" />
        <TextureCanvas className="fx-caustic" src="/ocean/caustic-top.webp" tileW={560} />
      </div>

      <div className="bubbles" aria-hidden="true">
        {BUBBLE_BANDS.map((b, k) => (
          <div key={k} className="bubbles-band" style={{ top: b.top }}>
            {b.items.map((it, i) => <i key={i} style={{ "--x": it.x, "--s": it.s, "--d": it.d, "--delay": it.delay, "--drift": it.drift } as CSSProperties} />)}
          </div>
        ))}
      </div>

      <header className="bar">
        <Link className="brand" href="/" aria-label="FishFlow, accueil">
          <BrandMark size={36} />
          <span>Fish<em>Flow</em></span>
        </Link>
        <Gauge sound={sound} onSound={toggleSound} />
        <nav className="bar-nav" aria-label="Sur cette page">
          <a href="#comment">Comment ça marche</a>
          <a href="#prix">Prix</a>
        </nav>
        <div className="bar-actions">
          {signedIn ? (
            <Link href="/generer" className="btn bar-open"><span>Ouvrir FishFlow</span></Link>
          ) : (
            <>
              <Link className="bar-link" href="/login">Connexion</Link>
              <TrackedLink href="/signup" event="cta_click_header_signup" className="btn bar-cta"><span>Créer un compte</span></TrackedLink>
            </>
          )}
          <button type="button" className="round" onClick={toggleTheme} aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              {theme === "dark" ? (
                <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
              ) : (
                <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <main id="top">
        {/* ===== Accueil ===== */}
        <section className="hero" aria-labelledby="t-hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1 id="t-hero">Révise en profondeur.</h1>
              <p className="lead">Colle ton cours, envoie un PDF ou prends une photo. FishFlow en fait une fiche, des flashcards et un quiz, en quelques secondes.</p>
              <form className="start" onSubmit={start}>
                <label htmlFor="lp-cours" className="sr-only">Colle ton cours</label>
                <textarea id="lp-cours" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Colle ton cours ici…" enterKeyHint="go" />
                <button className="btn"><span>{signedIn ? "Créer ma fiche" : "Créer ma première fiche"}</span></button>
              </form>
              <p className="note">3 fiches gratuites par mois, sans carte bancaire.</p>
            </div>
            <HeroStage />
          </div>
        </section>

        {/* Toutes les matières */}
        <div className="marquee" aria-label="Pour toutes les matières">
          <div className="marquee-track" aria-hidden="true">
            {[...SUBJECTS, ...SUBJECTS].map((s, i) => <span key={i}>{s}</span>)}
          </div>
          <p className="sr-only">Pour toutes les matières : {SUBJECTS.join(", ")}.</p>
        </div>

        <div className="flow-zone">
          <svg className="flow-line" viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true">
            <path className="ghost" d="M20 0C38 70 2 150 20 230S38 390 20 470 2 630 20 710 38 870 20 1000" pathLength={1} />
            <path className="draw" d="M20 0C38 70 2 150 20 230S38 390 20 470 2 630 20 710 38 870 20 1000" pathLength={1} />
          </svg>
          <i className="flow-tip" aria-hidden="true" />

          {/* ===== L'histoire ===== */}
          <section className="story" aria-labelledby="t-story">
            <div className="wrap">
              <h2 id="t-story" className="sr-only">Pourquoi FishFlow</h2>
              <p className="story-text">
                {STORY.split(" ").map((w, i) => <span key={i} className="w">{w} </span>)}
                <span className="w end">{STORY_END}</span>
              </p>
            </div>
          </section>

          {/* ===== Trois gestes ===== */}
          <section className="steps" id="comment" aria-labelledby="t-steps">
            <div className="wrap">
              <h2 id="t-steps" data-reveal>Trois gestes, moins d&apos;une minute.</h2>
              <ol className="steps-grid">
                <li data-reveal style={{ "--i": 0 } as CSSProperties}><StepPaste /><h3><span>1</span>Colle ton cours</h3><p>Un texte, un PDF ou une photo de tes notes.</p></li>
                <li data-reveal style={{ "--i": 1 } as CSSProperties}><StepRead /><h3><span>2</span>FishFlow le lit</h3><p>Il repère les idées importantes de ton cours.</p></li>
                <li data-reveal style={{ "--i": 2 } as CSSProperties}><StepReady /><h3><span>3</span>Tout est prêt</h3><p>Ta fiche, tes flashcards et ton quiz t&apos;attendent.</p></li>
              </ol>
            </div>
          </section>

          {/* ===== Ce que tu reçois ===== */}
          <section className="features" aria-label="Ce que tu reçois">
            {FEATURES.map(({ id, title, text, Show }, i) => (
              <article key={id} className={`feature${i % 2 ? " flip" : ""}`} aria-labelledby={`t-${id}`}>
                <div className="wrap feature-grid">
                  <div className="feature-copy" data-reveal>
                    <h2 id={`t-${id}`}>{title}</h2>
                    <p>{text}</p>
                  </div>
                  <div className="feature-show" data-reveal="rise">
                    <Show />
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>

        {/* ===== Prix ===== */}
        <section className="price" aria-labelledby="t-price" id="prix">
          <div className="wrap">
            <h2 id="t-price" data-reveal>Gratuit ou Pro&nbsp;: qu&apos;est-ce qui change&nbsp;?</h2>
            <p className="sub" data-reveal>Le compte gratuit suffit pour essayer. Pro, c&apos;est pour réviser souvent&nbsp;: beaucoup plus de fiches et quelques outils en plus.</p>
            <div className="plans">
              <article className="plan" data-reveal>
                <h3>Gratuit</h3>
                <p className="amount">0 €</p>
                <ul className="dots">{FREE.map((x) => <li key={x}>{x}</li>)}</ul>
                {cta("cta_click_offer_free", "Créer ma fiche gratuitement", "btn ghost")}
              </article>
              <article className="plan pro" data-reveal style={{ "--i": 1 } as CSSProperties}>
                <h3>Pro</h3>
                <p className="amount">4,99 € <small>par mois</small></p>
                <ul className="dots">{PRO.map((x) => <li key={x}>{x}</li>)}</ul>
                <TrackedLink href="/pricing" event="cta_click_offer_premium" className="btn"><span>Voir Pro</span></TrackedLink>
                <p className="plan-note">Tu arrêtes quand tu veux, en un clic.</p>
              </article>
            </div>
            <details className="cmp-details" data-reveal>
              <summary>Voir le détail complet</summary>
              <div className="cmp-wrap" tabIndex={0} role="region" aria-label="Comparaison Gratuit et Pro">
                <table className="cmp">
                  <thead>
                    <tr><th scope="col"><span className="sr-only">Fonctionnalité</span></th><th scope="col">Gratuit</th><th scope="col" className="pro">Pro</th></tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">Prix</th><td data-label="Gratuit">0 €</td><td data-label="Pro" className="pro">4,99 € par mois, tu arrêtes quand tu veux</td></tr>
                    <tr><th scope="row">Fiches créées</th><td data-label="Gratuit">3 par mois</td><td data-label="Pro" className="pro">100 par mois (10 par jour)</td></tr>
                    <tr><th scope="row">Fiche, essentiel, flashcards</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                    <tr><th scope="row">Quiz</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui, avec 12 questions</td></tr>
                    <tr><th scope="row">Réviser avec rappels</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                    <tr><th scope="row">Apprendre (poser une question)</th><td data-label="Gratuit">1 question pour essayer</td><td data-label="Pro" className="pro">20 questions par jour</td></tr>
                    <tr><th scope="row">Taille d&apos;un cours</th><td data-label="Gratuit">Jusqu&apos;à 7 pages environ</td><td data-label="Pro" className="pro">Jusqu&apos;à 15 pages environ, plusieurs PDF dans une seule fiche</td></tr>
                    <tr><th scope="row">Objectif du jour et série</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                    <tr><th scope="row">3 façons d&apos;afficher ta fiche</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                    <tr><th scope="row">Progression</th><td data-label="Gratuit">Les 7 derniers jours</td><td data-label="Pro" className="pro">30 jours, ton taux de réussite et tes cartes difficiles</td></tr>
                    <tr><th scope="row">L&apos;essentiel lu à voix haute</th><td data-label="Gratuit">Non</td><td data-label="Pro" className="pro">Oui</td></tr>
                    <tr><th scope="row">Fiches gardées</th><td data-label="Gratuit">Les 5 dernières</td><td data-label="Pro" className="pro">Toutes tes fiches gardées</td></tr>
                  </tbody>
                </table>
              </div>
            </details>
            <p className="cmp-note">Paiement sécurisé par Stripe. Tes fiches restent privées.</p>
          </div>
        </section>

        {/* ===== Questions ===== */}
        <section className="faq-sec" aria-labelledby="t-faq">
          <div className="wrap">
            <h2 id="t-faq" data-reveal>Questions fréquentes.</h2>
            <div className="faq" data-reveal>
              <details><summary>Comment ça marche, concrètement&nbsp;?</summary><p>Tu crées ton compte gratuit. Tu colles ton cours (ou tu envoies un PDF, ou une photo de tes notes) et tu appuies sur «&nbsp;Créer ma fiche&nbsp;». Moins d&apos;une minute plus tard, tu as ta fiche, tes flashcards et ton quiz. Ensuite, FishFlow te dit chaque jour quelles cartes revoir.</p></details>
              <details><summary>C&apos;est pour qui&nbsp;?</summary><p>Pour toute personne qui a un cours à apprendre&nbsp;: collège, lycée, études supérieures, concours, formation. Il te faut juste ton cours, en texte, en PDF ou en photo.</p></details>
              <details><summary>C&apos;est gratuit&nbsp;?</summary><p>Oui pour commencer&nbsp;: 3 fiches par mois et un essai d&apos;Apprendre, sans carte bancaire. Avec Pro, tu peux créer jusqu&apos;à 100 fiches par mois.</p></details>
              <details><summary>Je peux arrêter Pro quand je veux&nbsp;?</summary><p>Oui, en un clic dans Paramètres. Tu gardes Pro jusqu&apos;à la fin du mois déjà payé.</p></details>
              <details><summary>Les réponses sont-elles vraies&nbsp;?</summary><p>Pour les fiches, elles viennent de ton propre cours. Pour les questions d&apos;Apprendre, c&apos;est une IA qui répond&nbsp;: elle peut se tromper, donc pour un détail important, vérifie dans les liens proposés ou dans ton cours.</p></details>
            </div>
          </div>
        </section>

        {/* ===== Le fond : la fin de la plongée ===== */}
        <section className="final" aria-labelledby="t-end">
          <TextureCanvas className="final-caustic" src="/ocean/caustic-top.webp" tileW={560} />
          <div className="wrap final-in" data-reveal>
            <BrandMark size={72} className="final-mark" />
            <h2 id="t-end">Plonge avec ton prochain cours.</h2>
            <p>Ton prochain cours devient une fiche en moins d&apos;une minute.</p>
            <div className="cta-row">{cta("cta_click_final", "Ouvrir FishFlow gratuitement", "btn btn-xl")}</div>
            <p className="note">Sans carte bancaire. 3 fiches gratuites par mois.</p>
          </div>
        </section>
      </main>

      <div className="sticky-cta" data-show={stickyCta} aria-hidden={!stickyCta}>
        {signedIn ? (
          <Link href="/generer" className="btn" tabIndex={stickyCta ? undefined : -1}><span>Ouvrir FishFlow</span></Link>
        ) : (
          <TrackedLink href="/generer" event="cta_click_sticky" className="btn" tabIndex={stickyCta ? undefined : -1}><span>Créer ma fiche gratuitement</span></TrackedLink>
        )}
      </div>

      <footer>
        <div className="wrap">
          <p>© {new Date().getFullYear()} FishFlow, projet créé par un étudiant en MMI.</p>
          <div className="links">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/cgu">CGU</Link>
            <Link href="/confidentialite">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
