import { useEffect, useState } from "react";
import { useMachines } from "../hooks/useMachines";
import { useMachineSales } from "../hooks/useMachineSales";
import { MachineCard } from "./MachineCard";
import { StatCard } from "./StatCard";
import { LiquidGauge } from "./LiquidGauge";
import { SalesChart } from "./SalesChart";
import { AlertsPanel } from "./AlertsPanel";

export function Dashboard() {
  const { machines, loading } = useMachines();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && machines.length > 0) setSelectedId(machines[0].machine_id);
  }, [machines, selectedId]);

  const sales = useMachineSales(selectedId, 24);
  const selected = machines.find((m) => m.machine_id === selectedId);

  const fleetLitersToday = machines.reduce((sum, m) => sum + m.liters_today, 0);
  const fleetRevenueToday = machines.reduce((sum, m) => sum + m.revenue_today, 0);
  const onlineCount = machines.filter((m) => m.status === "online").length;

  return (
    <div style={{ minHeight: "100%", padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--flow)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Water Management
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700 }}>Fleet overview</h1>
      </header>

      <section style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Liters dispensed today" value={fleetLitersToday.toFixed(1)} unit="L" />
        <StatCard label="Revenue today" value={fleetRevenueToday.toFixed(0)} unit="KES" accent="flow" />
        <StatCard
          label="Machines online"
          value={`${onlineCount}/${machines.length}`}
          accent={onlineCount === machines.length ? "flow" : "amber"}
        />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Machine list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading machines…</div>}
          {!loading && machines.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No machines yet. Add one to the <code>machines</code> table to get started.
            </div>
          )}
          {machines.map((m) => (
            <MachineCard
              key={m.machine_id}
              machine={m}
              selected={m.machine_id === selectedId}
              onSelect={() => setSelectedId(m.machine_id)}
            />
          ))}
        </div>

        {/* Detail panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {selected && (
            <>
              <div
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 20,
                  display: "flex",
                  gap: 32,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <LiquidGauge
                  percent={
                    selected.liters_today && machines.length
                      ? Math.min(100, (selected.liters_today / (1000)) * 100)
                      : 0
                  }
                  label="Today's progress"
                  sublabel={`${selected.liters_today.toFixed(1)} L / 1,000 L target`}
                />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Status: <strong style={{ color: "var(--text)" }}>{selected.status}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Revenue today:{" "}
                    <span className="meter" style={{ color: "var(--text)" }}>
                      {selected.revenue_today.toFixed(0)} KES
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Dispensed — last 24h</div>
                <SalesChart sales={sales} />
              </div>
            </>
          )}

          <AlertsPanel />
        </div>
      </div>
    </div>
  );
}
