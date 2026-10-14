"use client";

import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/lib/use-dialog";

export function UpgradeModal({
  title,
  message,
  onClose,
  onUpgrade,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onUpgrade: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(boxRef, onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 ff-fade"
      onClick={onClose}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm bg-surface border border-black/10 rounded-2xl p-6 ff-card ff-fade-up max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <h2 id={titleId} className="text-lg font-semibold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-black/60 hover:text-black text-xl leading-none shrink-0 ml-3"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-black/60 mb-5">{message}</p>

        <ul className="text-sm text-black/70 space-y-2 mb-6" aria-label="Avec Pro">
          <li>✓ 100 fiches par mois</li>
          <li>✓ Cours jusqu'à 15 pages</li>
          <li>✓ Plusieurs PDF fusionnés en une fiche</li>
          <li>✓ Quiz de 12 questions</li>
          <li>✓ Toutes tes fiches gardées</li>
        </ul>

        <button
          type="button"
          data-autofocus
          onClick={onUpgrade}
          className="w-full min-h-[48px] py-3 rounded-full font-semibold bg-accent text-on-accent hover:bg-accent-strong transition ff-btn mb-2"
        >
          Voir les tarifs Pro — 4,99 €/mois
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="w-full min-h-[44px] mb-1 rounded-full border border-black/15 text-sm font-semibold hover:border-black/40 transition"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] text-sm text-black/60 hover:text-black transition"
        >
          Plus tard
        </button>
      </div>
    </div>,
    document.body
  );
}
