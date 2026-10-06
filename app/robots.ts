import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/p/", "/fiche/", "/result", "/mes-fiches", "/reviser", "/examens", "/parametres", "/apprendre", "/generer"],
      },
    ],
    sitemap: "https://fishflow.fr/sitemap.xml",
  };
}
