import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "FishFlow — Le savoir est une force.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image affichée quand on partage le lien de FishFlow (réseaux, messageries) : la raie, le nom et la promesse.
// Générée une seule fois au moment de la construction du site.
export default async function OpengraphImage() {
  const raie = await readFile(path.join(process.cwd(), "public/brand/logo-og.png"));
  const raieSrc = `data:image/png;base64,${raie.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(160deg, #0B1630 0%, #0a2a3a 55%, #07111c 100%)",
          color: "#f5f5f5",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700 }}>
            Fish<span style={{ fontWeight: 400, color: "#2AA9E8" }}>Flow</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>Le savoir est une force.</div>
            <div style={{ fontSize: 34, color: "#a8c4d4" }}>Fiches, flashcards, quiz et révisions qui restent en tête.</div>
          </div>
          <div style={{ display: "flex", width: 160, height: 10, borderRadius: 5, background: "#38BDF8" }} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={raieSrc} width={400} height={328} alt="" />
      </div>
    ),
    size
  );
}
