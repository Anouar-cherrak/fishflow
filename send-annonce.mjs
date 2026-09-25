import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const match = envContent.match(/^CRON_SECRET=(.*)$/m);
if (!match) {
  console.error("CRON_SECRET introuvable dans .env.local");
  process.exit(1);
}
const secret = match[1].trim();

const res = await fetch("https://fishflow.fr/api/admin/annonce", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    subject: "Quelques nouveautes sur FishFlow",
    message:
      "Salut, petit message pour te dire que j'ai ajoute plein de nouveautes sur FishFlow. Tu peux maintenant activer le mode sombre depuis les parametres de ton compte, telecharger toutes tes donnees si tu veux les garder de ton cote, et gerer plus de choses toi-meme (mot de passe, notifications, suppression de compte). J'ai aussi ameliore l'accessibilite du site pour que ce soit plus simple a utiliser. Va jeter un oeil dans l'onglet Parametres pour voir tout ca.",
  }),
});

const data = await res.json();
console.log(data);
