import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { demoMachines } from "../lib/demoData";
import { isDemoRuntime, shouldUseRealtime } from "../lib/runtimeMode";

export interface MachineRecord {
  id: string;
  serial_number: string;
  name: string;
  address: string | null;
  status: string;
  tank_capacity_liters: number;
  last_seen_at: string | null;
  device_provisioned_at?: string | null;
}

export function useMachines() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemoRuntime()) {
      setMachines(demoMachines as MachineRecord[]);
      setError(null);
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from("machines")
      .select("id, serial_number, name, address, status, tank_capacity_liters, last_seen_at, device_provisioned_at")
      .order("name");

    if (loadError) {
      setError(loadError.message);
      setMachines([]);
      setLoading(false);
      return;
    }

    setMachines((data || []) as MachineRecord[]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    if (!shouldUseRealtime()) {
      return;
    }

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

  return { machines, loading, error, refresh: load };
}
