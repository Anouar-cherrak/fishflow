/* eslint-disable @next/next/no-img-element */
// Le logo FishFlow : la raie manta bleu ciel d'Anouar, en vectoriel (public/brand/raie.svg, tracé depuis son dessin).
// Le même bleu se voit bien en thème clair comme en thème sombre : une seule image, nette à toutes les tailles.

// Proportions du logo : largeur ≈ 1,22 × hauteur.
export const RAIE_RATIO = 512 / 418;

// « small » : ancien réglage (une image PNG plus petite), ignoré depuis que le logo est vectoriel.
export function RaieImg({ width, height, className = "" }: { small?: boolean; width: number; height: number; className?: string }) {
  return <img src="/brand/raie.svg" alt="" width={width} height={height} className={className} draggable={false} />;
}

// Le logo de la barre du haut et des menus. « size » = hauteur affichée, en pixels.
// Il plane doucement ; au survol du lien (classe « ff-brand »), il bat des ailes.
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`ff-logo ${className}`} aria-hidden="true">
      <RaieImg width={Math.round(size * RAIE_RATIO)} height={size} className="select-none" />
      <i />
    </span>
  );
}

// « FishFlow » : « Flow » en bleu (la couleur du logo).
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`ff-wordmark font-display text-black ${className}`}>
      Fish<span>Flow</span>
    </span>
  );
}
