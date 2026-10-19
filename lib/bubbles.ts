// Une gerbe de bulles qui remonte (fiche prête, bonne réponse…). Ajoutées au <body>, elles survivent
// au changement de page et se suppriment seules. Rien avec prefers-reduced-motion.
export function burstBubbles(x = window.innerWidth / 2, y = window.innerHeight * 0.75, count = 18) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    const b = document.createElement("i");
    b.className = "ff-burst";
    b.setAttribute("aria-hidden", "true");
    const size = 6 + Math.random() * 16;
    b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px`;
    document.body.appendChild(b);
    const dx = (Math.random() - 0.5) * 220;
    const dy = -(160 + Math.random() * 320);
    const anim = b.animate(
      [
        { transform: "translate3d(0, 0, 0) scale(.3)", opacity: 0 },
        { opacity: 0.95, offset: 0.12 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 900, delay: Math.random() * 180, easing: "cubic-bezier(.23,1,.32,1)" }
    );
    anim.onfinish = () => b.remove();
  }
}
