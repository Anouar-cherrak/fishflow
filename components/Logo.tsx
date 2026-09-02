export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 20C4 20 8 12 16 12C24 12 28 20 28 20"
        stroke="#111111"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 24C4 24 8 16 16 16C24 16 28 24 28 24"
        stroke="#111111"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="16" cy="8" r="3" fill="#111111" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold text-black ${className}`}>
      Fish<span className="font-normal">Flow</span>
    </span>
  );
}