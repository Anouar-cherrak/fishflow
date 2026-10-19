"use client";

import { useEffect, useRef } from "react";

// Un vrai banc de sardines (silhouettes, reflets argentés quand elles tournent) qui nage tout seul
// et s'écarte du doigt ou de la souris. Canvas 2D, ne tourne que lorsqu'il est à l'écran.
type Fish = { x: number; y: number; vx: number; vy: number; s: number; flash: number; ph: number };

export function School({ count, className = "" }: { count: { phone: number; desktop: number }; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wide = window.innerWidth >= 900;
    const n = wide ? count.desktop : count.phone;
    const dpr = Math.min(window.devicePixelRatio || 1, wide ? 2 : 1.5);
    let W = 0, H = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const fish: Fish[] = Array.from({ length: n }, (_, i) => ({
      x: W * 0.2 + Math.random() * W * 0.3,
      y: H * 0.35 + Math.random() * H * 0.3,
      vx: 1.4 + Math.random() * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      s: 0.7 + Math.random() * 0.6,
      flash: 0,
      ph: i * 0.7,
    }));
    // Le banc suit un « meneur » invisible qui fait de grandes boucles dans la zone.
    let t = Math.random() * 100;
    const pointer = { x: -9999, y: -9999, on: false };
    const color = getComputedStyle(canvas).color || "#0B2A44";

    let raf = 0, visible = false, last = performance.now();
    const step = (now: number) => {
      raf = 0;
      const dt = Math.min(2, (now - last) / 16.7);
      last = now;
      t += 0.006 * dt;
      const lx = W * (0.5 + 0.38 * Math.sin(t)), ly = H * (0.5 + 0.28 * Math.sin(t * 1.7 + 1));
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      for (let i = 0; i < fish.length; i++) {
        const f = fish[i];
        // vers le meneur
        let ax = (lx - f.x) * 0.0009, ay = (ly - f.y) * 0.0009;
        // séparation et alignement avec quelques voisins (échantillon, pour rester léger)
        for (let k = 1; k <= 6; k++) {
          const o = fish[(i + k * 7) % fish.length];
          const dx = f.x - o.x, dy = f.y - o.y, d2 = dx * dx + dy * dy;
          if (d2 < 140) { ax += dx * 0.012; ay += dy * 0.012; }
          ax += (o.vx - f.vx) * 0.006; ay += (o.vy - f.vy) * 0.006;
        }
        // peur du doigt / de la souris
        if (pointer.on) {
          const dx = f.x - pointer.x, dy = f.y - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) { const d = Math.sqrt(d2) || 1; ax += (dx / d) * 0.55; ay += (dy / d) * 0.55; f.flash = 1; }
        }
        const ovx = f.vx;
        f.vx += ax * dt; f.vy += ay * dt;
        const sp = Math.hypot(f.vx, f.vy), max = 3.2, min = 1.1;
        if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; }
        else if (sp < min) { f.vx *= min / sp; f.vy *= min / sp; }
        if (Math.sign(ovx) !== Math.sign(f.vx)) f.flash = 1;
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.flash *= 0.94;
        f.ph += 0.35 * dt;
        // dessin : corps fuselé + queue qui bat ; reflet argenté quand le poisson tourne
        const a = Math.atan2(f.vy, f.vx);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(a);
        ctx.scale(f.s, f.s);
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7.5, 1.9, 0, 0, Math.PI * 2);
        const sw = Math.sin(f.ph) * 1.6;
        ctx.moveTo(-6.5, 0);
        ctx.lineTo(-10.5, -2.4 + sw);
        ctx.lineTo(-10.5, 2.4 + sw);
        ctx.closePath();
        ctx.fill();
        if (f.flash > 0.05) {
          ctx.globalAlpha = f.flash * 0.8;
          ctx.fillStyle = "#EAF8FF";
          ctx.beginPath();
          ctx.ellipse(0.5, -0.4, 5, 1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = color;
        }
        ctx.restore();
      }
      if (visible) raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    });
    io.observe(canvas);

    const local = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = x - r.left; pointer.y = y - r.top; pointer.on = true;
    };
    const onMove = (e: PointerEvent) => local(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { const t0 = e.touches[0]; if (t0) local(t0.clientX, t0.clientY); };
    const off = () => { pointer.on = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", off, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", off);
      window.removeEventListener("resize", resize);
    };
  }, [count.phone, count.desktop]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
