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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Réponses des routes de l'API : jamais gardées en cache par le navigateur ni par un intermédiaire.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
