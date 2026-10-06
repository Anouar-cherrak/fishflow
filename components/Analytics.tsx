"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const KEY = "ff-consent";

/**
 * Mesure d'audience (Google) chargée UNIQUEMENT après un « Accepter ».
 * Sans choix, rien n'est chargé. Le choix est gardé dans le navigateur.
 */
export function Analytics() {
  const [choice, setChoice] = useState<"yes" | "no" | "unset" | null>(null);

  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem(KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(v === "yes" || v === "no" ? v : "unset");
  }, []);

  function decide(v: "yes" | "no") {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setChoice(v);
  }

  return (
    <>
      {choice === "yes" && (
        <>
          <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18394032288" strategy="afterInteractive" />
          <Script id="google-ads-tag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18394032288');
              ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {choice === "unset" && (
        <div
          role="dialog"
          aria-label="Cookies"
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 80,
            maxWidth: 520,
            marginInline: "auto",
            background: "var(--ff-surface, #111)",
            color: "var(--ff-fg, #fff)",
            border: "1px solid var(--ff-line, rgba(128,128,128,.35))",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,.35)",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          <p style={{ margin: 0 }}>
            On utilise des cookies de mesure d&apos;audience (Google) pour savoir comment FishFlow est utilisé.
            Tu peux refuser, le site marche pareil.{" "}
            <a href="/confidentialite" style={{ textDecoration: "underline" }}>
              En savoir plus
            </a>
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => decide("yes")}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 999,
                border: 0,
                background: "var(--ff-fg, #fff)",
                color: "var(--ff-bg, #000)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Accepter
            </button>
            <button
              onClick={() => decide("no")}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 999,
                border: "1px solid var(--ff-line, rgba(128,128,128,.5))",
                background: "transparent",
                color: "inherit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refuser
            </button>
          </div>
        </div>
      )}
    </>
  );
}
