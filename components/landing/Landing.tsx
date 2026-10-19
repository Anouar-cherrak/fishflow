"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RaieImg } from "@/components/Logo";
import { Manta } from "@/components/ocean/Manta";
import { TrackedLink } from "@/components/TrackedLink";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";
import { trackEvent } from "@/lib/tracking";
import { Jelly } from "./Jelly";
import { School } from "./School";
import { depthClick, disableDepthSound, enableDepthSound } from "./depth-sound";

type Theme = "light" | "dark";

const COURS =
  "La photosynthèse permet aux plantes de fabriquer leur nourriture à partir de la lumière, de l'eau et du CO₂. Elle se déroule dans les chloroplastes, grâce à la chlorophylle. La plante produit du glucose et libère de l'oxygène.";

const STEPS = [
  { label: "Tu colles ton cours", caption: "Tu colles ton cours, ou tu envoies un PDF ou une photo.", depth: "20 m" },
  { label: "FishFlow le lit", caption: "FishFlow lit le texte et repère les idées importantes : elles s'allument.", depth: "60 m" },
  { label: "La fiche s'écrit", caption: "Il écrit la fiche : l'essentiel, en phrases courtes.", depth: "120 m" },
  { label: "Tu retiens", caption: "Il crée aussi les flashcards et le quiz, pour que tu retiennes.", depth: "200 m" },
];

const FREE = ["3 fiches par mois", "Tes 5 dernières fiches gardées", "Flashcards, quiz et révision chaque jour", "1 question pour essayer Apprendre"];
const PRO = ["100 fiches par mois (10 par jour)", "Toutes tes fiches gardées", "Des cours plus longs (environ 15 pages)", "20 questions par jour dans Apprendre"];

const SNOW_NEAR = Array.from({ length: 18 }, (_, i) => ({ x: (i * 41 + 7) % 100, y: (i * 67 + 13) % 100, s: 2 + (i % 3) }));
const SNOW_FAR = Array.from({ length: 26 }, (_, i) => ({ x: (i * 29 + 3) % 100, y: (i * 43 + 31) % 100, s: 1 + (i % 2) }));

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* Le profondimètre : quatre colonnes de chiffres qui roulent. */
function Gauge({ sound, onSound }: { sound: boolean; onSound: () => void }) {
  return (
    <div className="gauge">
      <p className="gauge-read" aria-hidden="true">
        <span className="gauge-digits">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="gauge-col" data-col={i}>
              {Array.from({ length: 10 }, (_, d) => <i key={d}>{d}</i>)}
            </span>
          ))}
        </span>
        <span className="gauge-unit">m</span>
        <span className="gauge-tick" />
      </p>
      <button
        type="button"
        className="gauge-sound"
        aria-pressed={sound}
        aria-label={sound ? "Couper le son des mètres" : "Entendre les mètres défiler"}
        onClick={onSound}
      >
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
  const [step, setStep] = useState(0);
  const [scrolly, setScrolly] = useState(false);
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

  /* ===== La descente : tout ce qui suit le défilement, dans une seule boucle d'animation ===== */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!reduce) queueMicrotask(() => setScrolly(true));

    const cols = Array.from(el.querySelectorAll<HTMLElement>(".gauge-col"));
    const tick = el.querySelector<HTMLElement>(".gauge-tick");
    const light = el.querySelector<HTMLElement>(".fx-light");
    const snowNear = el.querySelector<HTMLElement>(".fx-snow.near");
    const snowFar = el.querySelector<HTMLElement>(".fx-snow.far");
    const manta = el.querySelector<HTMLElement>(".fx-manta");
    const track = el.querySelector<HTMLElement>(".steps-track");
    const bubbles = Array.from(el.querySelectorAll<HTMLElement>(".fx-bub"));
    const wings = manta ? Array.from(manta.querySelectorAll<HTMLElement>(".ff-manta-l, .ff-manta-r")) : [];

    // Mesures (au chargement et au redimensionnement seulement, jamais pendant le défilement).
    let vw = 0, vh = 0, maxY = 1, anchors: [number, number][] = [], trackTop = 0, trackLen = 1;
    const measure = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      maxY = Math.max(1, document.documentElement.scrollHeight - vh);
      anchors = Array.from(el.querySelectorAll<HTMLElement>("[data-depth]")).map((s) => [s.getBoundingClientRect().top + window.scrollY, Number(s.dataset.depth)] as [number, number]);
      if (track) {
        trackTop = track.getBoundingClientRect().top + window.scrollY;
        trackLen = Math.max(1, track.offsetHeight - vh);
      }
    };
    measure();

    const depthAt = (y: number) => {
      const probe = y + vh * 0.35;
      let m = 0;
      for (let i = 0; i < anchors.length; i++) {
        const [a, ma] = anchors[i];
        const next = anchors[i + 1];
        if (probe < a) break;
        m = next ? lerp(ma, next[1], clamp((probe - a) / Math.max(1, next[0] - a), 0, 1)) : ma;
      }
      return y >= maxY - 4 ? anchors[anchors.length - 1]?.[1] ?? m : m;
    };

    let shownDepth = -1, lastTen = 0, lastY = window.scrollY, vel = 0, raf = 0, lastStep = -1;
    const cur = { x: 0, y: 0, r: 0, s: 1 }, shy = { x: 0, y: 0 };
    let mouse = { x: -999, y: -999 };
    const wingAnims = () => wings.flatMap((w) => w.getAnimations());

    // Elle nage aussi toute seule (le temps fait avancer son parcours), même quand on ne défile pas.
    const swim = !!manta && !reduce;
    const t0 = performance.now();
    let head = 90, prevX = 0, prevY = 0;
    const target = (y: number) => {
      const t = y / 700 + (performance.now() - t0) / 9000;
      const p = y / maxY;
      const wide = vw >= 900;
      // Ordinateur : grandes boucles dans la moitié droite. Téléphone : elle n'arrive qu'après l'accueil,
      // et glisse dans le bas de l'écran, côté droit (jamais au milieu du texte).
      const enter = wide ? 1 : clamp((y - vh * 0.5) / (vh * 0.6), 0, 1);
      const x = wide ? vw * (0.74 + 0.13 * Math.sin(t)) : vw * (0.7 + 0.12 * Math.sin(t * 1.2));
      const yy = wide ? vh * (0.46 + 0.17 * Math.sin(t * 0.8 + 0.6)) : lerp(vh * 0.97, vh * (0.8 + 0.05 * Math.sin(t * 1.6)), enter);
      return { x, y: yy, r: 0, s: lerp(1, 0.78, p) };
    };

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      vel = lerp(vel, y - lastY, 0.25);
      lastY = y;
      const m = depthAt(y);
      const p = y / maxY;

      // Profondimètre : les chiffres roulent, un « clic » tous les 10 m.
      const meters = Math.round(m);
      if (meters !== shownDepth) {
        shownDepth = meters;
        const s = String(meters).padStart(4, " ");
        cols.forEach((c, i) => {
          const ch = s[i];
          c.dataset.blank = String(ch === " ");
          c.style.transform = `translate3d(0, ${ch === " " ? 0 : -Number(ch) * 10}%, 0)`;
        });
        const ten = Math.floor(meters / 10);
        if (ten !== lastTen) {
          lastTen = ten;
          tick?.animate([{ opacity: 1, transform: "scaleX(1)" }, { opacity: 0, transform: "scaleX(.2)" }], { duration: 260, easing: "ease-out" });
          if (soundRef.current) depthClick(meters);
        }
      }

      // La lumière du soleil s'éteint en descendant ; la neige marine avance à deux vitesses (profondeur).
      if (light) light.style.opacity = String(clamp(1 - p * 1.6, 0, 1));
      if (snowNear) snowNear.style.transform = `translate3d(0, ${(-(y * 0.18) % vh).toFixed(1)}px, 0)`;
      if (snowFar) snowFar.style.transform = `translate3d(0, ${(-(y * 0.07) % vh).toFixed(1)}px, 0)`;

      // La raie : elle suit la descente au loin, penche selon la vitesse, et s'écarte de la souris.
      if (swim && manta) {
        const tg = target(y);
        if (fine) {
          const dx = cur.x - mouse.x, dy = cur.y - mouse.y, d = Math.hypot(dx, dy) || 1;
          const push = d < 260 ? (260 - d) / 260 : 0;
          shy.x = lerp(shy.x, (dx / d) * push * 140, 0.07);
          shy.y = lerp(shy.y, (dy / d) * push * 100, 0.07);
        }
        cur.x = lerp(cur.x, tg.x + shy.x, 0.07);
        cur.y = lerp(cur.y, tg.y + shy.y, 0.07);
        // Elle regarde là où elle va (la tête du dessin est en haut), en tournant doucement.
        const mx = cur.x - prevX, my = cur.y - prevY + Math.max(0, vel) * 0.25;
        prevX = cur.x; prevY = cur.y;
        if (Math.hypot(mx, my) > 0.15) {
          const want = (Math.atan2(my, mx) * 180) / Math.PI + 90;
          const diff = ((want - head + 540) % 360) - 180;
          head += clamp(diff, -40, 40) * 0.05;
        }
        cur.r = head + clamp(vel * 0.6, -18, 18);
        cur.s = lerp(cur.s, tg.s, 0.1);
        manta.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${cur.r.toFixed(2)}deg) scale(${cur.s.toFixed(3)})`;
        const rate = 1 + Math.min(2.2, Math.abs(vel) / 12);
        for (const a of wingAnims()) a.playbackRate = rate;
      }

      // Étapes de la démo, selon la position dans la section.
      if (track && !reduce) {
        const pr = clamp((y - trackTop) / trackLen, 0, 0.999);
        const st = Math.floor(pr * 4);
        if (st !== lastStep) { lastStep = st; setStep(st); }
      }

      // La boucle continue tant que la raie nage (onglet visible) ou que la page bouge encore.
      if ((swim && !document.hidden) || Math.abs(vel) > 0.08) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    if (swim) { const tg = target(window.scrollY); cur.x = prevX = tg.x; cur.y = prevY = tg.y; cur.s = tg.s; }
    const onVisible = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVisible);
    frame();

    // Bulles sous le doigt ou la souris (un petit stock réutilisé).
    let bi = 0, lastB = 0, bx = 0, by = 0;
    const bubble = (x: number, y: number, force = false) => {
      if (reduce) return;
      const now = performance.now();
      if (!force && (now - lastB < 50 || Math.hypot(x - bx, y - by) < 18)) return;
      lastB = now; bx = x; by = y;
      const b = bubbles[bi++ % bubbles.length];
      if (!b) return;
      const size = 5 + Math.random() * 12;
      b.style.width = b.style.height = `${size}px`;
      b.animate(
        [
          { transform: `translate3d(${x}px, ${y}px, 0) scale(.4)`, opacity: 0 },
          { opacity: 0.85, offset: 0.12 },
          { transform: `translate3d(${x + (Math.random() - 0.5) * 50}px, ${y - 150 - size * 5}px, 0) scale(1)`, opacity: 0 },
        ],
        { duration: 1500 + size * 40, easing: "cubic-bezier(.23,1,.32,1)" }
      );
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") { mouse = { x: e.clientX, y: e.clientY }; kick(); bubble(e.clientX, e.clientY); }
    };
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) bubble(t.clientX, t.clientY); };
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; if (t) for (let i = 0; i < 4; i++) bubble(t.clientX + (i - 1.5) * 9, t.clientY, true); };

    // Les blocs remontent de l'eau trouble quand on arrive dessus (une seule fois).
    const reveals = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      el.classList.add("lp-js");
      io = new IntersectionObserver((es) => {
        for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io?.unobserve(e.target); }
      }, { rootMargin: "0px 0px -8% 0px" });
      reveals.forEach((r) => io!.observe(r));
    }
    // Les scènes (méduses, fond) ne s'animent qu'à l'écran.
    const scenes = new IntersectionObserver((es) => {
      for (const e of es) (e.target as HTMLElement).dataset.on = String(e.isIntersecting);
    }, { rootMargin: "100px 0px" });
    el.querySelectorAll("[data-scene]").forEach((s) => scenes.observe(s));

    // Barre d'action collante (téléphone) : visible après l'accueil, cachée à la fin.
    const hero = el.querySelector(".hero"), end = el.querySelector(".final"), demo = el.querySelector(".steps-track");
    const seen = { hero: true, end: false, demo: false };
    const ctaIo = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.target === hero) seen.hero = e.isIntersecting;
        if (e.target === end) seen.end = e.isIntersecting;
        if (e.target === demo) seen.demo = e.isIntersecting;
      }
      setStickyCta(!seen.hero && !seen.end && !seen.demo);
    });
    [hero, end, demo].forEach((t) => t && ctaIo.observe(t));

    const onScroll = () => kick();
    const onResize = () => { measure(); kick(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    document.fonts?.ready.then(onResize);
    const late = window.setTimeout(onResize, 1200);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.clearTimeout(late);
      document.removeEventListener("visibilitychange", onVisible);
      io?.disconnect();
      scenes.disconnect();
      ctaIo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Cliquer sur une étape : on fait défiler jusqu'à elle (ou on l'affiche, sans animation).
  const goStep = (n: number) => {
    const t = root.current?.querySelector<HTMLElement>(".steps-track");
    if (!scrolly || !t) return setStep(n);
    const top = t.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + ((n + 0.5) / 4) * (t.offsetHeight - window.innerHeight), behavior: "smooth" });
  };

  const cta = (event: string, label: string, cls = "btn") =>
    signedIn ? (
      <Link href="/generer" className={cls}><span>Ouvrir FishFlow</span></Link>
    ) : (
      <TrackedLink href="/generer" event={event} className={cls}><span>{label}</span></TrackedLink>
    );

  return (
    <div className="lp" data-theme={theme} ref={root}>
      <a className="skip" href="#top">Aller au contenu</a>

      {/* ===== L'eau : lumière, reflets, neige marine, la raie au loin, bulles. Fixe, derrière tout, jamais cliquable. ===== */}
      <div className="fx" aria-hidden="true">
        <div className="fx-light">
          <span className="fx-rays" />
          <span className="fx-caustic a" />
          <span className="fx-caustic b" />
        </div>
        <div className="fx-snow far">{SNOW_FAR.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s }} />)}{SNOW_FAR.map((s, i) => <i key={`b${i}`} style={{ left: `${s.x}%`, top: `${100 + s.y}%`, width: s.s, height: s.s }} />)}</div>
        <div className="fx-manta"><Manta /></div>
        <div className="fx-snow near">{SNOW_NEAR.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s }} />)}{SNOW_NEAR.map((s, i) => <i key={`b${i}`} style={{ left: `${s.x}%`, top: `${100 + s.y}%`, width: s.s, height: s.s }} />)}</div>
        {Array.from({ length: 16 }, (_, i) => <i key={i} className="fx-bub" />)}
      </div>

      <header className="bar">
        <Link className="brand" href="/" aria-label="FishFlow, accueil">
          <RaieImg small width={42} height={34} />
          <span>Fish<em>Flow</em></span>
        </Link>
        <Gauge sound={sound} onSound={toggleSound} />
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
        {/* ===== 0 m : la surface ===== */}
        <section className="hero" data-depth="0" aria-labelledby="t-hero">
          <div className="surface" aria-hidden="true">
            <span className="surface-sky" />
            <span className="surface-ripple a" />
            <span className="surface-ripple b" />
            <span className="surface-sun" />
          </div>
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1 id="t-hero" className="h-hero">Révise en profondeur.</h1>
              <p className="lead">Colle ton cours, envoie un PDF ou prends une photo. FishFlow en fait une fiche, des flashcards et un quiz, en quelques secondes.</p>
              <form className="start" onSubmit={start}>
                <label htmlFor="lp-cours" className="sr-only">Colle ton cours</label>
                <textarea id="lp-cours" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Colle ton cours ici…" enterKeyHint="go" />
                <button className="btn"><span>{signedIn ? "Créer ma fiche" : "Créer ma première fiche"}</span></button>
              </form>
              <p className="note">3 fiches gratuites par mois, sans carte bancaire.</p>
            </div>
            <div className="hero-room" aria-hidden="true" />
          </div>
        </section>

        {/* ===== 20 m → 200 m : comment ça marche ===== */}
        <section className="steps" data-depth="20" aria-labelledby="t-steps" id="comment">
          <div className="scene school-scene" data-scene aria-hidden="true">
            <School className="school" count={{ phone: 30, desktop: 70 }} />
          </div>
          <div className={`steps-track${scrolly ? " scrolly" : ""}`}>
            <div className="steps-sticky wrap">
              <div className="steps-copy plate" data-reveal>
                <p className="depth-tag" aria-hidden="true">{STEPS[step].depth}</p>
                <h2 id="t-steps">Ton cours descend, ta fiche remonte.</h2>
                <ol className="steps-list">
                  {STEPS.map((s, i) => (
                    <li key={s.label}>
                      <button type="button" aria-current={i === step ? "step" : undefined} onClick={() => goStep(i)}>
                        <span className="n" aria-hidden="true">{i + 1}</span>
                        <span><b>{s.label}</b><small>{s.caption}</small></span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="stage plate" data-step={step} aria-live="polite">
                <p className="sr-only">Étape {step + 1} sur 4 : {STEPS[step].caption}</p>
                <div className="panel p0" aria-hidden={step !== 0}>
                  <p className="panel-tag">Ton cours</p>
                  <p className="cours">{COURS}</p>
                </div>
                <div className="panel p1" aria-hidden={step !== 1}>
                  <p className="panel-tag">FishFlow lit</p>
                  <p className="cours">
                    La <mark>photosynthèse</mark> permet aux plantes de fabriquer leur nourriture à partir de <mark>la lumière, de l&apos;eau et du CO₂</mark>. Elle se déroule dans <mark>les chloroplastes</mark>, grâce à la chlorophylle. La plante produit <mark>du glucose</mark> et libère <mark>de l&apos;oxygène</mark>.
                  </p>
                </div>
                <div className="panel p2" aria-hidden={step !== 2}>
                  <p className="panel-tag">Ta fiche</p>
                  <p className="fiche-h">L&apos;essentiel</p>
                  <p className="fiche-p w">Les plantes transforment la lumière en énergie chimique : du glucose, et de l&apos;oxygène libéré.</p>
                  <p className="fiche-h">Points clés</p>
                  <ul className="dots w"><li>Dans les chloroplastes</li><li>Lumière, eau et CO₂</li><li>Glucose et oxygène</li></ul>
                </div>
                <div className="panel p3" aria-hidden={step !== 3}>
                  <p className="panel-tag">Tu retiens</p>
                  <div className="flip"><div className="flip-in"><p className="face">Où se fait la photosynthèse ?</p><p className="face back">Dans les chloroplastes.</p></div></div>
                  <div className="quiz"><p><strong>Que libère la plante ?</strong></p><p className="opt">Du CO₂</p><p className="opt ok">De l&apos;oxygène<i /><i /><i /></p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 300 m : chaque jour, un peu ===== */}
        <section className="daily" data-depth="300" aria-labelledby="t-daily">
          <div className="wrap daily-grid">
            <div className="plate daily-main" data-reveal>
              <h2 id="t-daily">Cinq minutes par jour, et ça reste.</h2>
              <p>FishFlow te dit chaque jour quelles cartes revoir. Ta série grandit, ton objectif du jour se remplit, et le jour de l&apos;examen tu n&apos;as plus qu&apos;à relire.</p>
              <div className="today" aria-hidden="true">
                <span className="today-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle className="on" cx="22" cy="22" r="18" /></svg><b>7</b></span>
                <span><b>Aujourd&apos;hui</b><small>7 cartes sur 10 · série de 12 jours</small></span>
              </div>
            </div>
            <div className="plate daily-ask" data-reveal>
              <h3>Une notion te bloque ?</h3>
              <p>Pose ta question dans Apprendre : une réponse claire, avec ses sources et des images. Tu peux ensuite en faire une fiche.</p>
              <p className="ask" aria-hidden="true"><span>Pourquoi le ciel est bleu ?</span><i /></p>
            </div>
          </div>
        </section>

        {/* ===== 600 m : les prix ===== */}
        <section className="price" data-depth="600" aria-labelledby="t-price" id="prix">
          <div className="scene jelly-scene" data-scene aria-hidden="true">
            <Jelly id="j1" className="j1" />
            <Jelly id="j2" className="j2" />
            <Jelly id="j3" className="j3" />
          </div>
          <div className="wrap">
            <h2 id="t-price" data-reveal>Gratuit ou Pro : qu&apos;est-ce qui change ?</h2>
            <p className="sub" data-reveal>Le compte gratuit suffit pour essayer. Pro, c&apos;est pour réviser souvent : beaucoup plus de fiches et quelques outils en plus.</p>
            <div className="plans">
              <article className="plan plate" data-reveal>
                <h3>Gratuit</h3>
                <p className="amount">0 €</p>
                <ul className="dots">{FREE.map((x) => <li key={x}>{x}</li>)}</ul>
                {cta("cta_click_offer_free", "Créer ma fiche gratuitement", "btn ghost")}
              </article>
              <article className="plan plate pro" data-reveal>
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

        {/* ===== 800 m : questions ===== */}
        <section className="faq-sec" data-depth="800" aria-labelledby="t-faq">
          <div className="wrap">
            <h2 id="t-faq" data-reveal>Questions fréquentes.</h2>
            <div className="faq plate" data-reveal>
              <details><summary>Comment ça marche, concrètement ?</summary><p>Tu crées ton compte gratuit. Tu colles ton cours (ou tu envoies un PDF, ou une photo de tes notes) et tu appuies sur « Créer ma fiche ». Moins d&apos;une minute plus tard, tu as ta fiche, tes flashcards et ton quiz. Ensuite, FishFlow te dit chaque jour quelles cartes revoir.</p></details>
              <details><summary>C&apos;est pour qui ?</summary><p>Pour toute personne qui a un cours à apprendre : collège, lycée, études supérieures, concours, formation. Il te faut juste ton cours, en texte, en PDF ou en photo.</p></details>
              <details><summary>C&apos;est gratuit ?</summary><p>Oui pour commencer : 3 fiches par mois et un essai d&apos;Apprendre, sans carte bancaire. Avec Pro, tu peux créer jusqu&apos;à 100 fiches par mois.</p></details>
              <details><summary>Je peux arrêter Pro quand je veux ?</summary><p>Oui, en un clic dans Paramètres. Tu gardes Pro jusqu&apos;à la fin du mois déjà payé.</p></details>
              <details><summary>Les réponses sont-elles vraies ?</summary><p>Pour les fiches, elles viennent de ton propre cours. Pour les questions d&apos;Apprendre, c&apos;est une IA qui répond : elle peut se tromper, donc pour un détail important, vérifie dans les liens proposés ou dans ton cours.</p></details>
            </div>
          </div>
        </section>

        {/* ===== 1 000 m : le fond ===== */}
        <section className="final" data-depth="1000" aria-labelledby="t-end">
          <div className="wrap">
            <div className="plate final-plate" data-reveal>
              <h2 id="t-end">Plonge avec ton prochain cours.</h2>
              <p>Ton prochain cours devient une fiche en moins d&apos;une minute.</p>
              <div className="cta-row">{cta("cta_click_final", "Ouvrir FishFlow gratuitement", "btn btn-xl")}</div>
              <p className="note">Sans carte bancaire. 3 fiches gratuites par mois.</p>
            </div>
          </div>
          <div className="seabed" data-scene aria-hidden="true">
            <svg viewBox="0 0 1200 220" preserveAspectRatio="none" focusable="false">
              <path d="M0 130C160 92 300 160 470 120s320-64 480 0 210 22 250 12v88H0z" className="bed2" />
              <path d="M0 168c200-34 380 32 600 0s400-22 600 10v42H0z" className="bed1" />
            </svg>
            <span className="glow g1" /><span className="glow g2" /><span className="glow g3" /><span className="glow g4" /><span className="glow g5" />
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
