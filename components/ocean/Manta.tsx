import { MANTA_PATH, MANTA_VIEWBOX, MANTA_WING_L, MANTA_WING_R } from "./manta-path";

// Raie manta réaliste en silhouette (pas le logo) : le corps et les deux ailes sont trois calques,
// pour que les ailes battent avec transform seulement. Décor : toujours masqué aux lecteurs d'écran.
export function Manta({ className = "", rim = true }: { className?: string; rim?: boolean }) {
  return (
    <span className={`ff-manta ${className}`} aria-hidden="true">
      <span className="ff-manta-l">
        <svg viewBox={MANTA_VIEWBOX} focusable="false">
          <path d={MANTA_WING_L} fill="currentColor" />
          {rim && <path className="rim" d={MANTA_WING_L} />}
        </svg>
      </span>
      <span className="ff-manta-r">
        <svg viewBox={MANTA_VIEWBOX} focusable="false">
          <path d={MANTA_WING_R} fill="currentColor" />
          {rim && <path className="rim" d={MANTA_WING_R} />}
        </svg>
      </span>
      <span className="ff-manta-body">
        <svg viewBox={MANTA_VIEWBOX} focusable="false">
          <path d={MANTA_PATH} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}
