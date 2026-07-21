import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Sale } from "../types";

interface SalesChartProps {
  sales: Sale[];
}

export function SalesChart({ sales }: SalesChartProps) {
  // Bucket into hourly totals for a readable trend line.
  const buckets = new Map<string, number>();
  for (const s of sales) {
    const hour = new Date(s.sold_at);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + s.liters);
  }
  const data = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, liters]) => ({
      time: new Date(time).toLocaleTimeString([], { hour: "2-digit" }),
      liters: Number(liters.toFixed(1)),
    }));

  if (data.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
        No dispenses recorded in this window yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--flow)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--flow)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} unit="L" />
        <Tooltip
          contentStyle={{ background: "var(--panel-raised)", border: "1px solid var(--line)", borderRadius: 8 }}
          labelStyle={{ color: "var(--text-muted)" }}
          formatter={(value) => [`${value} L`, "Dispensed"]}
        />
        <Area type="monotone" dataKey="liters" stroke="var(--flow)" strokeWidth={2} fill="url(#salesFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
