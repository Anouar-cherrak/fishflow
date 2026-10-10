"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS: { href: string; label: string; icon: ReactNode; main?: boolean }[] = [
  {
    href: "/aujourdhui",
    label: "Aujourd'hui",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    href: "/reviser",
    label: "Réviser",
    icon: (
      <>
        <rect x="3" y="7" width="14" height="13" rx="2" />
        <path d="M7 4h12a2 2 0 0 1 2 2v11" />
      </>
    ),
  },
  {
    href: "/generer",
    label: "Générer",
    main: true,
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/mes-fiches",
    label: "Mes fiches",
    icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  },
];

// Pages où la barre gênerait (Apprendre a déjà sa barre de question en bas).
const HIDDEN = ["/apprendre", "/login", "/signup", "/reset-password"];

// Barre d'onglets en bas de l'écran, sur téléphone seulement : les 4 pages du quotidien sous le pouce.
export function BottomTabs() {
  const pathname = usePathname();
  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="ff-tabs" aria-label="Navigation rapide">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`) || (tab.href === "/mes-fiches" && pathname.startsWith("/fiche/"));
        return (
          <Link key={tab.href} href={tab.href} className="ff-tab" data-main={tab.main ? "true" : undefined} aria-current={active ? "page" : undefined}>
            <span className="ff-tab-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab.main ? 2.6 : 2} strokeLinecap="round" strokeLinejoin="round">
                {tab.icon}
              </svg>
            </span>
            <span className="ff-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
