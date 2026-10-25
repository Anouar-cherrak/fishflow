import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FishFlow — Fiches de révision par IA",
    short_name: "FishFlow",
    description:
      "Transforme tes cours en fiches de révision, résumés, flashcards et quiz grâce à l'IA.",
    start_url: "/generer",
    scope: "/",
    display: "standalone",
    background_color: "#011B46",
    theme_color: "#011B46",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android peut rogner l'icône en rond : la raie est placée dans la zone sûre, avec de la marge.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}