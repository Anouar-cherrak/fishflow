/* eslint-disable @next/next/no-img-element */
// Le logo FishFlow : une raie manta bleu ciel (images générées par scripts/brand.mjs).
// Le même bleu se voit bien en thème clair comme en thème sombre : une seule image.

// Proportions du logo : largeur ≈ 1,22 × hauteur.
export const RAIE_RATIO = 512 / 420;

export function RaieImg({ small, width, height, className = "" }: { small: boolean; width: number; height: number; className?: string }) {
  return <img src={small ? "/brand/logo-sm.png" : "/brand/logo.png"} alt="" width={width} height={height} className={className} draggable={false} />;
}

// Le logo de la barre du haut et des menus. « size » = hauteur affichée, en pixels.
// Il plane doucement ; au survol du lien (classe « ff-brand »), il bat des ailes et lâche une bulle.
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`ff-logo ${className}`} aria-hidden="true">
      <RaieImg small width={Math.round(size * RAIE_RATIO)} height={size} className="select-none" />
      <i />
    </span>
  );
}

// « FishFlow » : « Flow » en bleu (la couleur du logo), avec une fine vague sous « Flow » au survol du lien.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`ff-wordmark font-display font-semibold text-black ${className}`}>
      Fish<span className="font-normal">Flow</span>
    </span>
  );
}
