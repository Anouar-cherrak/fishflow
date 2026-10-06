import type { MetadataRoute } from "next";

const BASE = "https://fishflow.fr";

// Seulement les pages publiques. Les pages du compte et les fiches partagées n'y sont jamais.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${BASE}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
