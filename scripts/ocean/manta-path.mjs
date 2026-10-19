// Calcule la silhouette réaliste d'une raie manta vue de dessus (aile en faucille, cornes céphaliques, queue fine)
// et l'écrit dans components/ocean/manta-path.ts. Lancer : node scripts/ocean/manta-path.mjs
import fs from "node:fs";

const SPAN = 1.12;
const lead = (x) => (x < 0.24 ? 0.44 - 0.04 * (x / 0.24) ** 2 : 0.4 - 0.55 * ((x - 0.24) / (SPAN - 0.24)) ** 1.4 - 0.27 * ((x - 0.24) / (SPAN - 0.24)) ** 4);
const trail = (x) => (x < 0.22 ? -0.56 + 0.02 * (x / 0.22) : -0.54 + 0.3 * ((x - 0.22) / (SPAN - 0.22)) ** 0.6 - 0.2 * ((x - 0.22) / (SPAN - 0.22)) ** 3);

// Moitié droite, du haut de la tête jusqu'à la base de la queue, dans le sens des aiguilles d'une montre.
const half = [];
// corne céphalique droite : part du bord de la tête, s'avance et s'enroule vers l'intérieur
half.push([0.11, 0.44], [0.125, 0.5], [0.145, 0.55], [0.175, 0.578], [0.207, 0.566], [0.232, 0.525], [0.246, 0.47]);
for (let i = 1; i <= 26; i++) {
  const x = 0.26 + (SPAN - 0.26) * (i / 26) ** 0.9;
  half.push([x, lead(x)]);
}
// pointe fine, puis bord de fuite creusé jusqu'au corps
for (let i = 26; i >= 0; i--) {
  const x = 0.2 + (SPAN - 0.02 - 0.2) * (i / 26) ** 0.9;
  half.push([x, trail(x)]);
}
// nageoire pelvienne puis base de la queue
half.push([0.15, -0.585], [0.11, -0.62], [0.06, -0.6], [0.022, -0.62]);

const tail = [[0.012, -0.8], [0.006, -1.0], [0.0015, -1.22]];
const right = [...half, ...tail];
const left = right.slice().reverse().map(([x, y]) => [-x, y]);
const pts = [...right, ...left.slice(1)];

// Bouche : petite échancrure au centre de la tête (entre les deux cornes).
pts.push([-0.1, 0.44], [-0.05, 0.43], [0, 0.425], [0.05, 0.43]);

// Coordonnées : 0..240 en largeur, tête en haut.
const W = 240, S = W / (2 * SPAN + 0.04);
const toXY = ([x, y]) => [W / 2 + x * S, (0.62 - y) * S];
const P = pts.map(toXY);
const H = Math.ceil((0.62 + 1.24) * S);

// Courbe lisse qui passe par tous les points (Catmull-Rom convertie en Bézier).
const f = (n) => n.toFixed(1);
let d = `M${f(P[0][0])} ${f(P[0][1])}`;
for (let i = 0; i < P.length; i++) {
  const p0 = P[(i - 1 + P.length) % P.length], p1 = P[i], p2 = P[(i + 1) % P.length], p3 = P[(i + 2) % P.length];
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
}
d += "Z";

// Aile droite seule (pour la faire battre séparément) : de l'épaule au bord de fuite.
const wing = (side) => {
  const sh = 0.2;
  const w = [[sh, lead(sh)]];
  for (let i = 1; i <= 22; i++) { const x = sh + (SPAN - sh) * (i / 22) ** 0.9; w.push([x, lead(x)]); }
  for (let i = 22; i >= 0; i--) { const x = sh + (SPAN - 0.02 - sh) * (i / 22) ** 0.9; w.push([x, trail(x)]); }
  const q = w.map(([x, y]) => toXY([x * side, y]));
  let s = `M${f(q[0][0])} ${f(q[0][1])}`;
  for (let i = 0; i < q.length - 1; i++) {
    const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
    s += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return s + "Z";
};

const out = `// Généré par scripts/ocean/manta-path.mjs : silhouette réaliste de raie manta (vue de dessus, tête en haut).
export const MANTA_VIEWBOX = "0 0 ${W} ${H}";
export const MANTA_W = ${W};
export const MANTA_H = ${H};
export const MANTA_SHOULDER = ${f(0.2 * S)};
export const MANTA_PATH = "${d}";
export const MANTA_WING_R = "${wing(1)}";
export const MANTA_WING_L = "${wing(-1)}";
`;
fs.mkdirSync("components/ocean", { recursive: true });
fs.writeFileSync("components/ocean/manta-path.ts", out);
console.log("ok", W, H, d.length);
