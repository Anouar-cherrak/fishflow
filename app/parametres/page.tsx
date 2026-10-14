"use client";

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
    if (newPassword.length < 6) {
      setPasswordMessage("Le mot de passe doit faire au moins 6 caractères.");
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
      router.push("/");
    } catch {
      alert("La connexion a été coupée. Vérifie ton internet, puis réessaie.");
      setDeleting(false);
    }
  };

  if (checking) {
    return (
      <AppShell size="normal">
        <p className="text-black/50 text-sm py-24 text-center" role="status">Chargement…</p>
      </AppShell>
    );
  }

  return (
    <AppShell size="normal">
      <div>
        <div>
          <div className="mb-8 ff-fade-up">
            <h1 className="ff-title mb-3">Paramètres.</h1>
            <p className="ff-lead">Ton compte, ton abonnement et tes données.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 items-start">

          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-7 ff-card ff-fade-up">
            <p className="text-sm font-semibold text-black/55 mb-3">Compte</p>
            <p className="text-sm text-black/70 mb-1">{user?.email}</p>
            <p className="text-sm text-black/60">{isPro ? "FishFlow Pro actif" : "Compte gratuit"}</p>
            {left && (
              <p className="text-sm text-black/50 mt-1">
                Il te reste {left.month} fiche{left.month > 1 ? "s" : ""} ce mois-ci
                {left.day !== null && left.day < left.month ? `, dont ${left.day} aujourd'hui` : ""}.
              </p>
            )}
          </div>

          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-7 ff-card ff-fade-up">
            <p className="text-sm font-semibold text-black/55 mb-3">Apparence</p>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("ff-open-tuto"))}
              className="mt-4 text-sm font-semibold underline underline-offset-4 min-h-[44px]"
            >
              Revoir le tutoriel
            </button>
          </div>

          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-7 ff-card ff-fade-up">
            <p className="text-sm font-semibold text-black/55 mb-3">Notifications</p>
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
                <span className="block text-xs text-black/60 font-normal mt-0.5">
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

          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-7 ff-card ff-fade-up">
            <p className="text-sm font-semibold text-black/55 mb-3">Mes données</p>
            <a
              href="/api/account/export"
              download
              className="ff-secondary w-full text-sm"
            >
              Télécharger mes données
            </a>
          </div>

          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-7 ff-card ff-fade-up">
            <p className="text-sm font-semibold text-black/55 mb-3">Abonnement</p>
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
                className="ff-primary w-full text-sm ff-btn"
              >
                Passer Pro — 4,99 €/mois
              </button>
            )}
          </div>

          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-7 ff-card ff-fade-up">
            <label htmlFor="new-password" className="text-sm font-semibold text-black/55 mb-3 block">Mot de passe</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              aria-describedby="new-password-help"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="w-full min-h-[44px] px-3 border border-black/15 rounded-lg mb-1 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent ff-input"
            />
            <p id="new-password-help" className="text-xs text-black/60 mb-3">6 caractères minimum.</p>
            {passwordMessage && <p role="status" className="text-sm text-black/70 mb-3">{passwordMessage}</p>}
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
              className="ff-secondary w-full text-sm disabled:opacity-40"
            >
              {passwordLoading ? "Mise à jour…" : "Changer le mot de passe"}
            </button>
          </div>

          <div className="bg-surface border border-red-500/40 rounded-3xl p-6 sm:p-7 md:col-span-2 ff-card ff-fade-up">
            <p className="text-sm font-semibold text-[var(--quiz-wrong-text)] mb-3">Supprimer mon compte</p>
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
                <p id="delete-help" className="text-sm text-black/70 mb-3">
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
                  className="w-full min-h-[44px] px-3 border border-black/15 rounded-lg mb-3 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-accent ff-input"
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
