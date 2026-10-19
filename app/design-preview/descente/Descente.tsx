"use client";

import { useEffect, useRef, useState } from "react";
import { Angler, Boat, Fish, Gull, Jelly, Seabed } from "./art";

const COURS = "La photosynthèse permet aux plantes de fabriquer leur nourriture à partir de la lumière, de l'eau et du CO₂. Elle se déroule dans les chloroplastes…";
const FREE = ["3 fiches par mois", "Tes 5 dernières fiches gardées", "Flashcards, quiz et révision chaque jour", "1 question pour essayer Apprendre"];
const PRO = ["100 fiches par mois (10 par jour)", "Toutes tes fiches gardées", "Des cours plus longs (environ 15 pages)", "20 questions par jour dans Apprendre"];

// Profondeur affichée à chaque repère de la page (en mètres).
const ANCHORS: [string, number][] = [["hero", 0], ["school", 20], ["jelly", 200], ["abyss", 1000], ["bed", 1200]];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Descente() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      el.dataset.still = "true";
      return;
    }

    const raie = el.querySelector<HTMLElement>(".dz-raie")!;
    const flap = el.querySelector<HTMLElement>(".dz-raie-flap")!;
    const depth = el.querySelector<HTMLElement>(".dz-depth b")!;
    const jumper = el.querySelector<HTMLElement>(".dz-jump")!;
    const bubbles = Array.from(el.querySelectorAll<HTMLElement>(".dz-bub"));
    const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-speed]"));
    const scenes = Array.from(el.querySelectorAll<HTMLElement>("[data-scene]"));
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // Positions mises en cache (lues au redimensionnement, jamais pendant le défilement).
    let vw = 0, vh = 0, maxY = 1;
    let anchors: [number, number][] = [];
    let layerTops: number[] = [];
    const measure = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      maxY = Math.max(1, document.documentElement.scrollHeight - vh);
      anchors = ANCHORS.map(([id, m]) => {
        const s = el.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
        return [s ? s.getBoundingClientRect().top + window.scrollY : 0, m] as [number, number];
      });
      layerTops = layers.map((l) => (l.parentElement as HTMLElement).getBoundingClientRect().top + window.scrollY);
    };
    measure();

    // Le battement d'ailes de la raie accélère quand on défile vite.
    const flapAnim = flap.getAnimations()[0];

    // La raie : position voulue (selon le défilement) + position affichée (qui la rattrape en douceur).
    let lastY = window.scrollY, vel = 0;
    let cur = { x: 0, y: 0, r: 0 };
    let shy = { x: 0, y: 0 }, mouse = { x: -999, y: -999 };
    let raf = 0, lastDepth = -1, jumpReady = 0;

    const target = () => {
      const y = window.scrollY;
      const t = y / 520;
      const wide = vw >= 900;
      // Ordinateur : elle nage dans la moitié droite, en grandes boucles. Téléphone : dans le bas de l'écran, près du bord droit.
      const x = wide ? vw * (0.74 + 0.12 * Math.sin(t)) : vw * (0.62 + 0.14 * Math.sin(t * 1.3));
      const yy = wide ? vh * (0.42 + 0.16 * Math.sin(t * 0.7 + 1)) : vh * (0.74 + 0.06 * Math.sin(t * 1.7));
      return { x, y: yy, r: clamp(vel * 0.9, -26, 26) + 10 * Math.cos(t) };
    };

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      vel = lerp(vel, y - lastY, 0.25);
      lastY = y;

      // Profondeur affichée dans la barre du haut.
      let m = 0;
      for (let i = 0; i < anchors.length - 1; i++) {
        const [a, ma] = anchors[i], [b, mb] = anchors[i + 1];
        if (y + vh * 0.4 >= a) m = lerp(ma, mb, clamp((y + vh * 0.4 - a) / Math.max(1, b - a), 0, 1));
      }
      if (y >= maxY - 2) m = 1200;
      const rounded = Math.round(m);
      if (rounded !== lastDepth) { depth.textContent = String(rounded); lastDepth = rounded; }

      // Plans en parallaxe : chacun avance à sa propre vitesse.
      for (let i = 0; i < layers.length; i++) {
        const top = layerTops[i];
        if (top > y + vh * 1.5 || top < y - vh * 2.5) continue;
        const s = Number(layers[i].dataset.speed);
        layers[i].style.transform = `translate3d(0, ${((y - top) * s).toFixed(1)}px, 0)`;
      }

      // La raie a un peu peur de la souris : elle s'écarte quand elle approche.
      const tg = target();
      if (fine) {
        const dx = cur.x - mouse.x, dy = cur.y - mouse.y, d = Math.hypot(dx, dy);
        const push = d < 240 ? (240 - d) / 240 : 0;
        shy.x = lerp(shy.x, (dx / (d || 1)) * push * 120, 0.08);
        shy.y = lerp(shy.y, (dy / (d || 1)) * push * 90, 0.08);
      }
      cur.x = lerp(cur.x, tg.x + shy.x, 0.09);
      cur.y = lerp(cur.y, tg.y + shy.y, 0.09);
      cur.r = lerp(cur.r, tg.r, 0.12);
      raie.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${cur.r.toFixed(2)}deg)`;
      if (flapAnim) flapAnim.playbackRate = 1 + Math.min(2.5, Math.abs(vel) / 14);

      // Continue tant que quelque chose bouge encore.
      const moving = Math.abs(vel) > 0.1 || Math.abs(cur.x - tg.x - shy.x) > 0.5 || Math.abs(cur.y - tg.y - shy.y) > 0.5 || Math.abs(cur.r - tg.r) > 0.1;
      if (moving) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const first = target();
    cur = { ...first };
    kick();

    // Le poisson saute quand on commence à défiler (puis de temps en temps), seulement près de la surface.
    let surfaceVisible = true;
    const jump = () => {
      const now = performance.now();
      if (!surfaceVisible || now < jumpReady) return;
      jumpReady = now + 3800;
      jumper.classList.remove("go");
      void jumper.offsetWidth;
      jumper.classList.add("go");
    };
    const auto = window.setInterval(jump, 7000);
    const onScroll = () => { kick(); if (window.scrollY < vh) jump(); };

    // Bulles sous le doigt ou la souris (un petit stock réutilisé, rien n'est créé à chaque fois).
    let bi = 0, lastB = 0, lastBx = 0, lastBy = 0;
    const bubble = (x: number, y: number, force = false) => {
      const now = performance.now();
      if (!force && (now - lastB < 45 || Math.hypot(x - lastBx, y - lastBy) < 16)) return;
      lastB = now; lastBx = x; lastBy = y;
      const b = bubbles[bi++ % bubbles.length];
      const size = 6 + Math.random() * 14;
      const drift = (Math.random() - 0.5) * 50;
      b.style.width = b.style.height = `${size}px`;
      b.animate(
        [
          { transform: `translate3d(${x}px, ${y}px, 0) scale(.4)`, opacity: 0 },
          { opacity: 0.9, offset: 0.15 },
          { transform: `translate3d(${x + drift}px, ${y - 160 - size * 4}px, 0) scale(1)`, opacity: 0 },
        ],
        { duration: 1500 + size * 40, easing: "cubic-bezier(.23,1,.32,1)" },
      );
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") { mouse = { x: e.clientX, y: e.clientY }; kick(); }
      bubble(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) bubble(t.clientX, t.clientY); };
    const onTap = (e: TouchEvent) => { const t = e.touches[0]; if (t) for (let i = 0; i < 4; i++) bubble(t.clientX + (i - 1.5) * 8, t.clientY, true); };

    // Les scènes ne s'animent que lorsqu'elles sont à l'écran.
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        (en.target as HTMLElement).dataset.on = en.isIntersecting ? "true" : "false";
        if ((en.target as HTMLElement).dataset.scene === "hero") surfaceVisible = en.isIntersecting;
      }
    }, { rootMargin: "120px 0px" });
    scenes.forEach((s) => io.observe(s));

    const onResize = () => { measure(); kick(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", onTap, { passive: true });
    const firstJump = window.setTimeout(jump, 1600);
    document.fonts?.ready.then(onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", onTap);
      window.clearInterval(auto);
      window.clearTimeout(firstJump);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} className="dz" data-theme={theme}>
      <a href="#dz-main" className="dz-skip">Aller au contenu</a>
      <header className="dz-top">
        <a href="/design-preview" className="dz-brand"><span className="dz-logo" aria-hidden="true" /><span>Fish<em>Flow</em></span></a>
        <p className="dz-depth" aria-hidden="true"><b>0</b> m</p>
        <div className="dz-actions">
          <button type="button" className="dz-theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Passer au thème sombre" : "Passer au thème clair"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {theme === "light" ? <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
            </svg>
          </button>
          <a href="#" className="dz-login">Connexion</a>
        </div>
      </header>

      {/* Calque fixe des décors qui suivent l'écran : la raie et les bulles. Toujours derrière les plaques de texte. */}
      <div className="dz-fx" aria-hidden="true">
        <div className="dz-raie"><div className="dz-raie-flap"><span className="dz-raie-img" /><span className="dz-raie-shade" /></div></div>
        {Array.from({ length: 18 }, (_, i) => <i key={i} className="dz-bub" />)}
      </div>

      <main id="dz-main">
        <section className="dz-hero" data-scene="hero" data-anchor="hero" aria-labelledby="dz-h1">
          <div className="dz-sky" aria-hidden="true">
            <div className="dz-sun" data-speed="0.35" />
            <div className="dz-gulls" data-speed="0.25"><Gull /></div>
            <div className="dz-boat-wrap"><Boat /></div>
            <div className="dz-jump"><div className="dz-jump-x"><div className="dz-jump-y"><Fish className="dz-jumper" body="var(--jumper)" fin="var(--jumper-fin)" /></div></div><i className="dz-splash a" /><i className="dz-splash b" /></div>
            <div className="dz-waves back" /><div className="dz-waves front" />
          </div>
          <div className="dz-under">
            <div className="dz-rays" aria-hidden="true" data-speed="-0.25"><i /><i /><i /><i /><i /></div>
            <div className="dz-plate dz-hero-copy">
              <h1 id="dz-h1">Ton cours devient une fiche de révision.</h1>
              <p className="dz-lead">Colle ton cours, envoie un PDF ou prends une photo. FishFlow en fait une fiche, des flashcards et un quiz, en quelques secondes.</p>
              <form className="dz-start" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="dz-paste" className="sr-only">Colle ton cours</label>
                <textarea id="dz-paste" rows={3} placeholder="Colle ton cours ici…" />
                <button className="dz-btn">Créer ma fiche</button>
              </form>
              <p className="dz-note">3 fiches gratuites par mois, sans carte bancaire.</p>
            </div>
          </div>
        </section>

        <div className="dz-scene dz-school-scene" data-scene="school" data-anchor="school" aria-hidden="true">
          <p className="dz-mark">20 m</p>
          <div className="dz-school far" data-speed="0.15">{Array.from({ length: 9 }, (_, i) => <Fish key={i} className="dz-sf" body="var(--school-far)" fin="var(--school-far)" />)}</div>
          <div className="dz-school near" data-speed="-0.1">{Array.from({ length: 12 }, (_, i) => <Fish key={i} className="dz-sf" body="var(--school)" fin="var(--school-fin)" />)}</div>
        </div>

        <section className="dz-zone" aria-labelledby="dz-z1">
          <div className="dz-plate">
            <p className="dz-zone-tag">Zone de lumière</p>
            <h2 id="dz-z1">Ton cours descend, la fiche apparaît.</h2>
            <div className="dz-pair">
              <div className="dz-sub"><h3>Ton cours</h3><p className="dz-cours">{COURS}</p></div>
              <article className="dz-sub dz-fiche" aria-label="Exemple de fiche générée">
                <header><strong>Photosynthèse</strong><span>Fiche de révision</span></header>
                <h4>L&apos;essentiel</h4>
                <p>Les plantes transforment la lumière du soleil en énergie chimique : elles produisent du glucose et libèrent de l&apos;oxygène.</p>
                <h4>Points clés</h4>
                <ul><li>Se déroule dans les chloroplastes</li><li>Demande de la lumière, de l&apos;eau et du CO₂</li><li>Produit du glucose, libère de l&apos;oxygène</li></ul>
              </article>
            </div>
          </div>
        </section>

        <div className="dz-scene dz-jelly-scene" data-scene="jelly" data-anchor="jelly" aria-hidden="true">
          <p className="dz-mark">200 m</p>
          <div className="dz-jl j1" data-speed="0.3"><Jelly /></div>
          <div className="dz-jl j2" data-speed="0.12"><Jelly className="small" /></div>
          <div className="dz-jl j3" data-speed="0.45"><Jelly className="small" /></div>
        </div>

        <section className="dz-zone deep" aria-labelledby="dz-z2">
          <div className="dz-plate">
            <p className="dz-zone-tag">Crépuscule</p>
            <h2 id="dz-z2">Plus bas, tu retiens.</h2>
            <div className="dz-pair">
              <div className="dz-sub"><h3>Flashcard</h3><p className="q">Où se fait la photosynthèse ?</p><p className="a">Dans les chloroplastes.</p></div>
              <div className="dz-sub"><h3>Quiz</h3><p className="q">Que libère la plante ?</p><p className="opt">Du CO₂</p><p className="opt ok">De l&apos;oxygène</p></div>
            </div>
          </div>
        </section>

        <div className="dz-scene dz-abyss-scene" data-scene="abyss" data-anchor="abyss" aria-hidden="true">
          <p className="dz-mark">1000 m</p>
          <div className="dz-plankton" data-speed="0.2" />
          <div className="dz-angler-wrap" data-speed="0.1"><Angler /></div>
        </div>

        <section className="dz-zone deep" aria-labelledby="dz-pr">
          <div className="dz-plate">
            <p className="dz-zone-tag">Grands fonds</p>
            <h2 id="dz-pr">Gratuit ou Pro : qu&apos;est-ce qui change ?</h2>
            <div className="dz-pair">
              <article className="dz-sub"><h3>Gratuit</h3><p className="dz-amount">0 €</p><ul className="dz-list">{FREE.map((x) => <li key={x}>{x}</li>)}</ul></article>
              <article className="dz-sub pro"><h3>Pro</h3><p className="dz-amount">4,99 € <small>par mois</small></p><ul className="dz-list">{PRO.map((x) => <li key={x}>{x}</li>)}</ul><p className="dz-small">Tu arrêtes quand tu veux, en un clic.</p></article>
            </div>
            <div className="dz-end">
              <h2>Ton prochain cours devient une fiche en moins d&apos;une minute.</h2>
              <button className="dz-btn">Créer ma première fiche</button>
            </div>
          </div>
        </section>

        <div className="dz-floor" data-scene="bed" data-anchor="bed" aria-hidden="true">
          <Seabed />
        </div>
      </main>
    </div>
  );
}
