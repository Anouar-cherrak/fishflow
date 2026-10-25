// Faux compte FishFlow pour les tests de bout en bout : Supabase et /api/* sont simulés DANS LE NAVIGATEUR.
// Aucune vraie base, aucun vrai compte, aucun vrai paiement. Options : { fiches: n, pro: bool, empty: bool, longText: bool }
const SUPA = "https://exemple.supabase.co";
const now = Date.now();
const iso = (d) => new Date(now - d * 86400000).toISOString();

const b64url = (s) => Buffer.from(s).toString("base64url");
const USER = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "testeur@exemple.test", created_at: iso(30), user_metadata: { name: "Testeur" }, app_metadata: { provider: "email" } };
const JWT = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify({ sub: USER.id, exp: Math.floor(now / 1000) + 86400 * 30, role: "authenticated", aud: "authenticated", email: USER.email }))}.c2ln`;
const SESSION = { access_token: JWT, refresh_token: "r", token_type: "bearer", expires_in: 86400 * 30, expires_at: Math.floor(now / 1000) + 86400 * 30, user: USER };

export function ficheData(i = 0, long = false) {
  const t = long ? "La photosynthèse chez les végétaux chlorophylliens et son rôle dans le cycle du carbone à l'échelle de la planète entière (cours complet de terminale spécialité SVT)" : ["La photosynthèse", "La Révolution française", "Les fonctions affines", "Le droit des contrats", "La mitose"][i % 5];
  return {
    title: t + (i >= 5 ? ` (${i + 1})` : ""),
    version: 2,
    summary: "Les plantes captent la lumière pour fabriquer du glucose à partir d'eau et de CO₂, et libèrent de l'oxygène.",
    essentiel: [
      "La photosynthèse transforme l'énergie lumineuse en énergie chimique.",
      "Elle a lieu dans les chloroplastes, grâce à la chlorophylle.",
      "Réactifs : eau + CO₂ ; produits : glucose + O₂.",
      "Phase claire : capture de la lumière. Phase sombre : cycle de Calvin.",
      "Elle est à la base de presque toutes les chaînes alimentaires.",
    ],
    fiche: {
      sections: [
        { title: "Définition", blocks: [{ type: "texte", text: "La **photosynthèse** est le processus par lequel les végétaux chlorophylliens fabriquent de la matière organique à partir de lumière." }, { type: "retenir", text: "6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂" }] },
        { title: "Où et comment ?", blocks: [{ type: "liste", text: "Les acteurs :", items: ["Les chloroplastes, dans les cellules des feuilles", "La chlorophylle, pigment vert qui capte la lumière", "Les stomates, par où entre le CO₂"] }, { type: "piege", text: "La phase « sombre » ne se fait pas la nuit : elle ne dépend simplement pas directement de la lumière." }] },
        { title: "Exemple", blocks: [{ type: "exemple", text: "Une plante à l'obscurité pendant plusieurs jours épuise ses réserves d'amidon." }] },
      ],
    },
    flashcards: [
      { question: "Où se déroule la photosynthèse ?", answer: "Dans les chloroplastes." },
      { question: "Quel pigment capte la lumière ?", answer: "La chlorophylle." },
      { question: "Que libère la plante ?", answer: "De l'oxygène (O₂)." },
      { question: "Quels sont les réactifs ?", answer: "L'eau et le dioxyde de carbone." },
    ],
    quiz: [
      { question: "Que produit la photosynthèse ?", options: ["Du CO₂", "Du glucose et de l'O₂", "De l'azote", "De l'eau seulement"], correctIndex: 1 },
      { question: "Où entre le CO₂ ?", options: ["Par les racines", "Par les stomates", "Par la tige", "Par les fleurs"], correctIndex: 1 },
    ],
    sourceText: "La photosynthèse permet aux plantes de fabriquer leur nourriture…",
  };
}

export async function mockAccount(context, opts = {}) {
  const n = opts.empty ? 0 : opts.fiches ?? 4;
  const fiches = Array.from({ length: n }, (_, i) => ({ id: `f${i}`, title: ficheData(i, opts.longText).title, created_at: iso(i), folder_id: null, best_score: i % 2 ? 80 : null, share_id: null, data: ficheData(i, opts.longText), flashcards: ficheData(i).flashcards }));
  const cookie = "base64-" + Buffer.from(JSON.stringify(SESSION)).toString("base64url");
  await context.addCookies([{ name: "sb-exemple-auth-token", value: cookie, domain: "localhost", path: "/" }]);
  await context.addInitScript(() => {
    try { localStorage.setItem("ff-tuto-v1", "1"); localStorage.setItem("ff-consent", "no"); localStorage.setItem("ff-install-hidden", "1"); } catch {}
  });

  await context.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
    const json = (body, headers = {}) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "content-range", ...headers }, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return json({});
    if (p.startsWith("/auth/v1/user")) return json(USER);
    if (p.startsWith("/auth/v1/token")) return json(SESSION);
    if (p.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
    if (p.startsWith("/rest/v1/rpc/")) return json(null);
    const table = p.replace("/rest/v1/", "");
    let rows = [];
    if (table === "fiches") {
      const idEq = url.searchParams.get("id");
      rows = idEq?.startsWith("eq.") ? fiches.filter((f) => f.id === idEq.slice(3)) : fiches;
      if (idEq?.startsWith("eq.") && !rows.length) rows = [{ ...fiches[0], id: idEq.slice(3) }];
    } else if (table === "profiles") rows = [{ id: USER.id, is_pro: !!opts.pro, dark_mode: true, email_opt_out: false, daily_goal: 20, name: "Testeur" }];
    else if (table === "card_reviews") rows = fiches.slice(0, 2).flatMap((f) => [0, 1, 2].map((ci) => ({ fiche_id: f.id, card_index: ci, box: ci + 1, due_at: iso(-ci), times_correct: 2, times_wrong: ci, last_reviewed_at: iso(1) })));
    else if (table === "review_log") rows = Array.from({ length: 12 }, (_, i) => ({ reviewed_at: iso(i % 6), correct: i % 3 !== 0 }));
    else if (table === "folders" || table === "exams") rows = [];
    const range = `0-${Math.max(0, rows.length - 1)}/${rows.length}`;
    if (req.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": range, "access-control-allow-origin": "*", "access-control-expose-headers": "content-range" } });
    if (req.method() !== "GET") return json(single ? rows[0] ?? {} : rows);
    return json(single ? rows[0] ?? null : rows, { "content-range": range });
  });

  const usage = opts.pro
    ? { isPro: true, fichesLeftMonth: 92, fichesLeftDay: 8, fichesMonthLimit: 100, apprendreLeft: 20, regensLeft: 10, resetMonth: "le 1er novembre", used: 8, limit: 100, remaining: null }
    : { isPro: false, fichesLeftMonth: 2, fichesLeftDay: null, fichesMonthLimit: 3, apprendreLeft: 1, regensLeft: 3, resetMonth: "le 1er novembre", used: 1, limit: 3, remaining: 2 };
  await context.route("**/api/usage", (r) => r.fulfill({ json: usage }));
  await context.route("**/api/preferences", (r) => r.fulfill({ json: { darkMode: true, emailOptOut: false } }));
  await context.route("**/api/track", (r) => r.fulfill({ json: { ok: true } }));
}
