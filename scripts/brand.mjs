// Génère toutes les images de la marque à partir du logo d'origine (brand/logo-source.png, fond transparent).
// Lancer : node scripts/brand.mjs
//
// 1. Recadre le logo au plus près (d'après sa transparence).
// 2. Fabrique les tailles du site, les icônes (favicon, Apple, PWA, maskable), le logo des emails.
import sharp from "sharp";
import fs from "node:fs";

const SRC = "brand/logo-source.png";
const OUT = "public/brand";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync("public/icons", { recursive: true });
// Les images des logos précédents ne servent plus.
for (const f of fs.readdirSync(OUT)) if (/^(raie|manta)/.test(f)) fs.rmSync(`${OUT}/${f}`);

// --- 1. Recadrage au plus près, avec une petite marge ---
const logo = await sharp(SRC)
  .ensureAlpha()
  .trim({ threshold: 1 })
  .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const png = (s) => s.png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 });
const save = (buf, file, width) => png(sharp(buf).resize({ width })).toFile(`${OUT}/${file}`);
await save(logo, "logo.png", 512); // grandes tailles
await save(logo, "logo-sm.png", 128); // logo de l'en-tête (affiché en 32 à 44 px de haut, net sur écran Retina)

// --- 2. Icônes ---
// Fond très clair, légèrement bleuté : le bleu du logo ressort sur un écran d'accueil clair comme sombre.
const TINT = "#e8f5fd";
async function onSquare(buf, size, scale, background) {
  const inner = Math.round(size * scale);
  const mark = await sharp(buf).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
  const base = sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${background}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
    )
  );
  return base.composite([{ input: mark, gravity: "center" }]).png().toBuffer();
}
fs.writeFileSync("public/icons/icon-192.png", await onSquare(logo, 192, 0.8, TINT));
fs.writeFileSync("public/icons/icon-512.png", await onSquare(logo, 512, 0.8, TINT));
// Maskable : Android peut rogner l'icône en rond ; le logo reste dans la zone sûre (cercle de 80 %), avec de la marge.
fs.writeFileSync("public/icons/icon-maskable-512.png", await onSquare(logo, 512, 0.6, TINT));
// Icône Apple (180×180), à la racine du site.
fs.writeFileSync("public/apple-touch-icon.png", await onSquare(logo, 180, 0.78, TINT));

// Favicon : le logo seul, sur fond transparent (bleu lisible sur un onglet clair comme sombre).
// Tailles multiples de 48 px, comme le demande Google pour l'icône des résultats de recherche.
const favicon = (size) =>
  sharp(logo).resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const fav = {};
for (const s of [16, 32, 48, 96, 192]) fav[s] = await favicon(s);
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

// Logo des emails (sur fond blanc) et de l'image de partage.
fs.writeFileSync(`${OUT}/logo-email.png`, await onSquare(logo, 120, 0.92, "#ffffff"));
await save(logo, "logo-og.png", 460);

const meta = await sharp(`${OUT}/logo.png`).metadata();
console.log(`Logo : ${meta.width}×${meta.height} (rapport ${(meta.width / meta.height).toFixed(3)}). Fichiers :`, fs.readdirSync(OUT).join(", "));
