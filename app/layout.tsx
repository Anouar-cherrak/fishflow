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
  title: "FishFlow",
  description: "Transforme tes cours en fiches de révision, flashcards et quiz.",
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

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

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
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18394032288"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18394032288');
            ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ""}
          `}
        </Script>
      </body>
    </html>
  );
}