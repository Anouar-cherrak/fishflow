"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { StreakFlame } from "@/components/StreakFlame";
import { BottomTabs } from "@/components/BottomTabs";

const LINKS = [
  { href: "/aujourdhui", label: "Aujourd'hui", hint: "Ton objectif, tes cartes, ta progression" },
  { href: "/generer", label: "Générer", hint: "Crée une fiche à partir d'un cours" },
  { href: "/mes-fiches", label: "Mes fiches", hint: "Retrouve toutes tes fiches" },
  { href: "/reviser", label: "Réviser", hint: "Tes cartes du jour" },
  { href: "/examens", label: "Examens", hint: "Prépare une date d'examen" },
  { href: "/apprendre", label: "Apprendre", hint: "Pose une question, comprends vite" },
  { href: "/aide", label: "Aide", hint: "De petites animations pour tout comprendre" },
  { href: "/pricing", label: "Pro", hint: "Les avantages et le prix" },
  { href: "/parametres", label: "Paramètres", hint: "Compte et apparence" },
];

// Barre du haut commune à toutes les pages : le logo, le thème et un menu plein écran
// (même style que la page d'accueil). Échap ferme le menu, le focus reste dedans.
export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dark, setDark] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setEmail(data.user?.email ?? null);
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Lecture du thème déjà appliqué sur la page (le script de départ l'a posé avant l'affichage).
    queueMicrotask(() => setDark(document.documentElement.classList.contains("dark")));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ff-theme2", next ? "dark" : "light");
    } catch {}
    // Sauvegarde sur le compte (silencieux si non connecté)
    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: next }),
    }).catch(() => {});
  };

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>("a, button");
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const logout = async () => {
    await createClient().auth.signOut();
    setEmail(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
    <header className="ff-bar">
      <Link href="/" className="flex items-center gap-2 min-h-[44px]" aria-label="FishFlow, accueil">
        <Logo size={26} />
        <Wordmark className="text-lg" />
      </Link>

      <div className="flex items-center gap-2">
        {authReady && email && <StreakFlame />}
        <button
          type="button"
          onClick={toggleTheme}
          className="ff-round"
          aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {dark ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </>
            ) : (
              <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
            )}
          </svg>
        </button>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu-principal"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="ff-round"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M4 8h14M4 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

    </header>
    {authReady && email && <BottomTabs />}
    <div id="menu-principal" ref={panelRef} className="ff-menu" data-open={open} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
      <div className="flex items-center justify-between">
        <Link href="/" onClick={close} className="flex items-center gap-2 min-h-[44px]" aria-label="FishFlow, accueil">
          <Logo size={26} className="!text-current" />
          <span className="font-semibold text-lg">FishFlow</span>
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer le menu"
          className="w-[46px] h-[46px] rounded-full border border-current/25 flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 flex flex-col overflow-y-auto py-4 w-full [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className="ff-menu-link">
              <span>
                <b className="ff-menu-title">{link.label}</b>
                <small>{link.hint}</small>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="w-full pt-2">
        {authReady && email && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm opacity-60 truncate">{email}</p>
            <button type="button" onClick={logout} className="min-h-[44px] px-5 rounded-full border border-current/30 text-sm font-semibold">
              Déconnexion
            </button>
          </div>
        )}
        {authReady && !email && (
          <div className="flex flex-wrap gap-3">
            <Link href="/login" onClick={() => setOpen(false)} className="min-h-[44px] px-5 inline-flex items-center rounded-full border border-current/30 text-sm font-semibold">
              Connexion
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="min-h-[44px] px-5 inline-flex items-center rounded-full bg-[#22C55E] text-[#04130A] text-sm font-semibold">
              Créer un compte
            </Link>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
