// La bulle d'Apprendre : une grande bulle d'eau, irisée et éclairée d'en haut. Elle ondule doucement,
// s'agite et laisse monter de petites bulles quand elle « réfléchit », puis se calme quand la réponse arrive.
// Uniquement du CSS (transform et opacity). Décor : masqué aux lecteurs d'écran.
import type { CSSProperties } from "react";

export function KnowledgeBubble({
  thinking,
  done,
  compact,
  shift,
}: {
  thinking: boolean;
  done: boolean;
  compact: boolean;
  shift: number;
}) {
  return (
    <div
      className="ff-kb"
      aria-hidden="true"
      data-state={thinking ? "thinking" : done ? "done" : "idle"}
      data-compact={compact ? "true" : "false"}
      style={{ "--kb-hue": `${shift}deg` } as CSSProperties}
    >
      <span className="ff-kb-body">
        <span className="ff-kb-film" />
        <span className="ff-kb-shine" />
        <span className="ff-kb-shine b" />
      </span>
      <span className="ff-kb-rise"><i /><i /><i /><i /><i /></span>
    </div>
  );
}
