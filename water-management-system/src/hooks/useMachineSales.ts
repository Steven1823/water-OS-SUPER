import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Sale } from "../types";
import { demoSales } from "../lib/demoData";
import { isDemoRuntime, shouldUseRealtime } from "../lib/runtimeMode";

export function useMachineSales(machineId: string | null, hours = 24) {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!machineId) return;
    let cancelled = false;

    if (isDemoRuntime()) {
      const machineSales = demoSales.filter((sale) => sale.machine_id === machineId);
      setSales(machineSales as Sale[]);
      return;
    }

    (async () => {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("sales")
        .select("*")
        .eq("machine_id", machineId)
        .gte("sold_at", since)
        .order("sold_at");
      if (!cancelled && data) setSales(data as Sale[]);
    })();

    if (!shouldUseRealtime()) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(`sales-${machineId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales",
          filter: `machine_id=eq.${machineId}`,
        },
        (payload) => setSales((prev) => [...prev, payload.new as Sale])
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [machineId, hours]);

  return sales;
}
