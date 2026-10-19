// Applique aux couleurs du site les réglages d'écran d'Anouar (panneau NVIDIA) pour que tout le monde,
// téléphone compris, voie les couleurs comme lui : gamma 1,20, éclat numérique 100 % (saturation renforcée,
// surtout pour les couleurs peu saturées), teinte +7 % (environ +7°), luminosité +55 (léger éclaircissement).
// Lancer une seule fois : node scripts/ocean/vibrance.mjs app/globals.css app/landing.css
// Les noirs, blancs et gris purs ne bougent pas. Les contrastes sont revérifiés ensuite (Lighthouse).
import fs from "node:fs";

const GAMMA = 1.2, HUE = 7, BRIGHT = 0.02;

const toHsl = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const toRgb = (h, s, l) => {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
};

export function boost(r, g, b) {
  // gamma + luminosité (sur chaque canal)
  let c = [r, g, b].map((v) => Math.min(1, Math.pow(v / 255, 1 / GAMMA) + BRIGHT * (1 - v / 255)));
  let [h, s, l] = toHsl(...c);
  if (s < 0.04) return c.map((v) => Math.round(v * 255)); // gris : seulement le gamma
  // éclat numérique : les couleurs ternes gagnent beaucoup, les couleurs déjà vives un peu
  s = Math.min(1, s + (1 - s) * s * 1.1 + s * 0.15);
  h += HUE;
  return toRgb(h, s, l).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255));
}
const hex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
const pure = (r, g, b) => (r === g && g === b && (r === 0 || r === 255));

for (const f of process.argv.slice(2)) {
  let s = fs.readFileSync(f, "utf8");
  let n = 0;
  s = s.replace(/#([0-9a-fA-F]{6})\b/g, (m, x) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
    if (pure(r, g, b)) return m;
    n++;
    const [R, G, B] = boost(r, g, b);
    return "#" + hex(R) + hex(G) + hex(B);
  });
  s = s.replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(\s*,\s*[\d.]+)?\s*\)/g, (m, r, g, b, a) => {
    [r, g, b] = [r, g, b].map(Number);
    if (pure(r, g, b)) return m;
    n++;
    const [R, G, B] = boost(r, g, b);
    return a ? `rgba(${R}, ${G}, ${B}${a})` : `rgb(${R}, ${G}, ${B})`;
  });
  fs.writeFileSync(f, s);
  console.log(f, n, "couleurs ajustées");
}
