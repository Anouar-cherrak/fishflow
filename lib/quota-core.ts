// Logique des limites d'usage, sans dépendre de la base : le stockage est fourni de l'extérieur.
// Elle est utilisée par lib/quota.ts (vraie base Supabase) et par le test tests/limites.test.mjs (stockage en mémoire).

import { COST_UNIT, KEYS, LIMITS, nextMonthLabel } from "./limits.ts";

export type Kind = "fiche" | "regen" | "apprendre";

// Un compteur par personne : réservation atomique (jamais de dépassement, même avec 20 demandes en même temps).
export interface CounterStore {
  consume(userId: string, key: string, limit: number): Promise<boolean>;
  refund(userId: string, key: string): Promise<void>;
  read(userId: string, keys: string[]): Promise<Record<string, number>>;
  add(userId: string, key: string, amount: number): Promise<void>;
  // Limite de rythme partagée (par compte et par IP). Renvoie null si le stockage ne la gère pas encore.
  rate(key: string, limit: number): Promise<boolean | null>;
}

export type Denied = {
  ok: false;
  status: number;
  error: string;
  // Compte gratuit : l'interface propose Pro. Compte Pro : rien d'autre qu'attendre.
  quotaExceeded?: boolean;
  code?: string;
  scope: "minute" | "jour" | "mois" | "total" | "budget";
};
export type Granted = { ok: true; refund: () => Promise<void> };

type Counter = { key: string; limit: number; scope: "jour" | "mois" | "total"; message: string };

function counters(kind: Kind, pro: boolean, now: Date): Counter[] {
  const reset = nextMonthLabel(now);
  const P = LIMITS.pro;
  const F = LIMITS.free;
  if (kind === "fiche") {
    return pro
      ? [
          { key: KEYS.proFichesMonth(now), limit: P.fichesPerMonth, scope: "mois", message: `Tu as atteint la limite de ${P.fichesPerMonth} fiches de ce mois-ci. Elle se remet à zéro ${reset}.` },
          { key: KEYS.proFichesDay(now), limit: P.fichesPerDay, scope: "jour", message: `Tu as atteint la limite de ${P.fichesPerDay} fiches pour aujourd'hui. Elle se remet à zéro à minuit.` },
        ]
      : [
          {
            key: KEYS.freeFichesMonth(now),
            limit: F.fichesPerMonth,
            scope: "mois",
            message: `Tu as utilisé tes ${F.fichesPerMonth} fiches gratuites de ce mois-ci. Elles reviennent ${reset}. Avec FishFlow Pro, tu peux en créer jusqu'à ${P.fichesPerMonth} par mois.`,
          },
        ];
  }
  if (kind === "regen") {
    return pro
      ? [
          { key: KEYS.regensMonth(now), limit: P.regensPerMonth, scope: "mois", message: `Tu as atteint la limite de ${P.regensPerMonth} régénérations de ce mois-ci. Elle se remet à zéro ${reset}.` },
          { key: KEYS.regensDay(now), limit: P.regensPerDay, scope: "jour", message: `Tu as atteint la limite de ${P.regensPerDay} régénérations pour aujourd'hui. Elle se remet à zéro à minuit.` },
        ]
      : [
          {
            key: KEYS.regensMonth(now),
            limit: F.regensPerMonth,
            scope: "mois",
            message: `Tu as utilisé tes ${F.regensPerMonth} régénérations gratuites de ce mois-ci. Elles reviennent ${reset}. Avec FishFlow Pro, tu peux en faire ${P.regensPerDay} par jour.`,
          },
        ];
  }
  return pro
    ? [
        { key: KEYS.apprendreMonth(now), limit: P.apprendrePerMonth, scope: "mois", message: `Tu as atteint la limite de ${P.apprendrePerMonth} questions de ce mois-ci. Elle se remet à zéro ${reset}.` },
        { key: KEYS.apprendreDay(now), limit: P.apprendrePerDay, scope: "jour", message: `Tu as atteint la limite de ${P.apprendrePerDay} questions pour aujourd'hui. Elle se remet à zéro à minuit.` },
      ]
    : [{ key: KEYS.apprendreTrial(), limit: F.apprendreTotal, scope: "total", message: `Tu as utilisé ta question gratuite. Passe Pro pour en poser ${P.apprendrePerDay} par jour.` }];
}

export async function reserve(
  store: CounterStore,
  opts: { userId: string; pro: boolean; kind: Kind; ipKey?: string | null; now?: Date }
): Promise<Granted | Denied> {
  const now = opts.now ?? new Date();
  const slow: Denied = {
    ok: false,
    status: 429,
    scope: "minute",
    error: "Doucement : trop de demandes en une minute. Attends un petit instant, puis réessaie.",
  };

  // 1. Rythme : par compte, puis par adresse IP.
  const userRate = await store.rate(`u:${opts.userId}:${KEYS.userMinute(now)}`, LIMITS.rate.perUserPerMinute);
  if (userRate === null) {
    // Table de rythme pas encore installée : on retombe sur le compteur du compte (sans limite par IP).
    if (!(await store.consume(opts.userId, KEYS.userMinute(now), LIMITS.rate.perUserPerMinute))) return slow;
  } else if (!userRate) {
    return slow;
  }
  if (opts.ipKey) {
    const ipRate = await store.rate(`ip:${opts.ipKey}:${KEYS.userMinute(now)}`, LIMITS.rate.perIpPerMinute);
    if (ipRate === false) return slow;
  }

  // 2. Filet de sécurité sur le coût du mois (Pro).
  if (opts.pro) {
    const costKey = KEYS.costMonth(now);
    const spent = (await store.read(opts.userId, [costKey]))[costKey] ?? 0;
    if (spent >= LIMITS.pro.monthlyCostCapUsd * COST_UNIT) {
      return {
        ok: false,
        status: 429,
        scope: "budget",
        error: `Tu as atteint la limite d'usage de ton abonnement pour ce mois-ci (beaucoup de très longs cours). Elle se remet à zéro ${nextMonthLabel(now)}.`,
      };
    }
  }

  // 3. Compteurs du mois puis du jour, réservés un par un. Si l'un est plein, on rend ceux déjà pris.
  const taken: string[] = [];
  for (const c of counters(opts.kind, opts.pro, now)) {
    if (!(await store.consume(opts.userId, c.key, c.limit))) {
      for (const k of taken) await store.refund(opts.userId, k);
      const free = !opts.pro;
      return {
        ok: false,
        status: free ? 403 : 429,
        scope: c.scope,
        error: c.message,
        ...(free && opts.kind === "fiche" ? { quotaExceeded: true } : {}),
        ...(free && opts.kind !== "fiche" ? { code: "pro_required", requiresPro: true } : {}),
      } as Denied;
    }
    taken.push(c.key);
  }
  return {
    ok: true,
    // La génération a échoué : on rend tout (on ne fait jamais payer un échec). Le rythme n'est pas rendu.
    refund: async () => {
      for (const k of taken) await store.refund(opts.userId, k);
    },
  };
}

// Coût réel de la génération, ajouté au compteur du mois (sert au filet de sécurité).
export async function recordCost(store: CounterStore, userId: string, usd: number, now = new Date()) {
  const units = Math.ceil(Math.max(0, usd) * COST_UNIT);
  if (units > 0) await store.add(userId, KEYS.costMonth(now), units);
}

export type QuotaStatus = {
  isPro: boolean;
  // Fiches restantes ce mois-ci, et aujourd'hui (Pro).
  fichesLeftMonth: number;
  fichesLeftDay: number | null;
  fichesMonthLimit: number;
  apprendreLeft: number;
  regensLeft: number;
  resetMonth: string;
};

export async function status(store: CounterStore, userId: string, pro: boolean, now = new Date()): Promise<QuotaStatus> {
  const keys = pro
    ? [KEYS.proFichesMonth(now), KEYS.proFichesDay(now), KEYS.apprendreDay(now), KEYS.apprendreMonth(now), KEYS.regensDay(now), KEYS.regensMonth(now)]
    : [KEYS.freeFichesMonth(now), KEYS.apprendreTrial(), KEYS.regensMonth(now)];
  const v = await store.read(userId, keys);
  const left = (limit: number, used: number | undefined) => Math.max(0, limit - (used ?? 0));
  const P = LIMITS.pro;
  const F = LIMITS.free;
  if (pro) {
    const monthLeft = left(P.fichesPerMonth, v[KEYS.proFichesMonth(now)]);
    const dayLeft = left(P.fichesPerDay, v[KEYS.proFichesDay(now)]);
    return {
      isPro: true,
      fichesLeftMonth: monthLeft,
      fichesLeftDay: Math.min(dayLeft, monthLeft),
      fichesMonthLimit: P.fichesPerMonth,
      apprendreLeft: Math.min(left(P.apprendrePerDay, v[KEYS.apprendreDay(now)]), left(P.apprendrePerMonth, v[KEYS.apprendreMonth(now)])),
      regensLeft: Math.min(left(P.regensPerDay, v[KEYS.regensDay(now)]), left(P.regensPerMonth, v[KEYS.regensMonth(now)])),
      resetMonth: nextMonthLabel(now),
    };
  }
  return {
    isPro: false,
    fichesLeftMonth: left(F.fichesPerMonth, v[KEYS.freeFichesMonth(now)]),
    fichesLeftDay: null,
    fichesMonthLimit: F.fichesPerMonth,
    apprendreLeft: left(F.apprendreTotal, v[KEYS.apprendreTrial()]),
    regensLeft: left(F.regensPerMonth, v[KEYS.regensMonth(now)]),
    resetMonth: nextMonthLabel(now),
  };
}
