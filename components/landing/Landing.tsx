"use client";

import { Ocean, WaveDivider } from "@/components/Ocean";
import { RaieImg } from "@/components/Logo";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import { createClient } from "@/lib/supabase/client";
import { createOrb, type OrbHandle } from "./orb-gl";

type Theme = "dark" | "light";

/* ---------- Contenu ---------- */

const STEPS = [
  { label: "1. Tu colles ton cours", caption: "Tu colles ton cours, ou tu envoies un PDF ou une photo." },
  { label: "2. FishFlow le lit", caption: "FishFlow lit le texte et repère les idées importantes : elles s'allument." },
  { label: "3. La fiche s'écrit", caption: "Il écrit la fiche : l'essentiel, en phrases courtes." },
  { label: "4. Tu retiens", caption: "Il crée aussi les flashcards et le quiz, pour que tu retiennes." },
];

type DemoKey = "sky" | "hole";
type ArtKey = "sky" | "wave" | "sun" | "hole" | "star" | "ring";

const DEMO: Record<DemoKey, { q: string; title: string; text: string; src: { label: string; url: string }[]; pics: ArtKey[] }> = {
  sky: {
    q: "Pourquoi le ciel est bleu",
    title: "La lumière bleue est la plus dispersée",
    text: "La lumière du Soleil contient toutes les couleurs. En traversant l'atmosphère, la lumière bleue, de petite longueur d'onde, est dispersée par les molécules d'air bien plus que le rouge. Elle nous arrive de toutes les directions : c'est la diffusion de Rayleigh.",
    src: [
      { label: "Wikipédia · Diffusion de Rayleigh", url: "https://fr.wikipedia.org/wiki/Diffusion_Rayleigh" },
      { label: "Futura Sciences", url: "https://www.futura-sciences.com/" },
    ],
    pics: ["sky", "wave", "sun"],
  },
  hole: {
    q: "Comment fonctionne un trou noir",
    title: "Une gravité dont rien ne s'échappe",
    text: "Un trou noir est une région où la gravité est si forte que rien, pas même la lumière, ne peut en sortir une fois passé l'horizon des événements. Beaucoup naissent de l'effondrement d'une étoile très massive en fin de vie.",
    src: [
      { label: "Wikipédia · Trou noir", url: "https://fr.wikipedia.org/wiki/Trou_noir" },
      { label: "NASA", url: "https://www.nasa.gov/" },
    ],
    pics: ["hole", "star", "ring"],
  },
};

const CAPTIONS: Record<ArtKey, string> = { sky: "Ciel", wave: "Ondes", sun: "Soleil", hole: "Horizon", star: "Étoile", ring: "Disque" };

const CARDS: [string, string][] = [
  ["Pourquoi le ciel est bleu ?", "L'atmosphère disperse plus la lumière bleue que les autres couleurs."],
  ["Que devient la lumière à l'horizon d'un trou noir ?", "Elle ne peut plus en sortir."],
  ["Où se fait la photosynthèse ?", "Dans les chloroplastes des cellules des feuilles."],
];


function Art({ k }: { k: ArtKey }) {
  const inner: Record<ArtKey, React.ReactNode> = {
    sky: (
      <>
        <defs>
          <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b2a6b" />
            <stop offset=".65" stopColor="#9fb4d6" />
            <stop offset="1" stopColor="#f2d2b0" />
          </linearGradient>
        </defs>
        <rect width="300" height="400" fill="url(#lp-sky)" />
        <circle cx="220" cy="305" r="34" fill="#fff4d6" />
      </>
    ),
    wave: (
      <>
        <rect width="300" height="400" fill="#0f1320" />
        <path d="M0 220 C40 160 80 280 120 220 S200 160 240 220 300 280 300 220" stroke="#8fa3ff" strokeWidth="6" fill="none" />
        <path d="M0 270 C20 240 40 300 60 270 S100 240 120 270 160 300 180 270 220 240 240 270 280 300 300 270" stroke="#d7dde8" strokeWidth="5" fill="none" />
        <path d="M0 320 C10 306 20 334 30 320 S50 306 60 320 80 334 90 320 110 306 120 320 140 334 150 320 170 306 180 320 200 334 210 320 230 306 240 320 260 334 270 320 290 306 300 320" stroke="var(--ff-accent)" strokeWidth="4" fill="none" />
      </>
    ),
    sun: (
      <>
        <rect width="300" height="400" fill="#d9c9b0" />
        <circle cx="150" cy="200" r="70" fill="#fff4d6" />
        <circle cx="150" cy="200" r="110" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
        <circle cx="150" cy="200" r="150" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="3" />
      </>
    ),
    hole: (
      <>
        <rect width="300" height="400" fill="#07080b" />
        <ellipse cx="150" cy="200" rx="130" ry="34" fill="none" stroke="#e8ebef" strokeWidth="10" opacity=".9" />
        <ellipse cx="150" cy="200" rx="104" ry="24" fill="none" stroke="var(--ff-accent)" strokeWidth="6" opacity=".8" />
        <circle cx="150" cy="200" r="52" fill="#000" />
      </>
    ),
    star: (
      <>
        <rect width="300" height="400" fill="#0d1230" />
        <circle cx="150" cy="200" r="46" fill="#ffd9a8" />
        <circle cx="150" cy="200" r="78" fill="none" stroke="#ffd9a8" strokeOpacity=".4" strokeWidth="3" />
        <circle cx="60" cy="70" r="2" fill="#fff" />
        <circle cx="240" cy="110" r="2" fill="#fff" />
        <circle cx="90" cy="330" r="2" fill="#fff" />
        <circle cx="250" cy="320" r="2" fill="#fff" />
      </>
    ),
    ring: (
      <>
        <rect width="300" height="400" fill="#1a1d24" />
        <circle cx="150" cy="200" r="40" fill="#000" />
        <circle cx="150" cy="200" r="70" fill="none" stroke="#e8ebef" strokeWidth="4" />
        <circle cx="150" cy="200" r="100" fill="none" stroke="#e8ebef" strokeOpacity=".5" strokeWidth="3" />
        <circle cx="150" cy="200" r="130" fill="none" stroke="#e8ebef" strokeOpacity=".25" strokeWidth="2" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {inner[k]}
    </svg>
  );
}

// Un chiffre qui « compte » jusqu'à sa valeur quand il arrive à l'écran (affiché directement si on demande moins d'animations).
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    queueMicrotask(() => setN(0));
    let raf = 0;
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 900);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

function BrandMark() {
  // Même logo que dans l'application (components/Logo.tsx) : la raie manta.
  return <RaieImg small width={44} height={36} />;
}

/* ---------- Page ---------- */

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<OrbHandle | null>(null);
  const reduceRef = useRef(false);
  // Pas de 3D (téléphone ancien, 3D perdue) : une boule dessinée en CSS prend sa place dans la démo.
  const [orbFallback, setOrbFallback] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");
  // Déjà connecté : la barre propose d'ouvrir son espace au lieu de « Connexion / Créer un compte ».
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => {});
  }, []);

  const kick = useCallback((a: number) => orbRef.current?.kick(a), []);

  /* Thème : sombre par défaut, le choix est retenu sur cet appareil. */
  useEffect(() => {
    try {
      // Même choix que sur tout le site : « light » seulement si la personne l'a demandé.
      if (localStorage.getItem("ff-theme2") === "light") queueMicrotask(() => setTheme("light"));
    } catch {}
  }, []);
  useEffect(() => {
    orbRef.current?.setDark(theme === "dark");
  }, [theme]);
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("ff-theme2", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    } catch {}
  };

  /* La boule */
  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fallBack = () => {
      canvas.style.display = "none";
      setOrbFallback(true);
    };
    const orb = createOrb(
      canvas,
      () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-slot]") ?? []),
      reduceRef.current,
      fallBack
    );
    if (!orb) {
      queueMicrotask(fallBack);
      return;
    }
    orbRef.current = orb;
    orb.setDark(theme === "dark");
    const onDown = () => orb.kick(0.3);
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      orb.destroy();
      orbRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /* Fiche d'exemple du haut : elle se remplit toute seule, en boucle (résumé, points, flashcard, quiz). */
  const HERO_STEPS = 10;
  const [heroStep, setHeroStep] = useState(HERO_STEPS - 1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    queueMicrotask(() => setHeroStep(0));
    const id = window.setInterval(() => {
      if (document.hidden) return;
      n = (n + 1) % HERO_STEPS;
      setHeroStep(n);
    }, 1100);
    return () => clearInterval(id);
  }, []);
  const at = (k: number) => `fd-step${heroStep >= k ? " on" : ""}`;

  /* Apparition douce des blocs quand on fait défiler la page (téléphone et ordinateur, rien à toucher). */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("main section:not(.hero) .wrap > *"));
    els.forEach((el) => {
      const i = Array.from(el.parentElement?.children ?? []).indexOf(el);
      el.classList.add("rv");
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("rv-in");
            io.unobserve(en.target);
          }
        }
      },
      // Se déclenche un peu AVANT que le bloc n'arrive à l'écran : il est déjà visible quand on y arrive.
      { threshold: 0, rootMargin: "0px 0px 10% 0px" }
    );
    els.forEach((el) => io.observe(el));
    // Filet de sécurité : au défilement, tout bloc déjà à l'écran apparaît (jamais de bloc qui reste invisible).
    const check = () => {
      for (const el of els) {
        if (el.classList.contains("rv-in")) continue;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1 && r.bottom > 0) el.classList.add("rv-in");
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    const first = window.setTimeout(check, 400);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", check);
      clearTimeout(first);
    };
  }, []);

  /* La fiche, étape par étape : les étapes avancent avec le défilement de la page (rien à toucher).
     Si la personne demande moins d'animations, la section reste normale et on choisit l'étape avec les boutons. */
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [scrolly, setScrolly] = useState(false);
  useEffect(() => {
    kick(0.45);
  }, [step, kick]);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) queueMicrotask(() => setScrolly(true));
    let raf = 0;
    const update = () => {
      raf = 0;
      // Barre de progression de la page, en haut de l'écran.
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
      // Étape de la fabrication d'une fiche, selon la position dans la section.
      const el = trackRef.current;
      if (reduce || !el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / total));
      setStep(Math.min(3, Math.floor(p * 4)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  // Cliquer sur une étape : en mode « défilement », on fait défiler jusqu'à elle.
  const goStep = (n: number) => {
    const el = trackRef.current;
    if (!scrolly || !el) return setStep(n);
    const top = el.getBoundingClientRect().top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((n + 0.5) / 4) * total, behavior: "smooth" });
  };

  /* Barre d'action collante (téléphone) : visible après l'accueil, cachée à la fin où le gros bouton est déjà là. */
  const [stickyCta, setStickyCta] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const hero = rootRef.current?.querySelector(".hero");
    const end = rootRef.current?.querySelector(".final");
    if (!hero || !end) return;
    const seen = { hero: true, end: false };
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.target === hero) seen.hero = e.isIntersecting;
        if (e.target === end) seen.end = e.isIntersecting;
      }
      setStickyCta(!seen.hero && !seen.end);
    });
    io.observe(hero);
    io.observe(end);
    return () => io.disconnect();
  }, []);

  /* Démo Apprendre : la boule « réfléchit », puis rejette ses images */
  const [demoKey, setDemoKey] = useState<DemoKey | null>(null);
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState(false);
  const [phase, setPhase] = useState<"idle" | "typing" | "thinking" | "done">("idle");
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);
  const picRefs = useRef<(HTMLElement | null)[]>([]);
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const run = (key: DemoKey) => {
    if (phase === "typing" || phase === "thinking") return;
    clearTimers();
    const d = DEMO[key];
    const reduce = reduceRef.current;
    setNotice(false);
    setDemoKey(null);
    setShown(0);
    setPhase("typing");
    setQ("");
    let i = 0;
    const type = () => {
      i += 1;
      setQ(d.q.slice(0, i));
      if (i < d.q.length) {
        later(type, reduce ? 0 : 28);
      } else {
        setPhase("thinking");
        orbRef.current?.think(true);
        later(() => {
          orbRef.current?.think(false);
          kick(1);
          setDemoKey(key);
          setPhase("done");
        }, reduce ? 0 : 1100);
      }
    };
    type();
  };

  // Quand la réponse arrive : les images sortent de la boule, une par une.
  useEffect(() => {
    if (phase !== "done" || !demoKey) return;
    const reduce = reduceRef.current;
    const orbSlot = rootRef.current?.querySelector<HTMLElement>('[data-slot="demo"]');
    const o = orbSlot?.getBoundingClientRect();
    picRefs.current.forEach((el, n) => {
      if (!el || !o || reduce || !el.animate) return;
      const r = el.getBoundingClientRect();
      const dx = o.left + o.width / 2 - (r.left + r.width / 2);
      const dy = o.top + o.height / 2 - (r.top + r.height / 2);
      el.animate(
        [
          { transform: `translate(${dx}px,${dy}px) scale(.12) rotate(${(n - 1) * 28}deg)`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 1100, delay: 150 + n * 260, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }
      );
      later(() => kick(0.7), 150 + n * 260);
    });
    // Le texte s'écrit pendant que les images sortent.
    const full = DEMO[demoKey].text.length;
    if (reduce) {
      setShown(full);
      return;
    }
    let s = 0;
    const id = window.setInterval(() => {
      s = Math.min(full, s + 3);
      setShown(s);
      if (s >= full) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, demoKey]);

  const onAsk = (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.toLowerCase();
    if (/trou|noir/.test(text)) run("hole");
    else if (/ciel|bleu/.test(text)) run("sky");
    else setNotice(true);
  };


  /* Les deux démos tournent toutes seules quand elles sont à l'écran. Un geste de la personne les arrête. */
  const [cardsInView, setCardsInView] = useState(false);
  const [askInView, setAskInView] = useState(false);
  const [cardsManual, setCardsManual] = useState(false);
  const [askManual, setAskManual] = useState(false);
  // Un geste met la démo en pause ; sans nouveau geste, elle reprend toute seule (9 s pour les cartes, 15 s pour la question).
  const cardsTouch = useRef(0);
  const askTouch = useRef(0);
  const touchCards = () => {
    cardsTouch.current = Date.now();
    setCardsManual(true);
  };
  const touchAsk = () => {
    askTouch.current = Date.now();
    setAskManual(true);
  };
  useEffect(() => {
    if (!cardsManual && !askManual) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (cardsManual && now - cardsTouch.current > 9000) setCardsManual(false);
      if (askManual && now - askTouch.current > 15000) setAskManual(false);
    }, 1500);
    return () => clearInterval(id);
  }, [cardsManual, askManual]);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const watch = (id: string, set: (v: boolean) => void) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const io = new IntersectionObserver((es) => set(es[0].isIntersecting), { threshold: 0.35 });
      io.observe(el);
      return io;
    };
    const a = watch("retenir", setCardsInView);
    const b = watch("apprendre", setAskInView);
    return () => { a?.disconnect(); b?.disconnect(); };
  }, []);

  /* Flashcards */
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState<null | "l" | "r">(null);
  const [streak, setStreak] = useState(4);
  const [rx, setRx] = useState(0);
  const [ry, setRy] = useState(0);
  const knownBtn = useRef<HTMLButtonElement>(null);
  const card = CARDS[cardIdx % CARDS.length];

  const sparks = (btn: HTMLElement | null) => {
    if (!btn || reduceRef.current) return;
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("i");
      s.setAttribute("aria-hidden", "true");
      s.style.cssText = `position:fixed;width:8px;height:8px;border-radius:50%;background:var(--hot, #38bdf8);pointer-events:none;z-index:40;left:${x}px;top:${y}px`;
      document.body.appendChild(s);
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4, dd = 40 + Math.random() * 60;
      const anim = s.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${Math.cos(a) * dd}px,${Math.sin(a) * dd - 20}px) scale(.2)`, opacity: 0 },
        ],
        { duration: 700, easing: "cubic-bezier(.16,1,.3,1)" }
      );
      anim.onfinish = () => s.remove();
    }
  };
  const answerCard = (known: boolean) => {
    if (leaving) return;
    setLeaving(known ? "r" : "l");
    if (known) {
      setStreak((n) => n + 1);
      sparks(knownBtn.current);
    }
    kick(known ? 0.8 : 0.3);
    later(() => {
      setCardIdx((n) => n + 1);
      setFlipped(false);
      setLeaving(null);
    }, 520);
  };

  /* Cartes : la carte se retourne, puis elle est notée, puis la suivante arrive */
  useEffect(() => {
    if (!cardsInView || cardsManual || leaving) return;
    const id = window.setTimeout(
      () => {
        if (!flipped) setFlipped(true);
        else answerCard(cardIdx % 3 !== 1);
      },
      flipped ? 2200 : 2000
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsInView, cardsManual, flipped, leaving, cardIdx]);

  /* Question : les deux exemples s'enchaînent */
  const autoKey = useRef(0);
  useEffect(() => {
    if (!askInView || askManual || phase === "typing" || phase === "thinking") return;
    const id = window.setTimeout(
      () => {
        const k: DemoKey = autoKey.current % 2 === 0 ? "sky" : "hole";
        autoKey.current += 1;
        run(k);
      },
      phase === "done" ? 7000 : 900
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askInView, askManual, phase]);

  const answer = demoKey ? DEMO[demoKey] : null;

  return (
    <div className="lp" data-theme={theme} ref={rootRef}>
      <a className="skip" href="#top">Aller au contenu</a>
      <div className="lp-progress" aria-hidden="true"><i ref={progressRef} /></div>
      <canvas id="orb" ref={canvasRef} aria-hidden="true" />

      <header className="bar">
        <Link className="brand" href="/" aria-label="FishFlow, accueil">
          <BrandMark />
          <span>Fish<em>Flow</em></span>
        </Link>
        <div className="bar-actions">
          {signedIn ? (
            <Link href="/generer" className="btn bar-open">
              <span>Ouvrir FishFlow</span>
            </Link>
          ) : (
            <>
              <Link className="bar-link" href="/login">Connexion</Link>
              <TrackedLink href="/signup" event="cta_click_header_signup" className="btn bar-cta">
                <span>Créer un compte</span>
              </TrackedLink>
            </>
          )}
          <button
            type="button"
            className="round theme"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {theme === "dark" ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              ) : (
                <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <Ocean />
      <main id="top">
        {/* Accueil */}
        <section className="hero" aria-label="Accueil">
          <div className="copy">
            <p className="eyebrow">Le savoir est une force.</p>
            <h1 className="h-xl h-hero">Ton cours devient une fiche de révision.</h1>
            <p className="lead">
              Colle ton cours, envoie un PDF ou prends une photo. FishFlow en fait une fiche, des flashcards et un quiz, en quelques secondes.
            </p>
            <div className="cta-row">
              {signedIn ? (
                <Link href="/generer" className="btn">
                  <span>Ouvrir FishFlow</span>
                </Link>
              ) : (
                <TrackedLink href="/generer" event="cta_click_hero" className="btn">
                  <span>Essayer gratuitement</span>
                </TrackedLink>
              )}
              <a className="btn ghost" href="#quoi">
                <span>Comment ça marche</span>
              </a>
            </div>
            <p className="note">3 fiches gratuites par mois, sans carte bancaire.</p>
            <ul className="for" aria-label="Pour qui">
              {["Collège", "Lycée", "Fac", "Concours", "Code de la route", "Langues"].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="fd">
            <p className="fd-tag">Exemple généré à partir d&apos;un cours sur la photosynthèse</p>
            <article className="fd-card" aria-label="Exemple de fiche générée">
              <div className="fd-head"><strong>Photosynthèse</strong><span>Fiche de révision</span></div>
              <div>
                <p className="fd-h">Résumé</p>
                <p className={at(1)}>La photosynthèse est le processus par lequel les plantes transforment la lumière du soleil en énergie chimique, en produisant du glucose et de l&apos;oxygène.</p>
              </div>
              <div>
                <p className="fd-h">Points clés</p>
                <ul>
                  <li className={at(2)}>Se déroule dans les chloroplastes</li>
                  <li className={at(3)}>Demande de la lumière, de l&apos;eau et du CO₂</li>
                  <li className={at(4)}>Produit du glucose et libère de l&apos;oxygène</li>
                </ul>
              </div>
              <div className="fd-row">
                <div className="fd-mini">
                  <p className="fd-h">Flashcard</p>
                  <p><strong>Où se fait la photosynthèse ?</strong></p>
                  <p className={`fd-a ${at(5)}`}>Dans les chloroplastes.</p>
                </div>
                <div className="fd-mini">
                  <p className="fd-h">Quiz</p>
                  <p><strong>Que libère la plante ?</strong></p>
                  <p className="fd-opt">Du CO₂</p>
                  <p className={`fd-opt${heroStep >= 6 ? " ok" : ""}`}>De l&apos;oxygène</p>
                </div>
              </div>
            </article>
          </div>
        </section>
        <WaveDivider />

        {/* C'est quoi */}
        <section id="quoi" aria-labelledby="t-q">
          <div className="wrap">
            <h2 id="t-q">Relire son cours ne suffit pas.</h2>
            <p className="sub">FishFlow t&apos;aide à comprendre, puis à ne plus oublier. Le cœur du site : tes fiches de révision.</p>
            <div className="tools">
              <article className="tool main">
                <p className="badge">L&apos;outil principal</p>
                <h3>Créer des fiches</h3>
                <dl>
                  <div><dt>Tu donnes</dt><dd>Un cours collé, un PDF ou une photo.</dd></div>
                  <div><dt>Tu reçois</dt><dd>Une fiche claire, l&apos;essentiel en 5 lignes, des flashcards et un quiz.</dd></div>
                </dl>
              </article>
              <article className="tool">
                <h3>Poser une question</h3>
                <dl>
                  <div><dt>Tu donnes</dt><dd>Une question, sur n&apos;importe quel sujet.</dd></div>
                  <div><dt>Tu reçois</dt><dd>Une réponse claire et bien expliquée, des images libres de droits et des liens pour aller plus loin.</dd></div>
                </dl>
              </article>
              <article className="tool">
                <h3>Réviser</h3>
                <dl>
                  <div><dt>Tu donnes</dt><dd>Quelques minutes par jour.</dd></div>
                  <div><dt>Tu reçois</dt><dd>Des cartes qui reviennent au bon moment : vite si tu les rates, plus tard si tu les sais.</dd></div>
                </dl>
              </article>
            </div>
            <ul className="stats" aria-label="FishFlow en chiffres">
              <li><strong><CountUp to={4} /></strong><span>outils d&apos;un coup : fiche, essentiel, flashcards, quiz</span></li>
              <li><strong>&lt; <CountUp to={1} suffix=" min" /></strong><span>pour transformer un cours en fiche</span></li>
              <li><strong><CountUp to={3} /></strong><span>fiches gratuites chaque mois, sans carte bancaire</span></li>
            </ul>
          </div>
        </section>

        {/* Fabrication d'une fiche */}
        <section id="fiche" aria-labelledby="t-f" className={scrolly ? "scrolly-on" : undefined}>
          <div className="scrolly-track" ref={trackRef}>
          <div className="wrap scrolly-sticky">
            <h2 id="t-f">Comment une fiche est fabriquée.</h2>
            <p className="sub">{scrolly ? "Fais défiler : les quatre étapes avancent toutes seules." : "Choisis une étape pour la voir."}</p>
            <div className="fab">
              <div className="steps" role="group" aria-label="Étapes">
                {STEPS.map((s, n) => (
                  <button
                    key={s.label}
                    type="button"
                    className={`step${n < step ? " done" : ""}`}
                    aria-current={n === step ? "true" : "false"}
                    style={{ ["--dur" as string]: "400ms" }}
                    onClick={() => goStep(n)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className={`stage s${step + 1}`} ref={stageRef}>
                <div className="doc">
                  <div className="beam" />
                  <p className="type">
                    La photosynthèse est le processus par lequel les plantes fabriquent leur énergie. Elle se déroule dans les <mark>chloroplastes</mark> des cellules des feuilles. Grâce à la lumière, la plante transforme l&apos;eau et le dioxyde de carbone en <mark>glucose</mark>, et elle <mark>libère de l&apos;oxygène</mark> dans l&apos;air.
                  </p>
                </div>
                <div className="sheet">
                  <h3>Photosynthèse</h3>
                  <ul>
                    <li>Se passe dans les chloroplastes</li>
                    <li>Produit du glucose</li>
                    <li>Libère de l&apos;oxygène</li>
                  </ul>
                  <div className="tags">
                    <span>3 flashcards</span>
                    <span>Quiz</span>
                    <span>Résumé</span>
                  </div>
                </div>
              </div>
              <div className="cap-row">
                <p className="cap" aria-live="polite">{STEPS[step].caption}</p>
              </div>
            </div>
          </div>
          </div>
        </section>
        <WaveDivider flip />

        {/* Réviser */}
        <section id="retenir" aria-labelledby="t-r">
          <div className="wrap">
            <h2 id="t-r">Retiens-le pour de bon.</h2>
            <p className="sub">Les cartes se retournent toutes seules, tu peux aussi les toucher. Une carte que tu savais revient plus tard, une carte ratée revient plus vite.</p>
            <div className="gestures">
              <article className="card">
                <div className="deck">
                  <button
                    key={cardIdx}
                    type="button"
                    className={`fc${leaving ? ` gone-${leaving}` : ""}`}
                    aria-label={flipped ? "Revoir la question" : "Retourner la carte"}
                    style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateY(${flipped ? 180 : 0}deg)` }}
                    onClick={() => { touchCards(); setFlipped((f) => !f); kick(0.25); }}
                    onPointerMove={(e) => {
                      if (reduceRef.current || e.pointerType !== "mouse") return;
                      const r = e.currentTarget.getBoundingClientRect();
                      setRy(((e.clientX - r.left) / r.width - 0.5) * 12);
                      setRx(-((e.clientY - r.top) / r.height - 0.5) * 10);
                    }}
                    onPointerLeave={() => { setRx(0); setRy(0); }}
                  >
                    <span className="face front"><small>Question</small><span>{card[0]}</span><small>Touche pour voir la réponse</small></span>
                    <span className="face back"><small>Réponse</small><span>{card[1]}</span><small>Tu la savais ?</small></span>
                  </button>
                </div>
                <div className="fc-actions">
                  <button type="button" className="btn ghost" onClick={() => { touchCards(); answerCard(false); }}><span>À revoir</span></button>
                  <button type="button" className="btn" ref={knownBtn} onClick={() => { touchCards(); answerCard(true); }}><span>Je savais</span></button>
                </div>
              </article>
              <article className="card">
                <h3>Ta série</h3>
                <p>Chaque jour de révision allume un jour de plus. Ne la casse pas.</p>
                <div className="streak">
                  <span key={streak} className="roll-n">{streak}</span>
                  <span className="unit">jours d&apos;affilée (exemple)</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Apprendre */}
        <section id="apprendre" aria-labelledby="t-app">
          <div className="wrap">
            <h2 id="t-app">Et si tu as une question ?</h2>
            <p className="sub">FishFlow répond aussi à tes questions, avec des images libres de droits et des liens Wikipédia pour aller plus loin. Les exemples défilent tout seuls, tu peux aussi écrire ta question.</p>
            <div className="demo">
              <div className="demo-panel" style={{ background: "transparent", boxShadow: "none" }}>
                <div className={`slot-demo${orbFallback ? " slot-css" : ""}`} data-slot="demo" data-phase={phase} aria-hidden="true" />
                <div className="chips" role="group" aria-label="Questions d'exemple">
                  <button type="button" className="chip" onClick={() => { touchAsk(); run("sky"); }}>Pourquoi le ciel est bleu</button>
                  <button type="button" className="chip" onClick={() => { touchAsk(); run("hole"); }}>Comment fonctionne un trou noir</button>
                </div>
                <form className="ask" onSubmit={onAsk} autoComplete="off">
                  <label htmlFor="lp-q" hidden>Ta question</label>
                  <input
                    id="lp-q"
                    type="text"
                    placeholder="Que veux-tu savoir ?"
                    enterKeyHint="send"
                    maxLength={120}
                    value={q}
                    readOnly={phase === "typing" || phase === "thinking"}
                    onChange={(e) => { touchAsk(); setQ(e.target.value); setPhase("idle"); setDemoKey(null); setNotice(false); }}
                  />
                  <button className="btn" type="submit"><span>Envoyer</span></button>
                </form>
                <p className="demo-note">Démo avec deux exemples. Dans FishFlow, tu poses ta propre question et les images viennent de Wikipédia, avec leur auteur et leur licence.</p>
              </div>
              <div className="demo-panel" aria-live="polite">
                {!answer && !notice && (
                  <p className="note">
                    {phase === "thinking" ? "FishFlow réfléchit…" : "La réponse apparaît ici, avec ses images."}
                  </p>
                )}
                {!answer && notice && (
                  <div className="notice">
                    <p>Cette démo ne connaît que deux exemples. Dans FishFlow, tu peux poser ta vraie question.</p>
                    <TrackedLink href="/signup" event="cta_click_demo_signup" className="btn"><span>Créer un compte</span></TrackedLink>
                  </div>
                )}
                {answer && (
                  <div className="answer show">
                    <div className="pics">
                      {answer.pics.map((p, n) => (
                        <figure key={`${demoKey}-${p}`} className="pic" ref={(el) => { picRefs.current[n] = el; }}>
                          <Art k={p} />
                          <figcaption>{CAPTIONS[p]}</figcaption>
                        </figure>
                      ))}
                    </div>
                    <h3>{answer.title}</h3>
                    <p className="sr-only">{answer.text}</p>
                    <p aria-hidden="true" className={shown < answer.text.length ? "typed" : undefined}>{answer.text.slice(0, shown)}</p>
                    <div className="src">
                      {answer.src.map((s, n) => (
                        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">[{n + 1}] {s.label}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <WaveDivider />

        {/* Confiance */}
        <section aria-labelledby="t-c">
          <div className="wrap">
            <h2 id="t-c">Des réponses claires, et honnêtes sur leurs limites.</h2>
            <p className="sub">Quand tu poses une question, une IA te répond à partir d&apos;articles de Wikipédia. Elle peut se tromper, alors on te donne de quoi vérifier.</p>
            <ul className="trust">
              <li><strong>Des liens pour vérifier</strong>Les articles Wikipédia sur le sujet sont proposés sous la réponse, pour aller plus loin.</li>
              <li><strong>Des images libres de droits</strong>Elles viennent de Wikipédia, avec leur auteur et leur licence.</li>
              <li><strong>Il dit quand il hésite</strong>Si un détail est incertain ou peut avoir changé, la réponse te le signale au lieu de l'inventer.</li>
            </ul>
          </div>
        </section>

        {/* Gratuit / Pro */}
        <section id="tarifs" aria-labelledby="t-p">
          <div className="wrap">
            <h2 id="t-p">Gratuit ou Pro : ce que tu as vraiment.</h2>
            <p className="sub">Tu peux tout essayer gratuitement. Pro te donne bien plus de fiches et d'outils.</p>
            <div className="cmp-wrap" tabIndex={0} role="region" aria-label="Comparaison Gratuit et Pro">
              <table className="cmp">
                <thead>
                  <tr><th scope="col"><span className="sr-only">Fonctionnalité</span></th><th scope="col">Gratuit</th><th scope="col" className="pro">Pro</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Prix</th><td data-label="Gratuit">0 €</td><td data-label="Pro" className="pro">4,99 € par mois, résiliable à tout moment</td></tr>
                  <tr><th scope="row">Fiches créées</th><td data-label="Gratuit">3 par mois</td><td data-label="Pro" className="pro">100 par mois (10 par jour)</td></tr>
                  <tr><th scope="row">Fiche, essentiel, flashcards</th><td data-label="Gratuit" className="yes">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                  <tr><th scope="row">Quiz</th><td data-label="Gratuit">À jouer, avec ton meilleur score</td><td data-label="Pro" className="pro">À jouer, 12 questions par quiz</td></tr>
                  <tr><th scope="row">Réviser avec rappels</th><td data-label="Gratuit" className="yes">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                  <tr><th scope="row">Apprendre (poser une question)</th><td data-label="Gratuit">1 essai</td><td data-label="Pro" className="pro">20 questions par jour</td></tr>
                  <tr><th scope="row">Taille d'un cours</th><td data-label="Gratuit">Jusqu'à 7 pages environ</td><td data-label="Pro" className="pro">Jusqu'à 15 pages environ, plusieurs PDF dans une seule fiche</td></tr>
                  <tr><th scope="row">Objectif du jour et série</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                  <tr><th scope="row">Présentations (Classique, Mémo, Cornell)</th><td data-label="Gratuit">Oui</td><td data-label="Pro" className="pro">Oui</td></tr>
                  <tr><th scope="row">Progression</th><td data-label="Gratuit">7 derniers jours</td><td data-label="Pro" className="pro">30 jours, réussite, cartes difficiles</td></tr>
                  <tr><th scope="row">Résumé lu à voix haute</th><td data-label="Gratuit">Non</td><td data-label="Pro" className="pro">Oui</td></tr>
                  <tr><th scope="row">Historique de fiches</th><td data-label="Gratuit">5 fiches</td><td data-label="Pro" className="pro">Toutes tes fiches gardées</td></tr>
                </tbody>
              </table>
            </div>
            <div className="cmp-cta">
              <TrackedLink href="/generer" event="cta_click_offer_free" className="btn ghost"><span>Créer ma fiche gratuitement</span></TrackedLink>
              <TrackedLink href="/pricing" event="cta_click_offer_premium" className="btn"><span>Passer Pro</span></TrackedLink>
            </div>
            <p className="cmp-note">Paiement sécurisé par Stripe. Tes fiches restent privées.</p>
          </div>
        </section>
        <WaveDivider flip />

        {/* Questions */}
        <section aria-labelledby="t-faq">
          <div className="wrap">
            <h2 id="t-faq">Questions fréquentes.</h2>
            <div className="faq">
              <details><summary>C&apos;est pour qui ?</summary><p>Pour tout le monde. Un cours à réviser, mais aussi un livre à retenir, des mots d&apos;une langue, le code de la route, un sujet de culture générale ou un dossier de travail. Tout ce que tu veux apprendre ou retenir, toute l&apos;année.</p></details>
              <details><summary>C&apos;est gratuit ?</summary><p>Oui pour commencer : 3 fiches par mois et un essai d&apos;Apprendre, sans carte bancaire. Avec Pro, tu peux créer jusqu'à 100 fiches par mois.</p></details>
              <details><summary>Les réponses sont-elles vraies ?</summary><p>Pour les fiches, elles viennent de ton propre cours. Pour les questions d&apos;Apprendre, c&apos;est une IA qui répond : elle peut se tromper, donc pour un détail important, vérifie dans les liens proposés ou dans ton cours.</p></details>
            </div>
          </div>
        </section>

        <section className="final" aria-labelledby="t-end">
          <div className="wrap">
            <p className="eyebrow">Prêt ?</p>
            <h2 id="t-end">Ton prochain cours devient une fiche en moins d&apos;une minute.</h2>
            <ol className="recap">
              <li>Colle ton cours, un PDF ou une photo.</li>
              <li>FishFlow écrit ta fiche, tes flashcards et ton quiz.</li>
              <li>Tu révises un peu chaque jour, et tu retiens.</li>
            </ol>
            <div className="cta-row">
              {signedIn ? (
                <Link href="/generer" className="btn btn-xl"><span>Ouvrir FishFlow</span></Link>
              ) : (
                <TrackedLink href="/generer" event="cta_click_final" className="btn btn-xl"><span>Ouvrir FishFlow gratuitement</span></TrackedLink>
              )}
            </div>
            <p className="note">Sans carte bancaire. 3 fiches gratuites par mois.</p>
          </div>
        </section>
      </main>

      {/* Téléphone : le bouton reste à portée de pouce pendant qu'on fait défiler. */}
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
