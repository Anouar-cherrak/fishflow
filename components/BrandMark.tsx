// Le logo FishFlow : la raie d'Anouar en blanc, posée dans une tuile bleue en relief (comme une icône d'appli).
// Le dessin n'est pas modifié : il sert de masque, la couleur vient du CSS (.ff-mark dans globals.css).
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`ff-mark ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <span />
    </span>
  );
}
