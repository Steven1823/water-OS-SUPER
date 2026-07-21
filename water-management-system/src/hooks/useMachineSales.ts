import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Sale } from "../types";

export function useMachineSales(machineId: string | null, hours = 24) {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!machineId) return;
    let cancelled = false;

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
