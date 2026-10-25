import { Analytics } from "@/components/Analytics";
import { OnboardingGate } from "@/components/OnboardingGate";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { SplashScreen } from "@/components/SplashScreen";
import { ThemeSync } from "@/components/ThemeSync";
import { ZoomGuard } from "@/components/ZoomGuard";

// Deux polices seulement, préchargées : Figtree pour le texte, Bricolage Grotesque pour les titres.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  // Les titres n'utilisent qu'une épaisseur : un seul petit fichier (l'affichage du titre ne l'attend presque pas).
  weight: "800",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fishflow.fr"),
  title: { default: "FishFlow : ton cours devient une fiche de révision", template: "%s · FishFlow" },
  description: "Transforme un cours en fiche, flashcards et quiz, puis révise avec des rappels. Le savoir est une force.",
  openGraph: { siteName: "FishFlow", type: "website", locale: "fr_FR" },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FishFlow",
  },
  // Icônes générées depuis le logo vectoriel par scripts/brand.mjs (tailles multiples de 48 px pour Google).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/brand/tuile.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  // Couleur de la barre du navigateur : le haut de l'eau, selon le thème du téléphone.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E4F5FE" },
    { media: "(prefers-color-scheme: dark)", color: "#0B243B" },
  ],
  // Le site garde toujours sa taille normale, comme une appli : pas de zoom (voir aussi components/ZoomGuard.tsx).
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <head>
        {/* Exécuté tout de suite, avant le premier affichage (pas de flash de thème, pas d'attente du JavaScript).
            Clé « ff-theme2 » : en octobre 2026, le thème sombre a été remis par défaut pour tout le monde.
            « ff-consented » : la personne a déjà répondu pour les cookies, la bannière reste cachée. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(localStorage.getItem('ff-theme2')!=='light')d.classList.add('dark');var c=localStorage.getItem('ff-consent');if(c==='yes'||c==='no')d.classList.add('ff-consented')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${figtree.variable} ${bricolage.variable} antialiased`}>
        <RegisterSW />
        <SplashScreen />
        <ThemeSync />
        <ZoomGuard />
        <OnboardingGate />
        {children}

        <Analytics />
      </body>
    </html>
  );
}