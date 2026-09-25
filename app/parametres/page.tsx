"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo, Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { User } from "@supabase/supabase-js";

export default function Parametres() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isPro, setIsPro] = useState(false);
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
        .then((d) => setIsPro(!!d.isPro))
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
        alert(data.error || "Erreur, réessaie.");
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      alert("Erreur de connexion. Réessaie.");
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
      setPasswordMessage("Impossible de changer le mot de passe. Réessaie.");
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
        alert(data.error || "Erreur pendant la suppression.");
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      alert("Erreur de connexion. Réessaie.");
      setDeleting(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black/40 text-sm">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="w-full flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-lg flex items-center justify-between mb-6 ff-fade">
          <Link
            href="/generer"
            className="text-sm text-black/70 hover:text-black px-3 py-1.5 rounded-full border border-black/15 hover:bg-surface transition font-medium"
          >
            ← FishFlow
          </Link>
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <Wordmark className="text-base" />
          </div>
        </div>

        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold mb-6 ff-fade-up">Paramètres</h1>

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-3">Compte</p>
            <p className="text-sm text-black/70 mb-1">{user?.email}</p>
            <p className="text-sm text-black/50">{isPro ? "FishFlow Pro actif" : "Compte gratuit"}</p>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-3">Apparence</p>
            <ThemeToggle />
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-3">Notifications</p>
            <button
              onClick={handleToggleEmailOptOut}
              disabled={prefsLoading}
              className="w-full flex items-center justify-between py-1 disabled:opacity-50"
              aria-pressed={!emailOptOut}
            >
              <span className="text-sm font-medium text-black text-left">
                Recevoir les emails de relance
                <span className="block text-xs text-black/40 font-normal mt-0.5">
                  Rappels et nouveautés FishFlow par email
                </span>
              </span>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  !emailOptOut ? "bg-[#22C55E]" : "bg-black/15"
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

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-3">Mes données</p>
            <a
              href="/api/account/export"
              download
              className="w-full inline-block text-center py-2.5 rounded-lg font-medium border border-black/20 hover:bg-surface transition ff-btn"
            >
              Télécharger mes données
            </a>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-3">Abonnement</p>
            {isPro ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full py-2.5 rounded-lg font-medium border border-black/20 hover:bg-surface transition disabled:opacity-50 ff-btn"
              >
                {portalLoading ? "Redirection..." : "Gérer mon abonnement"}
              </button>
            ) : (
              <button
                onClick={() => router.push("/pricing")}
                className="w-full py-2.5 rounded-lg font-medium bg-[#22C55E] text-white hover:bg-[#16A34A] transition ff-btn"
              >
                Passer Pro — 4,99 €/mois
              </button>
            )}
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-3">Mot de passe</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="w-full p-2.5 border border-black/15 rounded-lg mb-3 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
            />
            {passwordMessage && <p className="text-sm text-black/60 mb-3">{passwordMessage}</p>}
            <button
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
              className="w-full py-2.5 rounded-lg font-medium border border-black/20 hover:bg-surface transition disabled:opacity-30 ff-btn"
            >
              {passwordLoading ? "Mise à jour..." : "Changer le mot de passe"}
            </button>
          </div>

          <div className="bg-white border border-red-200 rounded-2xl p-6 ff-card ff-fade-up">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Zone dangereuse</p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 transition ff-btn"
              >
                Supprimer mon compte
              </button>
            ) : (
              <div>
                <p className="text-sm text-black/70 mb-3">
                  Cette action est <strong>définitive</strong> : toutes tes fiches, ton abonnement et ton compte
                  seront supprimés. Tape <strong>SUPPRIMER</strong> pour confirmer.
                </p>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full p-2.5 border border-black/15 rounded-lg mb-3 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black ff-input"
                  placeholder="SUPPRIMER"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteText("");
                    }}
                    className="flex-1 py-2.5 rounded-lg font-medium border border-black/20 hover:bg-surface transition ff-btn"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteText !== "SUPPRIMER" || deleting}
                    className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-30 ff-btn"
                  >
                    {deleting ? "Suppression..." : "Confirmer la suppression"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
