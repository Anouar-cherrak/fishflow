import type { NextConfig } from "next";

// Consignes de sécurité envoyées au navigateur sur toutes les pages.
const securityHeaders = [
  // Interdit d'afficher FishFlow dans un cadre sur un autre site (piège au clic).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Le navigateur ne devine pas le type d'un fichier : un faux « image » ne peut pas devenir un script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Les autres sites ne voient pas l'adresse exacte des pages d'où l'on vient (ex. lien de fiche partagée).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Pas de micro ni de position : le site n'en a pas besoin.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
