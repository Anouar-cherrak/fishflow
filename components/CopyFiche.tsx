"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking";

const KEY = "ff-pending-copy";

// "Copier dans mes fiches" : la personne récupère une fiche partagée dans son propre compte.
// Si elle n'est pas connectée, on garde le lien en mémoire, elle crée son compte, et la copie se fait au retour.
export function CopyFiche({
  shareId,
  title,
  data,
  className,
}: {
  shareId: string;
  title: string;
  data: Record<string, unknown>;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [full, setFull] = useState(false);
  const auto = useRef(false);

  const copy = async () => {
    setBusy(true);
    setMsg("");
    setFull(false);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      try {
        localStorage.setItem(KEY, shareId);
      } catch {}
      trackEvent("copie_fiche_visiteur");
      router.push("/signup");
      return;
    }
    // On ne reprend ni l'identifiant, ni le meilleur score, ni le lien de partage de l'original.
    const { id: _id, best_score: _b, share_id: _s, ...rest } = data as Record<string, unknown>;
    void _id; void _b; void _s;
    const { data: inserted, error } = await supabase
      .from("fiches")
      .insert({ title: title || "Fiche copiée", data: rest })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      if (String(error.message).includes("FREE_LIMIT")) {
        setFull(true);
        setMsg("Ton historique gratuit est plein (5 fiches). Supprime une ancienne fiche, ou passe Pro pour un historique illimité.");
      } else {
        setMsg("La copie n'a pas marché. Réessaie dans un instant.");
      }
      return;
    }
    try {
      localStorage.removeItem(KEY);
    } catch {}
    trackEvent("copie_fiche_reussie");
    router.push(`/fiche/${inserted.id}`);
  };

  // Retour après inscription ou connexion : la copie se termine toute seule.
  useEffect(() => {
    if (auto.current) return;
    if (new URLSearchParams(window.location.search).get("copier") === "1") {
      auto.current = true;
      void copy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-2 justify-items-start">
      <button type="button" onClick={copy} disabled={busy} className={className}>
        {busy ? "Copie en cours…" : "Copier dans mes fiches"}
      </button>
      {msg && (
        <p role="status" className="text-sm text-black/70 max-w-[52ch]">
          {msg}{" "}
          {full && (
            <a href="/mes-fiches" className="underline font-medium">
              Gérer mes fiches
            </a>
          )}
        </p>
      )}
    </div>
  );
}

export function pendingCopyPath(): string | null {
  try {
    const id = localStorage.getItem(KEY);
    return id ? `/p/${id}?copier=1` : null;
  } catch {
    return null;
  }
}
