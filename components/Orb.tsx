import type { CSSProperties } from "react";

type OrbState = "idle" | "thinking" | "done";

// La boule lumineuse : uniquement du CSS (transform/opacity), donc fluide et légère.
// `shift` change sa couleur (en degrés), `state` change sa vitesse.
export function Orb({
  state = "idle",
  compact = false,
  shift = 0,
}: {
  state?: OrbState;
  compact?: boolean;
  shift?: number;
}) {
  return (
    <div
      className="ff-orb"
      data-state={state}
      data-compact={compact}
      style={{ "--orb-shift": `${shift}deg` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="ff-orb-glow" />
      <span className="ff-orb-body">
        <span className="ff-orb-blob" style={{ "--d": "14s", "--c": "#22d3ee", "--x": "-8%", "--y": "-6%" } as CSSProperties} />
        <span className="ff-orb-blob" style={{ "--d": "19s", "--c": "#a855f7", "--x": "46%", "--y": "40%" } as CSSProperties} />
        <span className="ff-orb-blob" style={{ "--d": "11s", "--c": "#f0abfc", "--x": "20%", "--y": "52%" } as CSSProperties} />
        <span className="ff-orb-shine" />
      </span>
    </div>
  );
}
