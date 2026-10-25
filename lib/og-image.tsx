import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Image affichée quand on partage un lien FishFlow (réseaux, messageries) : l'eau qui descend, la tuile du logo,
// le nom et la promesse de la page. Générée une seule fois au moment de la construction du site.
export const ogSize = { width: 1200, height: 630 };

const BUBBLES = [
  [1010, 520, 22], [1060, 430, 12], [960, 380, 16], [1100, 300, 9], [1020, 220, 14], [940, 140, 8],
];

export async function ogImage(title: string, subtitle: string) {
  const dir = path.join(process.cwd(), "brand");
  const [display, body, tuile] = await Promise.all([
    readFile(path.join(dir, "fonts/BricolageGrotesque-800.ttf")),
    readFile(path.join(dir, "fonts/Figtree-700.ttf")),
    readFile(path.join(dir, "tuile.svg")),
  ]);
  const tile = `data:image/svg+xml;base64,${tuile.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(180deg, #0B5BA8 0%, #034389 30%, #011B46 75%, #020A16 100%)",
          color: "#EEF6FF",
          padding: "64px 72px",
          fontFamily: "Figtree",
        }}
      >
        {BUBBLES.map(([x, y, r], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, border: "2px solid rgba(209,233,255,0.45)" }} />
        ))}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", maxWidth: 860 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tile} width={72} height={72} alt="" />
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 46, letterSpacing: -1.4 }}>
              Fish<span style={{ color: "#46B5FF" }}>Flow</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ fontFamily: "Bricolage", fontSize: 92, lineHeight: 1.02, letterSpacing: -3 }}>{title}</div>
            <div style={{ fontSize: 34, lineHeight: 1.35, color: "#A6CAF2" }}>{subtitle}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Bricolage", data: display, weight: 800 },
        { name: "Figtree", data: body, weight: 700 },
      ],
    }
  );
}
