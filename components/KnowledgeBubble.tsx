// La mascotte d'Apprendre : la raie d'Anouar, immobile. Elle « respire » doucement pendant que la réponse se prépare
// (CSS .ff-kb dans app/globals.css). Décor : masqué aux lecteurs d'écran (l'état est annoncé en texte par la page).
export function KnowledgeBubble({ thinking, done, compact }: { thinking: boolean; done: boolean; compact: boolean }) {
  return <div className="ff-kb" aria-hidden="true" data-state={thinking ? "thinking" : done ? "done" : "idle"} data-compact={compact ? "true" : "false"} />;
}
