// Décors dessinés à la main pour « La Descente » (SVG légers, aucune image). Tous décoratifs : aria-hidden.

export function Boat() {
  return (
    <svg className="dz-boat" viewBox="0 0 150 96" aria-hidden="true">
      <path d="M78 6v52" stroke="var(--boat-mast)" strokeWidth="3" strokeLinecap="round" />
      <path d="M80 10c18 10 30 26 34 44H80z" fill="var(--boat-sail)" />
      <path d="M76 18c-12 9-20 22-22 36h22z" fill="var(--boat-sail-2)" />
      <path d="M78 6l16 5-16 5z" fill="var(--boat-flag)" />
      <path d="M8 60h134l-14 22c-2 4-6 6-10 6H32c-4 0-8-2-10-6z" fill="var(--boat-hull)" />
      <path d="M14 66h122" stroke="var(--boat-stripe)" strokeWidth="4" />
      <circle cx="44" cy="74" r="3.4" fill="var(--boat-stripe)" />
      <circle cx="60" cy="74" r="3.4" fill="var(--boat-stripe)" />
      <circle cx="122" cy="56" r="4" className="dz-lantern" />
    </svg>
  );
}

// Poisson (le même dessin sert au sauteur et au banc).
export function Fish({ className = "", body = "var(--fish)", fin = "var(--fish-fin)" }: { className?: string; body?: string; fin?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 32" aria-hidden="true">
      <path d="M50 16 63 5l-3 11 3 11z" fill={fin} />
      <path d="M2 16C10 5 22 2 34 3c9 1 16 6 18 13-2 7-9 12-18 13C22 30 10 27 2 16z" fill={body} />
      <path d="M22 5c-3 7-3 15 0 22" stroke={fin} strokeWidth="3" fill="none" opacity=".7" />
      <path d="M30 3c4 4 7 9 7 13" stroke="rgba(255,255,255,.55)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="13" r="2.4" fill="#052036" />
      <circle cx="11.3" cy="12.3" r=".8" fill="#fff" />
    </svg>
  );
}

export function Gull() {
  return (
    <svg className="dz-gull" viewBox="0 0 60 24" aria-hidden="true">
      <path className="dz-gull-w" d="M2 14C12 4 22 6 30 15 38 6 48 4 58 14 48 10 38 12 30 20 22 12 12 10 2 14z" fill="var(--gull)" />
    </svg>
  );
}

export function Jelly({ className = "" }: { className?: string }) {
  return (
    <svg className={`dz-jelly ${className}`} viewBox="0 0 90 170" aria-hidden="true">
      <g className="dz-tent">
        <path d="M24 52c-6 22 8 36 0 60s6 34 0 52" />
        <path d="M38 56c-4 20 6 34 0 56s4 28 0 40" />
        <path d="M52 56c4 20-6 34 0 56s-4 28 0 40" />
        <path d="M66 52c6 22-8 36 0 60s-6 34 0 52" />
      </g>
      <g className="dz-bell">
        <path d="M6 48C6 20 24 4 45 4s39 16 39 44c-10 7-22 3-39 8-17-5-29-1-39-8z" fill="var(--jelly)" />
        <path d="M18 38c2-14 12-24 26-26" stroke="rgba(255,255,255,.6)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M14 48c10 3 20 1 31 4 11-3 21-1 31-4" stroke="var(--jelly-edge)" strokeWidth="3" fill="none" />
      </g>
    </svg>
  );
}

export function Angler() {
  return (
    <svg className="dz-angler" viewBox="0 0 220 140" aria-hidden="true">
      <path d="M70 34C90 8 130 2 150 8" stroke="var(--angler-line)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle className="dz-lure" cx="152" cy="10" r="7" />
      <path d="M200 76c-8-22-30-40-62-42-40-2-74 18-86 44 12 26 46 46 86 44 32-2 54-20 62-46z" fill="var(--angler)" />
      <path d="M200 78 218 58v40z" fill="var(--angler)" />
      <path d="M58 82c10 10 24 14 40 12" stroke="var(--angler-teeth)" strokeWidth="3" strokeDasharray="4 5" fill="none" />
      <circle cx="104" cy="62" r="6" fill="var(--angler-eye)" />
    </svg>
  );
}

// Fond marin : dunes de sable et rochers, avec la place où la raie se pose.
export function Seabed() {
  return (
    <svg className="dz-bed" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 120C160 80 300 150 470 110s320-60 480 0 210 20 250 10v80H0z" fill="var(--bed-2)" />
      <path d="M0 150c200-30 380 30 600 0s400-20 600 10v40H0z" fill="var(--bed)" />
      <path d="M860 120c10-30 40-40 70-30s30 40 10 50" fill="var(--bed-rock)" />
      <path d="M140 140c6-24 30-34 52-24s20 32 4 38" fill="var(--bed-rock)" />
    </svg>
  );
}
