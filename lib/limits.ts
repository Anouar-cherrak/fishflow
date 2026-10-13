// TOUTES les limites d'usage de FishFlow, au même endroit. Pour changer une valeur, c'est ici et nulle part ailleurs.
// Elles sont appliquées côté serveur (routes /api/generate et /api/apprendre) ; l'interface ne fait que les afficher.

export const LIMITS = {
  free: {
    fichesPerMonth: 3,
    // Taille maximale du cours envoyé pour une fiche (en caractères, environ 6 à 8 pages).
    maxChars: 15000,
    // Refaire seulement les flashcards, le quiz ou l'essentiel d'une fiche (peu coûteux).
    regensPerMonth: 5,
    // Apprendre : un seul essai en tout pour un compte gratuit.
    apprendreTotal: 1,
    // Fiches gardées dans « Mes fiches » (aussi bloqué par la base de données).
    historyMax: 5,
  },
  pro: {
    fichesPerMonth: 100,
    fichesPerDay: 10,
    // Environ 15 pages : une fiche complète coûte alors au plus ~6 centimes.
    maxChars: 30000,
    regensPerDay: 20,
    regensPerMonth: 200,
    apprendrePerDay: 20,
    apprendrePerMonth: 300,
    // Filet de sécurité : coût OpenAI maximum d'un abonné sur un mois, en dollars (l'abonnement rapporte ~4,50 € net).
    // Un usage normal (même 100 fiches) reste bien en dessous ; seul un usage anormal le touche.
    monthlyCostCapUsd: 3.5,
  },
  // Anti-abus : nombre de demandes qui coûtent de l'IA, par minute (fiches, régénérations et Apprendre confondus).
  rate: {
    perUserPerMinute: 4,
    // Plus large pour une IP : plusieurs élèves d'une même école ou d'un même wifi partagent la même adresse.
    perIpPerMinute: 15,
  },
} as const;

// ---------- Dates (heure de Paris) ----------

const parisParts = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
};

export const parisDay = (d = new Date()) => {
  const p = parisParts(d);
  return `${p.y}-${p.m}-${p.d}`;
};
export const parisMonth = (d = new Date()) => {
  const p = parisParts(d);
  return `${p.y}-${p.m}`;
};
export const parisMinute = (d = new Date()) => {
  const p = parisParts(d);
  return `${p.y}-${p.m}-${p.d}T${p.h === "24" ? "00" : p.h}:${p.min}`;
};

// « le 1er novembre » : date de remise à zéro du compteur du mois.
export function nextMonthLabel(d = new Date()): string {
  const p = parisParts(d);
  const next = new Date(Date.UTC(Number(p.y), Number(p.m), 1, 12));
  return `le 1er ${next.toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" })}`;
}

// ---------- Clés des compteurs (colonne « month » de la table usage) ----------
// Les anciennes clés sont gardées telles quelles : les compteurs déjà en cours continuent sans remise à zéro.

export const KEYS = {
  freeFichesMonth: (d?: Date) => parisMonth(d), // ancien format « 2026-10 »
  proFichesMonth: (d?: Date) => `fiches-mois-${parisMonth(d)}`,
  proFichesDay: (d?: Date) => `fiches-${parisDay(d)}`, // ancien format « fiches-2026-10-13 »
  regensMonth: (d?: Date) => `regen-mois-${parisMonth(d)}`,
  regensDay: (d?: Date) => `regen-${parisDay(d)}`,
  apprendreTrial: () => "apprendre-essai",
  apprendreDay: (d?: Date) => `apprendre-${parisDay(d)}`,
  apprendreMonth: (d?: Date) => `apprendre-mois-${parisMonth(d)}`,
  // Coût OpenAI du mois, en dix-millièmes de dollar (nombre entier).
  costMonth: (d?: Date) => `cout-${parisMonth(d)}`,
  userMinute: (d?: Date) => `rythme-${parisMinute(d)}`,
};

export const COST_UNIT = 10000; // 1 $ = 10 000 unités dans le compteur de coût
