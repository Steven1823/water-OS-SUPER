interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  accent?: "flow" | "amber" | "danger";
}

export function StatCard({ label, value, unit, accent = "flow" }: StatCardProps) {
  const accentColor = `var(--${accent})`;
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "16px 18px",
        minWidth: 160,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <span className="meter" style={{ fontSize: 26, fontWeight: 600 }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{unit}</span>}
      </div>
    </div>
  );
}
