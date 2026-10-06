"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";

const LINKS = [
  { href: "/generer", label: "Générer", hint: "Crée une fiche à partir d'un cours" },
  { href: "/apprendre", label: "Apprendre", hint: "Pose une question, avec sources" },
  { href: "/mes-fiches", label: "Mes fiches", hint: "Retrouve tes fiches" },
  { href: "/reviser", label: "Réviser", hint: "Tes cartes du jour" },
  { href: "/parametres", label: "Paramètres", hint: "Compte et apparence" },
];

// Barre du haut commune à toutes les pages : le logo et un menu « burger ».
// Le menu s'ouvre sur le côté, se ferme avec Échap, un clic dehors ou un changement de page.
export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
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

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Menu ouvert : Échap ferme, le défilement de la page est bloqué, le focus entre dans le menu.
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
      // Le focus reste dans le menu tant qu'il est ouvert.
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
    <header className="w-full border-b border-black/10">
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 min-h-[44px]" aria-label="FishFlow, accueil">
          <Logo size={22} />
          <Wordmark className="text-sm" />
        </Link>

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu-principal"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="w-11 h-11 rounded-full flex items-center justify-center text-black hover:bg-surface transition"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M4 7h14M4 11h14M4 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[#000000]/50 backdrop-blur-sm ff-fade" onClick={close} aria-hidden="true" />
          <div
            id="menu-principal"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute right-0 top-0 h-full w-[min(86vw,320px)] bg-white text-black shadow-2xl flex flex-col ff-fade"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-black/10">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer le menu"
                className="w-11 h-11 rounded-full flex items-center justify-center text-black/60 hover:text-black hover:bg-surface transition"
              >
                <span aria-hidden="true" className="text-xl leading-none">✕</span>
              </button>
            </div>

            <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {LINKS.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`block min-h-[44px] px-4 py-2.5 rounded-xl transition ${
                          active ? "bg-surface" : "hover:bg-surface"
                        }`}
                      >
                        <span className="block text-base font-medium">{link.label}</span>
                        <span className="block text-xs text-black/50">{link.hint}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="p-3 border-t border-black/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {authReady && email && (
                <>
                  <p className="px-4 pb-2 text-xs text-black/40 truncate">{email}</p>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full min-h-[44px] rounded-xl border border-black/15 text-sm font-medium text-black/70 hover:text-black hover:bg-surface transition"
                  >
                    Déconnexion
                  </button>
                </>
              )}
              {authReady && !email && (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-black/15 text-sm font-medium text-black/70 hover:text-black hover:bg-surface transition"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/signup"
                    className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[#22C55E] text-[#ffffff] text-sm font-medium hover:bg-[#16A34A] transition"
                  >
                    Créer un compte
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
