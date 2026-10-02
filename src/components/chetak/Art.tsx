/**
 * Line-art scooter used as the Chetak-inspired visual anchor.
 * Deliberately illustrative rather than photographic so the interface stays
 * neutral when real product imagery is unavailable.
 */
export function ScooterArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 250"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* wheels */}
        <circle cx="116" cy="184" r="37" />
        <circle cx="308" cy="184" r="37" />
        <circle cx="116" cy="184" r="9" />
        <circle cx="308" cy="184" r="9" />

        {/* floorboard / deck */}
        <path d="M152 156 H 258" />

        {/* body shell */}
        <path d="M110 150 C 108 122 128 106 154 104 H 214 C 236 104 250 118 254 136" />
        <path d="M254 136 L 262 158" />

        {/* seat */}
        <path d="M138 92 H 212 C 222 92 228 99 228 107 C 228 115 222 120 212 120 H 138" />

        {/* leg shield */}
        <path d="M262 158 C 280 146 290 126 294 104" />
        <path d="M294 104 C 298 92 304 84 312 78" />

        {/* handlebar */}
        <path d="M312 78 L 308 60 H 270" />

        {/* headlight */}
        <path d="M290 104 C 300 99 308 99 316 104" />

        {/* fenders */}
        <path d="M78 174 C 88 156 100 148 116 146" />
        <path d="M270 174 C 280 158 292 150 308 148" />
      </g>
    </svg>
  );
}

/** Concentric arcs echoing a speedometer dial. */
export function SpeedArc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" className={className}>
      <circle cx="200" cy="200" r="196" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle cx="200" cy="200" r="152" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="200" cy="200" r="108" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <circle
        cx="200"
        cy="200"
        r="176"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="180 900"
        transform="rotate(-140 200 200)"
      />
    </svg>
  );
}
