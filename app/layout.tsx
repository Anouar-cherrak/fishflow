import { Analytics } from "@/components/Analytics";
import { Onboarding } from "@/components/Onboarding";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { SplashScreen } from "@/components/SplashScreen";
import { ThemeSync } from "@/components/ThemeSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fishflow.fr"),
  title: "FishFlow",
  description: "Transforme un cours en fiche, flashcards et quiz, puis révise avec des rappels. Le savoir est une force.",
  openGraph: { siteName: "FishFlow", type: "website", locale: "fr_FR" },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FishFlow",
  },
  // Icônes générées depuis la mascotte par scripts/brand.mjs.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  // Couleur de la barre du navigateur : le haut de la mer du thème sombre (--ff-sea-top).
  themeColor: "#173f63",
  // L'appli installée passe sous la barre d'état de l'iPhone : les marges « safe-area » du CSS laissent la place à l'encoche.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              // Clé « ff-theme2 » : en octobre 2026, le thème sombre a été remis par défaut pour tout le monde.
              if (localStorage.getItem('ff-theme2') !== 'light') {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          `}
        </Script>
        <RegisterSW />
        <SplashScreen />
        <ThemeSync />
        <Onboarding />
        {children}

        <Analytics />
      </body>
    </html>
  );
}