/** Decorative sun: a warm core with slowly turning rays. */
export function Sun({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="sun-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#fff3c9" />
          <stop offset="45%" stopColor="#f6c453" />
          <stop offset="100%" stopColor="#c4623a" />
        </radialGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6c453" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f6c453" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#sun-glow)" />
      <g className="animate-rays">
        {rays.map((deg) => (
          <rect
            key={deg}
            x="98.5"
            y={deg % 30 === 0 ? 8 : 18}
            width="3"
            height={deg % 30 === 0 ? 26 : 16}
            rx="1.5"
            fill="#f6c453"
            opacity={deg % 30 === 0 ? 0.9 : 0.5}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </g>
      <circle className="animate-sun" style={{ transformOrigin: "100px 100px" }} cx="100" cy="100" r="52" fill="url(#sun-core)" />
    </svg>
  );
}
