import type { NextConfig } from "next";

// Liste des sites dont la page a le droit de charger quelque chose (Content-Security-Policy).
// Si un script pirate arrivait quand même dans une page, il ne pourrait ni charger d'autres scripts ni envoyer de données ailleurs.
// « unsafe-inline » reste nécessaire pour les petits scripts que Next.js écrit dans les pages publiées à l'avance (pages statiques,
// gardées pour la vitesse d'affichage) ; tout le reste est fermé.
const GOOGLE = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.g.doubleclick.net",
  "https://*.doubleclick.net",
  "https://www.googleadservices.com",
  "https://www.google.com",
  "https://www.google.fr",
];
const SUPABASE = ["https://*.supabase.co", "wss://*.supabase.co"];

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${GOOGLE.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // Images : celles du site, celles de Wikipédia/Wikimedia (Apprendre) et les pixels de mesure Google (après accord).
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE.join(" ")} ${GOOGLE.join(" ")}`,
  "frame-src https://td.doubleclick.net https://www.googletagmanager.com",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // Les formulaires ne peuvent envoyer leurs données qu'à FishFlow (et au paiement Stripe).
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Consignes de sécurité envoyées au navigateur sur toutes les pages.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Interdit d'afficher FishFlow dans un cadre sur un autre site (piège au clic). Doublé pour les vieux navigateurs.
  { key: "X-Frame-Options", value: "DENY" },
  // Toujours en https pendant 2 ans, sous-domaines compris : impossible de forcer une connexion non chiffrée.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Le navigateur ne devine pas le type d'un fichier : un faux « image » ne peut pas devenir un script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Les autres sites ne voient pas l'adresse exacte des pages d'où l'on vient (ex. lien de fiche partagée).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Appareil photo seulement pour FishFlow (photo d'un cours) ; pas de micro, de position, de paiement intégré ni de capteurs.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

// Pages du compte (fiches, révisions, génération, paiement, réglages) : jamais gardées par un cache partagé (CDN, proxy).
// Elles ne contiennent pas de données dans le HTML, mais la règle est stricte : rien du compte n'est mis en cache public.
// tests/cache.test.mjs vérifie que chaque page et route ci-dessous reçoit bien « private, no-store ».
export const PRIVATE_ROUTES = [
  "/api/:path*",
  "/generer",
  "/mes-fiches",
  "/fiche/:path*",
  "/result",
  "/aujourdhui",
  "/reviser",
  "/apprendre",
  "/examens",
  "/parametres",
  "/reset-password/:path*",
];
const NO_STORE = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];

// Fichiers publics sans empreinte dans leur nom (logo, icônes, textures de l'eau) : une semaine en cache, puis vérifiés en
// arrière-plan. Les fichiers de /_next/static ont une empreinte : Next.js les sert déjà « immutable » pour un an.
const STATIC_ASSET = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/brand/:path*", "/icons/:path*", "/ocean/:path*", "/favicon.ico", "/favicon-:size.png", "/apple-touch-icon.png"].map((source) => ({ source, headers: STATIC_ASSET })),
      ...PRIVATE_ROUTES.map((source) => ({ source, headers: NO_STORE })),
    ];
  },
};

export default nextConfig;
