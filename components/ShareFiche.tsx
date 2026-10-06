"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking";

// Partager une fiche par lien. Le lien n'existe que si la personne le crée, et elle peut l'arrêter à tout moment.
// Si la colonne de partage n'existe pas encore dans la base, le bouton n'apparaît pas.
export function ShareFiche({ ficheId, className }: { ficheId: string; className: string }) {
  const [available, setAvailable] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("fiches")
      .select("share_id")
      .eq("id", ficheId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled || err) return;
        setAvailable(true);
        setShareId((data as { share_id?: string | null } | null)?.share_id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [ficheId]);

  if (!available) return null;

  const url = shareId && typeof window !== "undefined" ? `${window.location.origin}/p/${shareId}` : "";

  const setShare = async (next: string | null) => {
    setBusy(true);
    setError("");
    const { error: err } = await createClient().from("fiches").update({ share_id: next }).eq("id", ficheId);
    setBusy(false);
    if (err) {
      setError("Impossible de changer le partage. Réessaie.");
      return;
    }
    setShareId(next);
    setCopied(false);
    if (next) trackEvent("fiche_partagee");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Copie impossible : sélectionne le lien et copie-le à la main.");
    }
  };

  if (!shareId) {
    return (
      <button type="button" onClick={() => setShare(crypto.randomUUID())} disabled={busy} className={className}>
        {busy ? "Création du lien..." : "Partager par lien"}
      </button>
    );
  }

  return (
    <div className="col-span-2 lg:col-span-1 grid gap-2 rounded-2xl border border-black/10 bg-surface p-3">
      <label htmlFor="share-link" className="text-xs font-semibold text-black/60">Lien de ta fiche</label>
      <input
        id="share-link"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full min-h-[44px] px-3 rounded-xl border border-black/15 bg-white text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="ff-primary text-sm min-h-[44px] ff-btn">
          {copied ? "Lien copié" : "Copier le lien"}
        </button>
        <button type="button" onClick={() => setShare(null)} disabled={busy} className="text-sm text-black/60 hover:text-black underline underline-offset-4 min-h-[44px] px-2">
          Arrêter le partage
        </button>
      </div>
      <p className="text-xs text-black/50">Toute personne qui a ce lien peut lire ta fiche. Ton cours d&apos;origine n&apos;est pas partagé.</p>
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
