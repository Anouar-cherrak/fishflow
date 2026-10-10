"use client";

import { createPortal } from "react-dom";

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
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 ff-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm bg-surface border border-black/10 rounded-2xl p-6 ff-card ff-fade-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-lg font-semibold text-black">{title}</h2>
          <button
            onClick={onClose}
            className="text-black/30 hover:text-black text-xl leading-none shrink-0 ml-3"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-black/60 mb-5">{message}</p>

        <ul className="text-sm text-black/70 space-y-2 mb-6">
          <li>✓ Fiches illimitées</li>
          <li>✓ Documents volumineux</li>
          <li>✓ Plusieurs PDF fusionnés en une fiche</li>
          <li>✓ Quiz de 12 questions</li>
          <li>✓ Historique illimité</li>
        </ul>

        <button
          onClick={onUpgrade}
          className="w-full py-3 rounded-full font-semibold bg-[#22C55E] text-[#04130A] hover:bg-[#16A34A] transition ff-btn mb-2"
        >
          Voir les tarifs Pro — 4,99 €/mois
        </button>
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="w-full min-h-[44px] mb-1 rounded-full border border-black/15 text-sm font-semibold hover:border-black/40 transition"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-black/40 hover:text-black transition"
        >
          Plus tard
        </button>
      </div>
    </div>,
    document.body
  );
}
