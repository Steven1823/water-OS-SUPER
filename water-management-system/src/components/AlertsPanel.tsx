import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Alert } from "../types";
import { isDemoRuntime, shouldUseRealtime } from "../lib/runtimeMode";

const TYPE_LABEL: Record<Alert["type"], string> = {
  offline: "Offline",
  low_tank: "Low tank",
  fault: "Fault",
  tamper: "Tamper",
  low_battery: "Low battery",
};

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (isDemoRuntime()) {
      setAlerts([
        {
          id: 1,
          machine_id: "demo-machine-3",
          type: "fault",
          message: "Flow sensor mismatch detected.",
          resolved: false,
          created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          machine_id: "demo-machine-2",
          type: "low_tank",
          message: "Tank reached 28% threshold.",
          resolved: false,
          created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
        },
      ]);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setAlerts(data as Alert[]);
    })();

    if (!shouldUseRealtime()) {
      return;
    }

    const channel = supabase
      .channel("alerts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => setAlerts((prev) => [payload.new as Alert, ...prev].slice(0, 10))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Active alerts</div>
      {alerts.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No active alerts. All machines nominal.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                borderLeft: "3px solid var(--amber)",
                paddingLeft: 8,
              }}
            >
              <span>
                <strong>{TYPE_LABEL[a.type]}</strong>
                {a.message ? ` — ${a.message}` : ""}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
