import type { MachineToday } from "../types";

const STATUS_COLOR: Record<string, string> = {
  online: "var(--flow)",
  offline: "var(--text-muted)",
  maintenance: "var(--amber)",
  fault: "var(--danger)",
};

interface MachineCardProps {
  machine: MachineToday;
  selected: boolean;
  onSelect: () => void;
}

export function MachineCard({ machine, selected, onSelect }: MachineCardProps) {
  const lastSeen = machine.last_seen_at
    ? new Date(machine.last_seen_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "never";

  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        background: selected ? "var(--panel-raised)" : "var(--panel)",
        border: `1px solid ${selected ? "var(--flow)" : "var(--line)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{machine.name}</span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: STATUS_COLOR[machine.status],
            boxShadow: machine.status === "online" ? "0 0 6px var(--flow)" : "none",
          }}
          title={machine.status}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
        <span className="meter">{machine.liters_today.toFixed(1)} L today</span>
        <span>last seen {lastSeen}</span>
      </div>
    </button>
  );
}
