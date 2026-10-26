"use client";

import { CookieChoice } from "@/components/CookieChoice";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { User } from "@supabase/supabase-js";

export default function Parametres() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [left, setLeft] = useState<{ month: number; day: number | null } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [emailOptOut, setEmailOptOut] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      setChecking(false);
      fetch("/api/usage")
        .then((r) => r.json())
        .then((d) => {
          setIsPro(!!d.isPro);
          if (typeof d.fichesLeftMonth === "number") setLeft({ month: d.fichesLeftMonth, day: d.fichesLeftDay ?? null });
        })
        .catch(() => {});
      fetch("/api/preferences")
        .then((r) => r.json())
        .then((d) => setEmailOptOut(!!d.emailOptOut))
        .catch(() => {});
    });
  }, [router]);

  const handleToggleEmailOptOut = async () => {
    const next = !emailOptOut;
    setEmailOptOut(next);
    setPrefsLoading(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOptOut: next }),
      });
    } catch {
      setEmailOptOut(!next);
    } finally {
      setPrefsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "La page d'abonnement n'a pas pu s'ouvrir. Réessaie.");
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      alert("La connexion a été coupée. Vérifie ton internet, puis réessaie.");
      setPortalLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordMessage("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      setPasswordMessage("Le mot de passe n'a pas pu être changé. Vérifie ta connexion et réessaie.");
      return;
    }
    setNewPassword("");
    setPasswordMessage("Mot de passe mis à jour.");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ton compte n'a pas pu être supprimé. Réessaie, ou écris-nous.");
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      try { localStorage.removeItem("fishflow_result"); } catch {}
      router.push("/");
    } catch {
      alert("La connexion a été coupée. Vérifie ton internet, puis réessaie.");
      setDeleting(false);
    }
  };

  if (checking) {
    return (
      <AppShell size="normal">
        <p className="text-black/65 text-sm py-24 text-center" role="status">Chargement…</p>
      </AppShell>
    );
  }

  return (
    <AppShell size="normal">
      <div>
        <div>
          <div className="mb-8">
            <h1 className="ff-title mb-3">Paramètres</h1>
            <p className="ff-lead">Ton compte, ton abonnement et tes données.</p>
          </div>
          <div className="grid max-w-2xl">

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold mb-3">Compte</h2>
            <p className="text-[15px] ff-muted mb-1">{user?.email}</p>
            <p className="text-[15px] ff-muted">{isPro ? "FishFlow Pro actif" : "Compte gratuit"}</p>
            {left && (
              <p className="text-[15px] ff-muted mt-1">
                Il te reste {left.month} fiche{left.month > 1 ? "s" : ""} ce mois-ci
                {left.day !== null && left.day < left.month ? `, dont ${left.day} aujourd'hui` : ""}.
              </p>
            )}
          </div>

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold mb-3">Apparence</h2>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("ff-open-tuto"))}
              className="mt-4 text-sm font-semibold underline underline-offset-4 min-h-[44px]"
            >
              Revoir le tutoriel
            </button>
            <CookieChoice className="mt-1 block text-sm font-semibold underline underline-offset-4 min-h-[44px]" />
          </div>

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold mb-3">Notifications</h2>
            <button
              type="button"
              role="switch"
              onClick={handleToggleEmailOptOut}
              disabled={prefsLoading}
              className="w-full flex items-center justify-between min-h-[44px] py-1 disabled:opacity-50"
              aria-checked={!emailOptOut}
            >
              <span className="text-sm font-medium text-black text-left">
                Recevoir les e-mails de rappel
                <span className="block text-sm ff-muted font-normal mt-0.5">
                  Tes cartes à revoir et les nouveautés de FishFlow
                </span>
              </span>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  !emailOptOut ? "bg-accent" : "bg-black/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[#ffffff] shadow transition ${
                    !emailOptOut ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold mb-3">Mes données</h2>
            <a
              href="/api/account/export"
              download
              className="ff-secondary w-full text-sm"
            >
              Télécharger mes données
            </a>
          </div>

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold mb-3">Abonnement</h2>
            {isPro ? (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="ff-secondary w-full text-sm disabled:opacity-50"
              >
                {portalLoading ? "Ouverture…" : "Gérer mon abonnement"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="ff-primary w-full text-sm"
              >
                Passer Pro — 4,99 €/mois
              </button>
            )}
          </div>

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold mb-3">Mot de passe</h2>
            <label htmlFor="new-password" className="ff-label">Nouveau mot de passe</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              aria-describedby="new-password-help"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="ff-field"
            />
            <p id="new-password-help" className="ff-hint mb-3">8 caractères minimum.</p>
            {passwordMessage && <p role="status" className="text-[15px] ff-muted mb-3">{passwordMessage}</p>}
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
              className="ff-secondary w-full text-sm disabled:opacity-40"
            >
              {passwordLoading ? "Mise à jour…" : "Changer le mot de passe"}
            </button>
          </div>

          <div className="py-6 border-t border-black/15">
            <h2 className="text-lg font-bold text-[var(--quiz-wrong-text)] mb-3">Supprimer mon compte</h2>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full min-h-[44px] rounded-full font-medium border border-[var(--quiz-wrong-text)] text-[var(--quiz-wrong-text)] hover:bg-[var(--quiz-wrong-bg)] transition ff-btn"
              >
                Supprimer mon compte
              </button>
            ) : (
              <div>
                <p id="delete-help" className="text-[15px] ff-muted mb-3">
                  C&apos;est <strong>définitif</strong> : ton compte, toutes tes fiches et ton abonnement seront supprimés.
                  Pour confirmer, tape <strong>SUPPRIMER</strong> en majuscules.
                </p>
                <label htmlFor="delete-confirm" className="sr-only">Tape SUPPRIMER pour confirmer</label>
                <input
                  id="delete-confirm"
                  type="text"
                  autoComplete="off"
                  aria-describedby="delete-help"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="ff-field mb-3"
                  placeholder="SUPPRIMER"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteText("");
                    }}
                    className="ff-secondary flex-1 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteText !== "SUPPRIMER" || deleting}
                    className="flex-1 min-h-[44px] rounded-full font-medium bg-red-600 text-[#ffffff] hover:bg-red-700 transition disabled:opacity-30 ff-btn"
                  >
                    {deleting ? "Suppression…" : "Confirmer la suppression"}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
