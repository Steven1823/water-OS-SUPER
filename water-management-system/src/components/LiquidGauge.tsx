interface LiquidGaugeProps {
  percent: number; // 0-100
  label: string;
  sublabel?: string;
  size?: number;
}

/**
 * A circular liquid-fill gauge — the water level visibly rises and
 * gently sloshes. Used for tank level and daily-target progress,
 * so the fill genuinely represents dispensed/remaining water rather
 * than being decorative chrome.
 */
export function LiquidGauge({ percent, label, sublabel, size = 140 }: LiquidGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const waveY = 100 - clamped; // SVG viewBox is 0-100

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <defs>
            <clipPath id={`clip-${label}`}>
              <circle cx="50" cy="50" r="46" />
            </clipPath>
            <linearGradient id={`fill-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--flow)" />
              <stop offset="100%" stopColor="var(--flow-deep)" />
            </linearGradient>
          </defs>

          <circle cx="50" cy="50" r="46" fill="var(--panel-raised)" stroke="var(--line)" strokeWidth="2" />

          <g clipPath={`url(#clip-${label})`}>
            <rect
              x="0"
              y={waveY}
              width="100"
              height="100"
              fill={`url(#fill-${label})`}
              style={{ transition: "y 0.8s ease" }}
            />
            <path
              d={`M0 ${waveY} Q 12.5 ${waveY - 3.5} 25 ${waveY} T 50 ${waveY} T 75 ${waveY} T 100 ${waveY} V100 H0 Z`}
              fill="rgba(255,255,255,0.12)"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-25 0"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </path>
          </g>

          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--line)" strokeWidth="2" />
        </svg>

        <div
          className="meter"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.18,
            fontWeight: 600,
            color: "var(--text)",
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {clamped.toFixed(0)}%
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}
