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
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
              if (localStorage.getItem('ff-theme') !== 'light') {
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