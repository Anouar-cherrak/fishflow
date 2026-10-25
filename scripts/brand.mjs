// Génère toutes les images de la marque à partir des dessins vectoriels de brand/ :
//   brand/raie.svg          la raie d'Anouar, tracée fidèlement depuis brand/logo-source.png (potrace, octobre 2026)
//   brand/tuile.svg         la raie en blanc dans la tuile bleue (icône d'appli)
//   brand/logo-clair.svg, brand/logo-sombre.svg   tuile + nom « FishFlow » (lettres converties en tracés, police Bricolage Grotesque 800)
// Lancer : node scripts/brand.mjs
import sharp from "sharp";
import fs from "node:fs";

const OUT = "public/brand";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync("public/icons", { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^(raie|manta|logo)/.test(f)) fs.rmSync(`${OUT}/${f}`);

const raie = fs.readFileSync("brand/raie.svg", "utf8");
const tuile = fs.readFileSync("brand/tuile.svg", "utf8");
const d = raie.match(/ d="([^"]+)"/)[1];
for (const f of ["raie.svg", "tuile.svg", "logo-clair.svg", "logo-sombre.svg"]) fs.copyFileSync(`brand/${f}`, `${OUT}/${f}`);

const png = (svg, size) => sharp(Buffer.from(svg), { density: Math.max(72, Math.ceil((72 * size) / 512) * 2) }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
// Carré plein (Apple et Android découpent eux-mêmes l'icône) : le dégradé de la tuile jusqu'aux bords, la raie dans la zone sûre.
const full = (scale) => {
  const s = 512 * scale, o = (512 - s) / 2;
  return tuile
    .replace(/rx="144"/g, 'rx="0"')
    .replace(/<g transform="[^"]*">/, `<g transform="translate(${o} ${o + s * 0.06}) scale(${scale})">`);
};

fs.writeFileSync("public/icons/icon-192.png", await png(tuile, 192));
fs.writeFileSync("public/icons/icon-512.png", await png(tuile, 512));
fs.writeFileSync("public/icons/icon-maskable-512.png", await png(full(0.58), 512));
fs.writeFileSync("public/apple-touch-icon.png", await png(full(0.74), 180));

// Favicon : la tuile (la raie blanche sur bleu reste lisible à 16 px, sur un onglet clair comme sombre).
const fav = {};
for (const s of [16, 32, 48, 96, 192]) fav[s] = await png(tuile, s);
for (const s of [48, 96, 192]) fs.writeFileSync(`public/favicon-${s}x${s}.png`, fav[s]);

// favicon.ico (16, 32, 48) : un fichier ICO qui contient simplement les PNG.
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(([size, buf], i) => {
    const o = i * 16;
    dir.writeUInt8(size, o);
    dir.writeUInt8(size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map(([, buf]) => buf)]);
}
// Dans public/ (et pas app/) : Next.js n'ajoute pas de balise en double, seules celles de app/layout.tsx comptent.
fs.writeFileSync("public/favicon.ico", ico([[16, fav[16]], [32, fav[32]], [48, fav[48]]]));

// Logo des e-mails (les messageries n'affichent pas le SVG).
fs.writeFileSync(`${OUT}/logo-email.png`, await png(tuile, 120));

console.log("Raie :", d.length, "caractères de tracé. Fichiers :", fs.readdirSync(OUT).join(", "));
