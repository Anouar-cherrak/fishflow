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
    background_color: "#0B0F1A",
    theme_color: "#0B0F1A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}