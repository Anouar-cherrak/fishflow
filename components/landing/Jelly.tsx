// Méduse translucide, éclairée de l'intérieur (comme dans les vidéos sous-marines). Trois calques séparés
// (ombrelle, tentacules, bras) pour que chacun bouge avec transform seulement. Décor masqué aux lecteurs d'écran.
export function Jelly({ id, className = "" }: { id: string; className?: string }) {
  return (
    <div className={`jl ${className}`} aria-hidden="true">
      <div className="jl-tent">
        <svg viewBox="0 0 120 260" focusable="false">
          <g fill="none" strokeLinecap="round">
            <path d="M22 70c-6 40 10 70 0 110s8 50 2 76" stroke="rgba(220,242,255,.32)" strokeWidth="1.2" />
            <path d="M38 76c-4 36 8 66 0 104s6 40 0 70" stroke="rgba(220,242,255,.28)" strokeWidth="1" />
            <path d="M82 76c4 36-8 66 0 104s-6 40 0 70" stroke="rgba(220,242,255,.28)" strokeWidth="1" />
            <path d="M98 70c6 40-10 70 0 110s-8 50-2 76" stroke="rgba(220,242,255,.32)" strokeWidth="1.2" />
          </g>
        </svg>
      </div>
      <div className="jl-arms">
        <svg viewBox="0 0 120 260" focusable="false">
          <path d="M50 70c-8 24 6 34-2 56s8 30 2 46c10-14 4-30 10-46s-4-30 2-56z" fill="rgba(255,214,232,.32)" />
          <path d="M70 70c8 24-6 34 2 56s-8 30-2 46c-10-14-4-30-10-46s4-30-2-56z" fill="rgba(255,214,232,.26)" />
        </svg>
      </div>
      <div className="jl-bell">
        <svg viewBox="0 0 120 90" focusable="false">
          <defs>
            <radialGradient id={`${id}-b`} cx="50%" cy="80%" r="75%">
              <stop offset="0" stopColor="rgba(255,255,255,.08)" />
              <stop offset=".6" stopColor="rgba(200,236,255,.22)" />
              <stop offset="1" stopColor="rgba(230,247,255,.62)" />
            </radialGradient>
            <radialGradient id={`${id}-g`} cx="50%" cy="60%" r="50%">
              <stop offset="0" stopColor="rgba(255,190,220,.55)" />
              <stop offset="1" stopColor="rgba(255,190,220,0)" />
            </radialGradient>
          </defs>
          <path d="M6 72C6 34 30 8 60 8s54 26 54 64c-12 8-28 2-54 8-26-6-42 0-54-8z" fill={`url(#${id}-b)`} />
          <ellipse cx="60" cy="54" rx="26" ry="16" fill={`url(#${id}-g)`} />
          <path d="M44 50a8 8 0 1 0 16 0a8 8 0 1 0-16 0M60 50a8 8 0 1 0 16 0a8 8 0 1 0-16 0" fill="none" stroke="rgba(255,200,226,.45)" strokeWidth="1.4" />
          <path d="M6 72c12 8 28 2 54 8 26-6 42 0 54-8" fill="none" stroke="rgba(235,250,255,.8)" strokeWidth="1.6" />
          <path d="M26 30c8-12 20-18 34-18" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
