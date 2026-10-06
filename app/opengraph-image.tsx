import { ImageResponse } from "next/og";

export const alt = "FishFlow — Le savoir est une force.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image affichée quand on partage le lien de FishFlow (réseaux, messageries).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#f5f5f5",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path d="M4 20C4 20 8 12 16 12C24 12 28 20 28 20" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />
            <path d="M4 24C4 24 8 16 16 16C24 16 28 24 28 24" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
            <circle cx="16" cy="8" r="3" fill="#22C55E" />
          </svg>
          FishFlow
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 108, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>Le savoir est une force.</div>
          <div style={{ fontSize: 38, color: "#a8a8a8" }}>Fiches, flashcards, quiz et révisions qui restent en tête.</div>
        </div>
        <div style={{ display: "flex", width: 160, height: 10, borderRadius: 5, background: "#22C55E" }} />
      </div>
    ),
    size
  );
}
