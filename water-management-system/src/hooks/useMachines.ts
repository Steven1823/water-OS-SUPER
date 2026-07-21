import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import type { MachineToday } from "../types";

export function useMachines() {
  const [machines, setMachines] = useState<MachineToday[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_machine_today")
      .select("*")
      .order("name");
    if (!error && data) setMachines(data as MachineToday[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Live updates: any new reading, sale, or status change refreshes the list.
    const channel = supabase
      .channel("machines-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "readings" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "machines" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { machines, loading, refresh: load };
}
