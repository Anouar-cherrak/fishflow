"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, Wordmark } from "@/components/Logo";

const LINKS = [
  { href: "/generer", label: "Générer" },
  { href: "/apprendre", label: "Apprendre" },
  { href: "/mes-fiches", label: "Mes fiches" },
  { href: "/reviser", label: "Réviser" },
];

// Barre de navigation commune : logo + les 4 pages principales.
// Sur petit écran, les liens défilent sans casser la mise en page.
export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-black/10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="FishFlow, accueil">
          <Logo size={22} />
          <Wordmark className="text-sm hidden min-[400px]:inline" />
        </Link>
        <nav aria-label="Navigation principale" className="min-w-0">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className="shrink-0">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center min-h-[44px] px-3 rounded-full text-sm font-medium transition ${
                      active ? "bg-surface text-black" : "text-black/60 hover:text-black"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
