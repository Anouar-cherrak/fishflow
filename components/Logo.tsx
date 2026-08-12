export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ff-logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <path
        d="M4 20C4 20 8 12 16 12C24 12 28 20 28 20"
        stroke="url(#ff-logo-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 24C4 24 8 16 16 16C24 16 28 24 28 24"
        stroke="url(#ff-logo-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <circle cx="16" cy="8" r="3" fill="url(#ff-logo-gradient)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold ${className}`}>
      Fish{" "}
      <span className="bg-gradient-to-r from-[#2563EB] to-[#EC4899] bg-clip-text text-transparent">
        Flow
      </span>
    </span>
  );
}