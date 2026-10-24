// Page en cours de chargement : des formes grises à la place du titre et des cartes,
// pour que la page ne « saute » pas quand le contenu arrive. Le texte reste lu par les lecteurs d'écran.
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true">
        <div className="ff-skel h-10 w-56 max-w-full mb-3" />
        <div className="ff-skel h-5 w-80 max-w-full mb-8" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="ff-skel h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
